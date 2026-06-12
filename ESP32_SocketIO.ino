/*
   CLIMANEER V2 - ESP32 Socket.IO Client
   ======================================
   Connects ESP32 sensors to the Climaneer server via Socket.IO over WebSocket.
   The server acts as a real-time hub: ESP32 pushes sensor data, the dashboard
   displays it, and commands flow back from dashboard -> server -> ESP32.

   ┌──────────┐   sensor_update    ┌──────────┐   sensor_update   ┌───────────┐
   │  ESP32   │ ──────────────────▶│  Server  │ ──────────────────▶│ Dashboard │
   │ (device) │                    │ (hub)    │                    │  (Next.js)│
   │          │◀───────────────────│          │◀───────────────────│           │
   └──────────┘    command,etc     └──────────┘  command,rename    └───────────┘

   Socket.IO handshake over raw WebSocket:
     wsPath = "/socket.io/?EIO=4&transport=websocket"
     - /socket.io/  = Socket.IO's default namespace
     - EIO=4        = Engine.IO protocol version 4
     - transport=websocket = skip HTTP polling, use WebSocket directly

   Engine.IO wire protocol (raw WebSocket text frames):
     "40"         = Socket.IO CONNECT (open session)
     "42[...]"    = Socket.IO EVENT
     "2"          = Engine.IO PING  (server -> client)
     "3"          = Engine.IO PONG  (client -> server)
     "41"         = Socket.IO DISCONNECT

   EVENT messages have a "42" prefix followed by a JSON array:
     ["event_name", {data}]
   Example: 42["sensor_update",{"device_id":"esp32-01","sensors":{...}}]

   DEPLOYMENT:
     Render (cloud): HOST="climaneer-server.onrender.com", PORT=443, USE_SSL=true
     Local testing:  HOST="192.168.1.100" (your PC IP), PORT=3001, USE_SSL=false
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <OneWire.h>
#include <DallasTemperature.h>

// =============================================================================
// USER CONFIGURATION — edit these before uploading to your ESP32
// =============================================================================

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server address — for Render use "climaneer-server.onrender.com", for local use your PC's LAN IP
const char* HOST = "YOUR_SERVER_HOST";
const int PORT = 443;             // 443 for Render (WSS), 3001 for local (WS)
const bool USE_SSL = true;        // true for Render, false for local

// Device identity — must be unique per ESP32
const char* DEVICE_ID = "climaneer-esp32-01";
const char* DEVICE_NAME = "Greenhouse ESP32";
const char* FIRMWARE_VERSION = "2.1.0";
const char* BOARD_TYPE = "ESP32 Dev Kit";

// =============================================================================
// SOCKET.IO ENGINE.IO HANDSHAKE PATH — leave as-is
// =============================================================================

const char* WS_PATH = "/socket.io/?EIO=4&transport=websocket";

// =============================================================================
// HARDWARE PIN MAPPING
// =============================================================================

#define SOIL_PIN        34    // Soil moisture sensor (analog)
#define PH_PIN          35    // pH sensor (analog)
#define TRIG_PIN        23    // Ultrasonic trigger
#define ECHO_PIN        22    // Ultrasonic echo
#define RELAY_PIN        5    // Pump relay (LOW = ON, HIGH = OFF)
#define DHT_PIN          4    // DHT22 air temp/humidity
#define ONE_WIRE_BUS    13    // DS18B20 water temp (OneWire)
#define MQ135_PIN       32    // Air quality sensor (analog)
#define FLOW_SENSOR_PIN 27    // Flow meter (pulse input)

// =============================================================================
// CALIBRATION CONSTANTS
// =============================================================================

const int ANALOG_MAX = 4095;            // ESP32 ADC is 12-bit
const float ADC_REF_V = 3.3f;           // ADC reference voltage

// Soil moisture — raw ADC values at wet and dry extremes
const int SOIL_WET_RAW = 1800, SOIL_DRY_RAW = 3700;

// pH sensor — linear calibration: pH = SLOPE * voltage + INTERCEPT
const float PH_SLOPE = -5.6548f, PH_INTERCEPT = 21.839f;

// Water level — ultrasonic sensor maps distance to tank percentage
const float TANK_HEIGHT_CM = 20.0f, MIN_WATER_LEVEL_CM = 5.0f;

// Local AI pump decision thresholds (fallback when server is unreachable)
const float DRY_SOIL_THRESHOLD = 50.0f, MOIST_SOIL_THRESHOLD = 70.0f;

// Flow meter — pulses per liter (YF-S201 typical: 450), flow range mapping
const float PULSES_PER_LITER = 400000.0f, MAX_FLOW_LPM = 1.0f, MAX_AQI = 500.0f;

// Timing
const unsigned long UPDATE_INTERVAL_MS = 2000;     // Send sensor data every 2s
const unsigned long HEARTBEAT_INTERVAL_MS = 15000; // Heartbeat every 15s

// =============================================================================
// GLOBAL STATE
// =============================================================================

float lastGoodWaterTemp = NAN;        // Persist last valid DS18B20 reading
volatile unsigned long flowPulseCount = 0;  // Incremented by ISR on each pulse
unsigned long lastFlowMeasureTime = 0;
unsigned long lastUpdateTime = 0;
unsigned long lastHeartbeatTime = 0;
bool wsConnected = false;             // WebSocket link status
bool pumpState = false;               // Current pump relay state
bool manualOverride = false;          // True when dashboard has taken manual control
String currentMode = "AUTO";          // AUTO or MANUAL

// Hardware object instances
DHT dht(DHT_PIN, DHT22);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
WebSocketsClient webSocket;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// fmap_safe: map a value from one range to another, guard against div-by-zero
float fmap_safe(float x, float in_min, float in_max, float out_min, float out_max) {
  if (in_max - in_min == 0.0f) return out_min;
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// clampf: clamp a value between lo and hi
float clampf(float v, float lo, float hi) {
  return (v < lo) ? lo : (v > hi) ? hi : v;
}

// =============================================================================
// SENSOR READINGS — each function reads a specific sensor and returns a float
// =============================================================================

// Soil moisture as percentage (0 = dry, 100 = wet)
float readSoilMoisture() {
  int raw = analogRead(SOIL_PIN);
  return clampf(fmap_safe(raw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100), 0, 100);
}

// Water level as percentage of tank height using ultrasonic HC-SR04
float readWaterLevel() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  float dist = duration * 0.0343f / 2.0f;       // Convert µs to cm
  float levelCM = TANK_HEIGHT_CM - dist;
  if (levelCM < 0) levelCM = 0;
  return clampf((levelCM / TANK_HEIGHT_CM) * 100, 0, 100);
}

// pH value from analog pH sensor
float readPH() {
  int raw = analogRead(PH_PIN);
  float v = ((float)raw * ADC_REF_V) / ANALOG_MAX;
  return clampf(PH_SLOPE * v + PH_INTERCEPT, 6.5f, 7.5f);
}

// Air temperature (°C) from DHT22
float readAirTemp() {
  float t = dht.readTemperature();
  return isnan(t) ? -127.0f : t;   // -127 signals "sensor error"
}

// Relative humidity (%) from DHT22
float readAirHumidity() {
  float h = dht.readHumidity();
  return isnan(h) ? -1.0f : h;     // -1 signals "sensor error"
}

// Water temperature (°C) from DS18B20 (OneWire)
float readWaterTemp() {
  ds18b20.requestTemperatures();
  float t = ds18b20.getTempCByIndex(0);
  if (isnan(t)) return lastGoodWaterTemp;  // Hold last valid reading on error
  lastGoodWaterTemp = t;
  return t;
}

// Air quality index from MQ135 (0 = clean, 500 = very polluted)
float readAirQuality() {
  int raw = analogRead(MQ135_PIN);
  return clampf(map(raw, 0, ANALOG_MAX, 0, (int)MAX_AQI), 0, MAX_AQI);
}

// Water flow rate (L/min) from pulse flow meter via interrupt counter
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
// LOCAL AI FALLBACK — simple rule-based pump decision when server unreachable
// =============================================================================

bool aiPumpDecision(float soil, float level) {
  if (level < (MIN_WATER_LEVEL_CM / TANK_HEIGHT_CM) * 100) return false; // Low water — protect pump
  if (soil < DRY_SOIL_THRESHOLD) return true;   // Soil dry — turn on
  return false;                                 // Soil moist enough — stay off
}

// =============================================================================
// SOCKET.IO MESSAGING — raw Engine.IO framing helpers
// =============================================================================

// sendEvent: serialize a JsonDocument and send it as a Socket.IO EVENT ("42" prefix)
void sendEvent(const char* event, JsonDocument& doc) {
  if (!wsConnected) return;
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT("42[\"" + String(event) + "\"," + json + "]");
}

// Register this device with the server (sent after Socket.IO CONNECT)
void registerDevice() {
  DynamicJsonDocument doc(256);
  doc["device_id"] = DEVICE_ID;
  doc["device_name"] = DEVICE_NAME;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["board_type"] = BOARD_TYPE;
  sendEvent("register", doc);
  Serial.println("[WS] Registration sent");
}

// Read all sensors and send a sensor_update event to the server
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
  doc["sensors"]["battery"] = 90.0;               // Placeholder — add battery monitor if wired
  sendEvent("sensor_update", doc);

  // Local pump decision — applies when server is unreachable or in AUTO mode
  bool aiDecision = aiPumpDecision(soil, level);
  bool finalPump = (currentMode == "MANUAL" && manualOverride) ? pumpState : aiDecision;
  digitalWrite(RELAY_PIN, finalPump ? LOW : HIGH);  // Relay is active-LOW

  Serial.printf("Soil: %.1f%% | pH: %.2f | Temp: %.1fC | Pump: %s | Mode: %s\n",
    soil, ph, temp, finalPump ? "ON" : "OFF", currentMode.c_str());
}

// =============================================================================
// WEB SOCKET EVENT HANDLER
// Called by the WebSocketsClient library on connection state changes and messages
// =============================================================================

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("[WS] Disconnected");
      break;

    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("[WS] Connected! Sending Socket.IO handshake...");
      webSocket.sendTXT("40");                     // Engine.IO CONNECT packet
      break;

    case WStype_TEXT: {
      String msg = String((char*)payload);

      // ── Engine.IO PING (server heartbeat) → respond with PONG ──────────
      if (msg == "2") {
        webSocket.sendTXT("3");                    // Engine.IO PONG
        return;
      }

      // ── Socket.IO CONNECT acknowledgment ──────────────────────────────
      if (msg.startsWith("40")) {
        Serial.println("[WS] Socket.IO session opened. Registering...");
        registerDevice();
        return;
      }

      // ── Socket.IO EVENT (prefix "42") ─────────────────────────────────
      if (msg.startsWith("42")) {
        String data = msg.substring(2);
        DynamicJsonDocument doc(1024);
        DeserializationError err = deserializeJson(doc, data);
        if (err) { Serial.println("[WS] Bad JSON"); return; }

        String event = doc[0].as<String>();        // Event name (e.g. "command", "device_registered", "heartbeat_ack")

        // Command from dashboard/server: {command, params}
        // The server relays dashboard commands as Socket.IO "command" events:
        //   ["command", {id: "...", command: "pump", params: {state: true}}]
        if (event == "command") {
          String cmd = doc[1]["command"].as<String>();
          JsonObject params = doc[1]["params"].as<JsonObject>();
          String cmdId = doc[1]["id"].as<String>();
          Serial.printf("[CMD] %s (id=%s)\n", cmd.c_str(), cmdId.c_str());

          if (cmd == "pump") {
            // Toggle pump relay — LOW = ON (relay is active-low)
            pumpState = params["state"] | false;
            digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
            manualOverride = true;                  // Dashboard took manual control
            Serial.printf("[CMD] Pump → %s\n", pumpState ? "ON" : "OFF");

          } else if (cmd == "mode") {
            // Switch between AUTO (AI-driven) and MANUAL modes
            currentMode = params["mode"].as<String>();
            if (currentMode == "AUTO") manualOverride = false;
            Serial.printf("[CMD] Mode → %s\n", currentMode.c_str());

          } else if (cmd == "restart") {
            // Remote reboot — for OTA recovery or reset
            Serial.println("[CMD] Restarting...");
            delay(100);
            ESP.restart();

          } else if (cmd == "sync") {
            // Dashboard requests an immediate sensor reading
            Serial.println("[CMD] Sync requested — sending sensor data");
            sendSensorUpdate();

          } else if (cmd == "status_update") {
            // Dashboard toggles this device online/offline in the database
            // (The ESP32 itself does not go offline; this updates the server's
            // persisted state for UI purposes.)
            DynamicJsonDocument statusDoc(128);
            statusDoc["online"] = true;
            sendEvent("status_update", statusDoc);
            Serial.println("[CMD] Status update sent");
          }

        } else if (event == "device_registered") {
          // Server confirmed our registration
          Serial.println("[WS] Server confirmed registration");

        } else if (event == "heartbeat_ack") {
          // Server responded to our heartbeat — link is healthy
          // payload contains server_time and pending_commands count
          int pending = doc[1]["pending_commands"] | 0;
          if (pending > 0) {
            Serial.printf("[WS] Heartbeat ACK — %d commands pending\n", pending);
          }
        }
      }
      break;
    }

    default:
      break;
  }
}

// =============================================================================
// SETUP — runs once on boot
// =============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== CLIMANEER V2 - ESP32 ===");

  // ── GPIO ──────────────────────────────────────────────────────────────
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, HIGH);                     // Pump OFF (active-low relay)

  // Flow meter pulse counter interrupt — fires on every RISING edge
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), []() { flowPulseCount++; }, RISING);

  // ── Sensors ───────────────────────────────────────────────────────────
  dht.begin();
  ds18b20.begin();
  lastFlowMeasureTime = millis();

  // ── WiFi ──────────────────────────────────────────────────────────────
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
    Serial.println(" FAILED — running offline (sensors + local AI only)");
  }

  // ── WebSocket ─────────────────────────────────────────────────────────
  Serial.printf("Connecting to %s:%d%s\n", HOST, PORT, WS_PATH);
  if (USE_SSL) {
    webSocket.beginSSL(HOST, PORT, WS_PATH);
  } else {
    webSocket.begin(HOST, PORT, WS_PATH);
  }
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);              // Retry every 3s on disconnect
  webSocket.enableHeartbeat(15000, 3000, 3);         // Library-level keepalive
}

// =============================================================================
// MAIN LOOP — runs repeatedly
// =============================================================================

void loop() {
  webSocket.loop();                                  // Process WebSocket events

  unsigned long now = millis();

  // ── Heartbeat: tell server we're alive ────────────────────────────────
  if (wsConnected && now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = now;
    DynamicJsonDocument doc(64);
    doc["device_id"] = DEVICE_ID;
    sendEvent("heartbeat", doc);
  }

  // ── Sensor update: read sensors and push to server ────────────────────
  if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
    lastUpdateTime = now;
    sendSensorUpdate();
  }
}
