/*
   CLIMANEER V2 - ESP32 Socket.IO Client
   ======================================
   Replaces Firebase with Socket.IO via WebSocket.

   HOW THIS WORKS:
   Socket.IO uses Engine.IO which is a WebSocket protocol.
   "wsPath" = the Engine.IO handshake path so the server
   knows this is a Socket.IO WebSocket connection.

   wsPath = "/socket.io/?EIO=4&transport=websocket"
     - /socket.io/  = Socket.IO's default namespace
     - EIO=4        = Engine.IO protocol version 4
     - transport=websocket = we want raw WebSocket (no polling)

   In short: this is just how Socket.IO handshakes over WebSocket.
   You don't need to understand it — just set HOST and PORT.

   ======================================
   RENDER EXAMPLE:
   App URL: https://climaneer-server.onrender.com

   Set:
     HOST = "climaneer-server.onrender.com"
     PORT = 443
     USE_SSL = true   (Render requires HTTPS/WSS)

   LOCAL EXAMPLE:
   Set:
     HOST = "192.168.1.100"  (your server IP)
     PORT = 3001
     USE_SSL = false
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <OneWire.h>
#include <DallasTemperature.h>

// =================== YOU MUST EDIT THESE ===================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// For Render: "climaneer-server.onrender.com"
// For local: your computer's IP like "192.168.1.100"
const char* HOST = "YOUR_SERVER_HOST";

// For Render: 443   (WSS — WebSocket Secure)
// For local:  3001  (WS — plain WebSocket)
const int PORT = 443;

// For Render: true   (uses WSS/SSL)
// For local:  false  (uses plain WS)
const bool USE_SSL = true;

const char* DEVICE_ID = "climaneer-esp32-01";
const char* DEVICE_NAME = "Greenhouse ESP32";
const char* FIRMWARE_VERSION = "2.0.0";
const char* BOARD_TYPE = "ESP32 Dev Kit";
// ===========================================================

// Socket.IO Engine.IO handshake path — leave this as-is
const char* WS_PATH = "/socket.io/?EIO=4&transport=websocket";

// =================== HARDWARE PINS ===================
#define SOIL_PIN        34
#define PH_PIN          35
#define TRIG_PIN        23
#define ECHO_PIN        22
#define RELAY_PIN        5
#define DHT_PIN          4
#define ONE_WIRE_BUS    13
#define MQ135_PIN       32
#define FLOW_SENSOR_PIN 27

// =================== CALIBRATION ===================
const int ANALOG_MAX = 4095;
const float ADC_REF_V = 3.3f;
const int SOIL_WET_RAW = 1800, SOIL_DRY_RAW = 3700;
const float PH_SLOPE = -5.6548f, PH_INTERCEPT = 21.839f;
const float tankHeightCM = 20.0f, MIN_WATER_LEVEL_CM = 5.0f;
const float DRY_SOIL_THRESHOLD = 50.0f, MOIST_SOIL_THRESHOLD = 70.0f;
const float PULSES_PER_LITER = 400000.0f, MAX_FLOW_LPM = 1.0f, MAX_AQI = 500.0f;

const unsigned long UPDATE_INTERVAL_MS = 2000;
const unsigned long HEARTBEAT_INTERVAL_MS = 15000;

// =================== STATE ===================
float lastGoodWaterTemp = NAN;
volatile unsigned long flowPulseCount = 0;
unsigned long lastFlowMeasureTime = 0;
unsigned long lastUpdateTime = 0;
unsigned long lastHeartbeatTime = 0;
bool wsConnected = false;
bool pumpState = false;
bool manualOverride = false;
String currentMode = "AUTO";

DHT dht(DHT_PIN, DHT22);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
WebSocketsClient webSocket;

// =================== HELPERS ===================
float fmap_safe(float x, float in_min, float in_max, float out_min, float out_max) {
  if (in_max - in_min == 0.0f) return out_min;
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
float clampf(float v, float lo, float hi) {
  return (v < lo) ? lo : (v > hi) ? hi : v;
}

// =================== SENSORS ===================
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
  float levelCM = tankHeightCM - dist;
  if (levelCM < 0) levelCM = 0;
  return clampf((levelCM / tankHeightCM) * 100, 0, 100);
}
float readPH() {
  int raw = analogRead(PH_PIN);
  float v = ((float)raw * ADC_REF_V) / ANALOG_MAX;
  return clampf(PH_SLOPE * v + PH_INTERCEPT, 6.5f, 7.5f);
}
float readAirTemp() { float t = dht.readTemperature(); return isnan(t) ? -127.0f : t; }
float readAirHumidity() { float h = dht.readHumidity(); return isnan(h) ? -1.0f : h; }
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

// =================== LOCAL AI FALLBACK ===================
bool aiPumpDecision(float soil, float level) {
  if (level < (MIN_WATER_LEVEL_CM / tankHeightCM) * 100) return false;
  if (soil < DRY_SOIL_THRESHOLD) return true;
  return false;
}

// =================== SOCKET.IO MESSAGING ===================
/*
   Socket.IO uses Engine.IO framing over WebSocket:

   Raw WebSocket messages:
     "40"          = Socket.IO CONNECT (open session)
     "42[...]"     = Socket.IO EVENT
     "3"           = Engine.IO PING
     "4"           = Engine.IO PONG
     "41"          = Socket.IO DISCONNECT

   For events, the "42" prefix is followed by a JSON array:
     ["event_name", {data}]

   Example:
     "42[\"sensor_update\",{\"soil_moisture\":65.4}]"

   webSocket.sendTXT() sends raw WebSocket text frames.
   We just prepend "42" to our JSON for events.
*/

