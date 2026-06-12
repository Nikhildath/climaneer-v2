/*
   CLIMANEER V2 - ESP32 Raw WebSocket Client
   ==========================================
   Connects ESP32 to the Climaneer server via plain WebSocket (no Socket.IO).
   Uses the battle-tested WebSocketsClient library for reliable connections.

   Server endpoint: /esp32 (WebSocket, JSON messages)

   DEPLOYMENT:
     Render:  HOST="climaneer-v2.onrender.com", PORT=443, USE_SSL=true
     Local:   HOST="192.168.1.100", PORT=3001, USE_SSL=false
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <OneWire.h>
#include <DallasTemperature.h>

// =============================================================================
// USER CONFIGURATION
// =============================================================================

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* HOST = "YOUR_SERVER_HOST";
const int PORT = 443;
const bool USE_SSL = true;

const char* DEVICE_ID = "climaneer-esp32-01";
const char* DEVICE_NAME = "Greenhouse ESP32";
const char* FIRMWARE_VERSION = "3.0.0";
const char* BOARD_TYPE = "ESP32 Dev Kit";

// =============================================================================
// HARDWARE PIN MAPPING
// =============================================================================

#define SOIL_PIN        34
#define PH_PIN          35
#define TRIG_PIN        23
#define ECHO_PIN        22
#define RELAY_PIN        5
#define DHT_PIN          4
#define ONE_WIRE_BUS    13
#define MQ135_PIN       32
#define FLOW_SENSOR_PIN 27

// =============================================================================
// CALIBRATION CONSTANTS
// =============================================================================

const int ANALOG_MAX = 4095;
const float ADC_REF_V = 3.3f;
const int SOIL_WET_RAW = 1800, SOIL_DRY_RAW = 3700;
const float PH_SLOPE = -5.6548f, PH_INTERCEPT = 21.839f;
const float TANK_HEIGHT_CM = 20.0f, MIN_WATER_LEVEL_CM = 5.0f;
const float DRY_SOIL_THRESHOLD = 50.0f;
const float PULSES_PER_LITER = 400000.0f, MAX_FLOW_LPM = 1.0f, MAX_AQI = 500.0f;

const unsigned long UPDATE_INTERVAL_MS = 2000;
const unsigned long HEARTBEAT_INTERVAL_MS = 15000;
const unsigned long RECONNECT_INTERVAL_MS = 3000;

// =============================================================================
// GLOBAL STATE
// =============================================================================

float lastGoodWaterTemp = NAN;
volatile unsigned long flowPulseCount = 0;
unsigned long lastFlowMeasureTime = 0;
unsigned long lastUpdateTime = 0;
unsigned long lastHeartbeatTime = 0;
bool pumpState = false;
bool manualOverride = false;
String currentMode = "AUTO";
bool deviceRegistered = false;

DHT dht(DHT_PIN, DHT22);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
WebSocketsClient webSocket;

// =============================================================================
// UTILITY
// =============================================================================

float fmap_safe(float x, float in_min, float in_max, float out_min, float out_max) {
  if (in_max - in_min == 0.0f) return out_min;
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

float clampf(float v, float lo, float hi) {
  return (v < lo) ? lo : (v > hi) ? hi : v;
}

// =============================================================================
// SENSOR READINGS
// =============================================================================

float readSoilMoisture() {
  int raw = analogRead(SOIL_PIN);
  return clampf(fmap_safe(raw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100), 0, 100);
}

float readWaterLevel() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  float dist = duration * 0.0343f / 2.0f;
  float levelCM = TANK_HEIGHT_CM - dist;
  if (levelCM < 0) levelCM = 0;
  return clampf((levelCM / TANK_HEIGHT_CM) * 100, 0, 100);
}

float readPH() {
  int raw = analogRead(PH_PIN);
  float v = ((float)raw * ADC_REF_V) / ANALOG_MAX;
  return clampf(PH_SLOPE * v + PH_INTERCEPT, 6.5f, 7.5f);
}

float readAirTemp() {
  float t = dht.readTemperature();
  return isnan(t) ? -127.0f : t;
}

float readAirHumidity() {
  float h = dht.readHumidity();
  return isnan(h) ? -1.0f : h;
}

float readWaterTemp() {
  ds18b20.requestTemperatures();
  float t = ds18b20.getTempCByIndex(0);
  if (isnan(t)) return lastGoodWaterTemp;
  lastGoodWaterTemp = t;
  return t;
}

float readAirQuality() {
  int raw = analogRead(MQ135_PIN);
  return clampf(map(raw, 0, ANALOG_MAX, 0, (int)MAX_AQI), 0, MAX_AQI);
}

float readFlow() {
  unsigned long now = millis();
  unsigned long pulses = flowPulseCount;
  flowPulseCount = 0;
  unsigned long dt = now - lastFlowMeasureTime;
  lastFlowMeasureTime = now;
  if (dt == 0) return 0.0f;
  float lpm = (pulses / PULSES_PER_LITER) * (60000.0f / dt);
  return clampf(fmap_safe(lpm, 0, MAX_FLOW_LPM, 0, 100), 0, 100);
}

// =============================================================================
// LOCAL AI FALLBACK
// =============================================================================

bool aiPumpDecision(float soil, float level) {
  if (level < (MIN_WATER_LEVEL_CM / TANK_HEIGHT_CM) * 100) return false;
  if (soil < DRY_SOIL_THRESHOLD) return true;
  return false;
}

// =============================================================================
// WEB SOCKET EVENT HANDLER
// =============================================================================

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      deviceRegistered = false;
      Serial.println("[WS] Disconnected");
      break;

    case WStype_CONNECTED:
      Serial.println("[WS] Connected! Registering...");
      {
        StaticJsonDocument<256> doc;
        doc["type"] = "register";
        doc["device_id"] = DEVICE_ID;
        doc["device_name"] = DEVICE_NAME;
        doc["firmware_version"] = FIRMWARE_VERSION;
        doc["board_type"] = BOARD_TYPE;
        String json;
        serializeJson(doc, json);
        webSocket.sendTXT(json);
      }
      break;

    case WStype_TEXT: {
      DynamicJsonDocument doc(1024);
      DeserializationError err = deserializeJson(doc, (char*)payload);
      if (err) { Serial.println("[WS] Bad JSON"); return; }

      String type = doc["type"].as<String>();

      if (type == "device_registered") {
        deviceRegistered = true;
        Serial.println("[WS] Server confirmed registration");

      } else if (type == "command") {
        String cmd = doc["command"].as<String>();
        String cmdId = doc["id"].as<String>();
        JsonObject params = doc["params"].as<JsonObject>();
        Serial.printf("[CMD] %s (id=%s)\n", cmd.c_str(), cmdId.c_str());

        if (cmd == "pump") {
          pumpState = params["state"] | false;
          digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
          manualOverride = true;
          Serial.printf("[CMD] Pump -> %s\n", pumpState ? "ON" : "OFF");

        } else if (cmd == "mode") {
          currentMode = params["mode"].as<String>();
          if (currentMode == "AUTO") manualOverride = false;
          Serial.printf("[CMD] Mode -> %s\n", currentMode.c_str());

        } else if (cmd == "restart") {
          Serial.println("[CMD] Restarting...");
          delay(100);
          ESP.restart();

        } else if (cmd == "sync") {
          Serial.println("[CMD] Sync requested");
          // Will be picked up by the next sensor update cycle
        }
      } else if (type == "heartbeat_ack") {
        int pending = doc["pending_commands"] | 0;
        if (pending > 0) {
          Serial.printf("[WS] Heartbeat ACK — %d commands pending\n", pending);
        }
      }
      break;
    }

    default:
      break;
  }
}

// =============================================================================
// SEND HELPERS
// =============================================================================

void sendSensorUpdate() {
  float soil = readSoilMoisture();
  float ph = readPH();
  float hum = readAirHumidity();
  float temp = readAirTemp();
  float wtemp = readWaterTemp();
  float level = readWaterLevel();
  float aqi = readAirQuality();
  float flow = readFlow();

  StaticJsonDocument<512> doc;
  doc["type"] = "sensor_update";
  doc["device_id"] = DEVICE_ID;
  doc["sensors"]["soil_moisture"] = soil;
  doc["sensors"]["ph"] = ph;
  doc["sensors"]["air_humidity"] = hum;
  doc["sensors"]["air_temp"] = temp;
  doc["sensors"]["water_temp"] = wtemp;
  doc["sensors"]["water_level"] = level;
  doc["sensors"]["air_quality"] = aqi;
  doc["sensors"]["flow"] = flow;
  doc["sensors"]["battery"] = 90.0;

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(json);

  bool aiDecision = aiPumpDecision(soil, level);
  bool finalPump = (currentMode == "MANUAL" && manualOverride) ? pumpState : aiDecision;
  digitalWrite(RELAY_PIN, finalPump ? LOW : HIGH);

  Serial.printf("Soil: %.1f%% | pH: %.2f | Temp: %.1fC | Pump: %s | Mode: %s\n",
    soil, ph, temp, finalPump ? "ON" : "OFF", currentMode.c_str());
}

void sendHeartbeat() {
  StaticJsonDocument<64> doc;
  doc["type"] = "heartbeat";
  doc["device_id"] = DEVICE_ID;

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(json);
}

// =============================================================================
// SETUP
// =============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== CLIMANEER V2 - ESP32 ===");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, HIGH);

  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), []() { flowPulseCount++; }, RISING);

  dht.begin();
  ds18b20.begin();
  lastFlowMeasureTime = millis();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 50) {
    delay(500); Serial.print("."); attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" CONNECTED");
    Serial.print("IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println(" FAILED");
  }

  // Connect to the raw WebSocket endpoint (no Socket.IO)
  Serial.printf("Connecting to %s:%d/esp32\n", HOST, PORT);
  webSocket.setReconnectInterval(RECONNECT_INTERVAL_MS);
  if (USE_SSL) {
    webSocket.beginSSL(HOST, PORT, "/esp32");
  } else {
    webSocket.begin(HOST, PORT, "/esp32");
  }
  webSocket.onEvent(webSocketEvent);
}

// =============================================================================
// MAIN LOOP
// =============================================================================

void loop() {
  webSocket.loop();

  unsigned long now = millis();

  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = now;
    sendHeartbeat();
  }

  if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
    lastUpdateTime = now;
    sendSensorUpdate();
  }
}
