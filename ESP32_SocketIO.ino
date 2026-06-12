/*
   CLIMANEER V2 - ESP32 Socket.IO Client (using SocketIoClient library)
   ===================================================================
   Connects ESP32 sensors to the Climaneer server via Socket.IO over WebSocket.
   The server acts as a real-time hub: ESP32 pushes sensor data, the dashboard
   displays it, and commands flow back from dashboard -> server -> ESP32.

   REQUIRES Arduino libraries:
     - WebSockets by Markus Sattler (includes SocketIoClient)
     - ArduinoJson by Benoit Blanchon
     - DHT sensor library by Adafruit
     - DallasTemperature by Miles Burton + OneWire by Jim Studt

   DEPLOYMENT:
     Render (cloud): HOST="climaneer-v2.onrender.com", PORT=443, USE_SSL=true
     Local testing:  HOST="192.168.1.100" (your PC IP), PORT=3001, USE_SSL=false
*/

#include <Arduino.h>
#include <WiFi.h>
#include <SocketIoClient.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <OneWire.h>
#include <DallasTemperature.h>

// =============================================================================
// USER CONFIGURATION — edit these before uploading to your ESP32
// =============================================================================

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server address — for Render use "climaneer-v2.onrender.com", for local use your PC's LAN IP
const char* HOST = "YOUR_SERVER_HOST";
const int PORT = 443;             // 443 for Render (WSS), 3001 for local (WS)
const bool USE_SSL = true;        // true for Render, false for local

// Device identity — must be unique per ESP32
const char* DEVICE_ID = "climaneer-esp32-01";
const char* DEVICE_NAME = "Greenhouse ESP32";
const char* FIRMWARE_VERSION = "2.2.0";
const char* BOARD_TYPE = "ESP32 Dev Kit";

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
const unsigned long UPDATE_INTERVAL_MS = 2000;      // Send sensor data every 2s
const unsigned long HEARTBEAT_INTERVAL_MS = 15000;  // Heartbeat every 15s
const unsigned long REGISTER_RETRY_MS = 5000;       // Retry registration every 5s

// =============================================================================
// GLOBAL STATE
// =============================================================================

float lastGoodWaterTemp = NAN;
volatile unsigned long flowPulseCount = 0;
unsigned long lastFlowMeasureTime = 0;
unsigned long lastUpdateTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastRegisterAttempt = 0;
bool deviceRegistered = false;
bool pumpState = false;
bool manualOverride = false;
String currentMode = "AUTO";

// Hardware instances
DHT dht(DHT_PIN, DHT22);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
SocketIoClient socket;

// =============================================================================
// UTILITY FUNCTIONS
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
// FORWARD DECLARATIONS
// =============================================================================

void sendSensorUpdate();
void registerDevice();
void sendHeartbeat();
void sendStatusUpdate();

// =============================================================================
// SOCKET.IO EVENT HANDLERS
// =============================================================================

void onDeviceRegistered(const char* payload, size_t length) {
  deviceRegistered = true;
  Serial.println("[WS] Server confirmed registration");
}

void onCommand(const char* payload, size_t length) {
  // payload is the JSON data part of the event (after the event name)
  // e.g. {"id":"...","command":"pump","params":{"state":true}}
  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, payload);
  if (err) { Serial.println("[CMD] Bad JSON"); return; }

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
    Serial.println("[CMD] Sync requested — sending sensor data");
    sendSensorUpdate();
  } else if (cmd == "status_update") {
    sendStatusUpdate();
  }
}

void onHeartbeatAck(const char* payload, size_t length) {
  DynamicJsonDocument doc(256);
  DeserializationError err = deserializeJson(doc, payload);
  if (err) return;
  int pending = doc["pending_commands"] | 0;
  if (pending > 0) {
    Serial.printf("[WS] Heartbeat ACK — %d commands pending\n", pending);
  }
}

// =============================================================================
// SOCKET.IO MESSAGING
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
  socket.emit("sensor_update", json.c_str());

  bool aiDecision = aiPumpDecision(soil, level);
  bool finalPump = (currentMode == "MANUAL" && manualOverride) ? pumpState : aiDecision;
  digitalWrite(RELAY_PIN, finalPump ? LOW : HIGH);

  Serial.printf("Soil: %.1f%% | pH: %.2f | Temp: %.1fC | Pump: %s | Mode: %s\n",
    soil, ph, temp, finalPump ? "ON" : "OFF", currentMode.c_str());
}

void registerDevice() {
  if (deviceRegistered) return;

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["device_name"] = DEVICE_NAME;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["board_type"] = BOARD_TYPE;

  String json;
  serializeJson(doc, json);
  socket.emit("register", json.c_str());
  Serial.println("[WS] Registration sent");
}

void sendHeartbeat() {
  StaticJsonDocument<64> doc;
  doc["device_id"] = DEVICE_ID;

  String json;
  serializeJson(doc, json);
  socket.emit("heartbeat", json.c_str());
}

void sendStatusUpdate() {
  StaticJsonDocument<128> doc;
  doc["online"] = true;

  String json;
  serializeJson(doc, json);
  socket.emit("status_update", json.c_str());
  Serial.println("[CMD] Status update sent");
}

// =============================================================================
// SETUP
// =============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== CLIMANEER V2 - ESP32 ===");

  // GPIO
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, HIGH);

  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), []() { flowPulseCount++; }, RISING);

  // Sensors
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
    Serial.println(" FAILED — running offline (sensors + local AI only)");
  }

  // ---- Socket.IO setup using SocketIoClient library ----
  socket.on("device_registered", onDeviceRegistered);
  socket.on("command", onCommand);
  socket.on("heartbeat_ack", onHeartbeatAck);

  Serial.printf("Connecting to %s:%d\n", HOST, PORT);
  if (USE_SSL) {
    socket.beginSSL(HOST, PORT, "/socket.io/?EIO=4&transport=websocket");
  } else {
    socket.begin(HOST, PORT, "/socket.io/?EIO=4&transport=websocket");
  }

  Serial.println("[WS] SocketIoClient started");
}

// =============================================================================
// MAIN LOOP
// =============================================================================

void loop() {
  socket.loop();

  unsigned long now = millis();

  // Register device until confirmed (every 5s), then re-register every 5min
  if (now - lastRegisterAttempt >= (deviceRegistered ? 300000UL : REGISTER_RETRY_MS)) {
    lastRegisterAttempt = now;
    if (!deviceRegistered) registerDevice();
    else {
      // Periodic re-registration in case of reconnect
      StaticJsonDocument<256> doc;
      doc["device_id"] = DEVICE_ID;
      doc["device_name"] = DEVICE_NAME;
      doc["firmware_version"] = FIRMWARE_VERSION;
      doc["board_type"] = BOARD_TYPE;
      String json;
      serializeJson(doc, json);
      socket.emit("register", json.c_str());
    }
  }

  // Heartbeat (only after registered)
  if (deviceRegistered && now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = now;
    sendHeartbeat();
  }

  // Sensor update
  if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
    lastUpdateTime = now;
    sendSensorUpdate();
  }
}