void sendEvent(const char* event, JsonDocument& doc) {
  if (!wsConnected) return;
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT("42[\"" + String(event) + "\"," + json + "]");
}

void registerDevice() {
  DynamicJsonDocument doc(256);
  doc["device_id"] = DEVICE_ID;
  doc["device_name"] = DEVICE_NAME;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["board_type"] = BOARD_TYPE;
  sendEvent("register", doc);
  Serial.println("[WS] Registration sent");
}

void sendSensorUpdate() {
  float soil = readSoilMoisture();
  float ph = readPH();
  float hum = readAirHumidity();
  float temp = readAirTemp();
  float wtemp = readWaterTemp();
  float level = readWaterLevel();
  float aqi = readAirQuality();
  float flow = readFlow();

  DynamicJsonDocument doc(512);
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
  sendEvent("sensor_update", doc);

  // AI pump decision
  bool aiDecision = aiPumpDecision(soil, level);
  bool finalPump = (currentMode == "MANUAL" && manualOverride) ? pumpState : aiDecision;
  digitalWrite(RELAY_PIN, finalPump ? LOW : HIGH);

  Serial.printf("Soil: %.1f%% | pH: %.2f | Temp: %.1fC | Pump: %s | Mode: %s\n",
    soil, ph, temp, finalPump ? "ON" : "OFF", currentMode.c_str());
}

// =================== WEB SOCKET EVENT HANDLER ===================
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("[WS] Disconnected");
      break;

    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("[WS] Connected! Sending Socket.IO handshake...");
      webSocket.sendTXT("40");  // Engine.IO CONNECT
      break;

    case WStype_TEXT: {
      String msg = String((char*)payload);

      // Engine.IO PING -> send PONG
      if (msg == "2") {
        webSocket.sendTXT("3");
        return;
      }

      // Socket.IO CONNECT response (starts with "40")
      if (msg.startsWith("40")) {
        Serial.println("[WS] Socket.IO session opened. Registering...");
        registerDevice();
        return;
      }

      // Socket.IO EVENT (starts with "42")
      if (msg.startsWith("42")) {
        String data = msg.substring(2);
        DynamicJsonDocument doc(1024);
        DeserializationError err = deserializeJson(doc, data);
        if (err) { Serial.println("[WS] Bad JSON"); return; }

        String event = doc[0].as<String>();

        if (event == "command") {
          String cmd = doc[1]["command"].as<String>();
          JsonObject params = doc[1]["params"].as<JsonObject>();
          Serial.printf("[CMD] %s\n", cmd.c_str());

          if (cmd == "pump") {
            pumpState = params["state"] | false;
            digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
          } else if (cmd == "mode") {
            currentMode = params["mode"].as<String>();
          } else if (cmd == "restart") {
            ESP.restart();
          } else if (cmd == "sync") {
            sendSensorUpdate();
          }
        } else if (event == "device_registered") {
          Serial.println("[WS] Server confirmed registration");
        }
      }
      break;
    }

    default:
      break;
  }
}

// =================== SETUP ===================
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== CLIMANEER V2 - ESP32 ===");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, HIGH); // pump OFF

  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), []() { flowPulseCount++; }, RISING);

  dht.begin();
  ds18b20.begin();
  lastFlowMeasureTime = millis();

  // WiFi
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
    Serial.println(" FAILED — running offline");
  }

  // WebSocket — the WS_PATH is how Socket.IO identifies WebSocket clients
  Serial.printf("Connecting to %s:%d%s\n", HOST, PORT, WS_PATH);
  if (USE_SSL) {
    webSocket.beginSSL(HOST, PORT, WS_PATH);
  } else {
    webSocket.begin(HOST, PORT, WS_PATH);
  }
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
  webSocket.enableHeartbeat(15000, 3000, 3);
}

// =================== LOOP ===================
void loop() {
  webSocket.loop();

  unsigned long now = millis();

  // Heartbeat — tells server we're alive
  if (wsConnected && now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = now;
    DynamicJsonDocument doc(64);
    doc["device_id"] = DEVICE_ID;
    sendEvent("heartbeat", doc);
  }

  // Sensor update every 2 seconds
  if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
    lastUpdateTime = now;
    sendSensorUpdate();
  }
}
