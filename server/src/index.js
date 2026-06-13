import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import config from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { PORT, CORS_ORIGIN, WS_PING_INTERVAL, WS_PING_TIMEOUT, DATA_RETENTION_DAYS } = config;

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// Firebase-like Realtime JSON Tree
// =============================================================================

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const TREE_PATH = path.join(DATA_DIR, "realtimedb.json");
let dbTree = {};

function loadTree() {
  try {
    if (fs.existsSync(TREE_PATH)) {
      dbTree = JSON.parse(fs.readFileSync(TREE_PATH, "utf8"));
      console.log("[Tree] Loaded realtime database from disk");
    }
  } catch (err) {
    console.error("[Tree] Failed to load:", err.message);
    dbTree = {};
  }
}

function saveTree() {
  try {
    fs.writeFileSync(TREE_PATH, JSON.stringify(dbTree, null, 2));
  } catch (err) {
    console.error("[Tree] Save error:", err.message);
  }
}

function setAtPath(path, value) {
  const keys = path.split("/").filter(Boolean);
  let current = dbTree;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  if (value === null || value === undefined) {
    delete current[keys[keys.length - 1]];
  } else {
    current[keys[keys.length - 1]] = value;
  }
  saveTree();
}

function getAtPath(path) {
  const keys = path.split("/").filter(Boolean);
  let current = dbTree;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

function removeAtPath(path) {
  setAtPath(path, null);
}

// =============================================================================
// WebSocket Server — Single unified protocol for ESP32 + Dashboard
// =============================================================================

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
const esp32Connections = new Map();
const dashboardConnections = new Set();

function broadcastToDashboard(data) {
  const msg = JSON.stringify(data);
  for (const ws of dashboardConnections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function sendToESP32(deviceId, data) {
  const ws = esp32Connections.get(deviceId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

async function start() {
  const { initializeDatabase, getAllDevices, getSensorHistory, cleanupOldData,
    registerDevice, getDevice, setDeviceOffline, updateDeviceLastSeen,
    storeSensorReading, upsertControls, getControls, storeAIRecommendation, getLatestAI,
    addCommand, getPendingCommands, addEvent, getCommandHistory, getDeviceStatusHistory,
    updateDeviceName, deleteDevice } = await import("./database.js");
  const { generateRecommendation, shouldPumpRun } = await import("./ai.js");

  await initializeDatabase();
  loadTree();

  wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress;
    let role = null;
    let deviceId = null;

    const sendJSON = (data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    };

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // ── ESP32 Registration ──────────────────────────────
      if (msg.type === "register" && msg.device_id) {
        role = "esp32";
        const d = registerDevice({
          device_id: msg.device_id,
          device_name: msg.device_name || "ESP32",
          firmware_version: msg.firmware_version || "1.0.0",
          board_type: msg.board_type || "ESP32",
        });
        deviceId = d.device_id;
        esp32Connections.set(deviceId, ws);

        // Create/update JSON tree for this device
        setAtPath(`devices/${deviceId}/info`, {
          device_id: deviceId,
          device_name: msg.device_name || "ESP32",
          firmware_version: msg.firmware_version || "1.0.0",
          board_type: msg.board_type || "ESP32",
          connected: true,
          last_seen: new Date().toISOString(),
        });

        console.log(`[ESP32] Registered: ${deviceId}`);
        sendJSON({ type: "device_registered", device_id: deviceId, success: true });

        // Send pending commands
        const pending = getPendingCommands(deviceId);
        for (const cmd of pending) {
          sendJSON({ type: "command", id: cmd.id, command: cmd.command, params: JSON.parse(cmd.params || "{}") });
        }

        // Notify dashboards
        broadcastToDashboard({
          type: "device_list",
          devices: getAllDevices(),
        });
        return;
      }

      // ── Dashboard Registration ──────────────────────────
      if (msg.type === "register_dashboard") {
        role = "dashboard";
        dashboardConnections.add(ws);
        console.log(`[Dashboard] Client connected (${dashboardConnections.size} total)`);

        // Send full device list
        sendJSON({ type: "device_list", devices: getAllDevices() });

        // Send current status + sensor data of all devices
        const allDevices = getAllDevices();
        for (const device of allDevices) {
          const d = getDevice(device.device_id);
          const isOnline = esp32Connections.has(device.device_id);
          sendJSON({
            type: "device_status",
            device_id: device.device_id,
            device_name: d?.device_name || device.device_name,
            online: isOnline,
            last_seen: d?.last_seen || null,
          });

          // Send current sensor data from Firebase tree
          const treeSensors = getAtPath(`devices/${device.device_id}/sensors`);
          const overrides = getAtPath(`devices/${device.device_id}/overrides`) || {};
          if (treeSensors && Object.keys(treeSensors).length > 0) {
            const effectiveSensors = { ...treeSensors };
            let hasOverride = false;
            for (const [key, ov] of Object.entries(overrides)) {
              if (ov.enabled && key in effectiveSensors) {
                effectiveSensors[key] = ov.value;
                hasOverride = true;
              }
            }
            sendJSON({
              type: "sensor_update",
              device_id: device.device_id,
              device_name: d?.device_name || device.device_name,
              sensors: effectiveSensors,
              effective: hasOverride,
              real_sensors: hasOverride ? treeSensors : null,
              timestamp: new Date().toISOString(),
            });
          }
        }
        return;
      }

      // ── ESP32 Messages ──────────────────────────────────
      if (role === "esp32" && deviceId) {
        if (msg.type === "sensor_update") {
          const sensors = msg.sensors || msg;
          const validated = {};
          let hasData = false;
          const keys = ["soil_moisture", "ph", "air_humidity", "air_temp", "water_temp", "water_level", "air_quality", "flow", "battery"];
          for (const key of keys) {
            if (typeof sensors[key] === "number" && !Number.isNaN(sensors[key])) {
              validated[key] = sensors[key];
              hasData = true;
            }
          }
          if (!hasData) return;

          updateDeviceLastSeen(deviceId);
          storeSensorReading(deviceId, validated);

          const controls = getControls(deviceId) || { manual_override: 0, pump: 0, mode: "AUTO" };
          const aiRec = generateRecommendation(validated);
          storeAIRecommendation(deviceId, aiRec);
          const pumpShouldRun = shouldPumpRun(validated, controls);
          upsertControls(deviceId, { manual_override: controls.manual_override || 0, pump: pumpShouldRun ? 1 : 0, mode: controls.mode || "AUTO" });
          addEvent(deviceId, "sensor_update", validated);

          // Update Firebase-like JSON tree
          setAtPath(`devices/${deviceId}/sensors`, validated);

          // Apply active overrides to build effective sensors
          const deviceOverrides = getAtPath(`devices/${deviceId}/overrides`) || {};
          const effectiveSensors = { ...validated };
          let hasOverride = false;
          for (const [key, ov] of Object.entries(deviceOverrides)) {
            if (ov.enabled && key in effectiveSensors) {
              effectiveSensors[key] = ov.value;
              hasOverride = true;
            }
          }

          setAtPath(`devices/${deviceId}/controls`, {
            manual_override: !!controls.manual_override,
            pump: pumpShouldRun,
            mode: controls.mode || "AUTO",
          });
          setAtPath(`devices/${deviceId}/ai`, { recommendation: aiRec });
          setAtPath(`devices/${deviceId}/info/connected`, true);
          setAtPath(`devices/${deviceId}/info/last_seen`, new Date().toISOString());

          // Broadcast to dashboard
          broadcastToDashboard({
            type: "sensor_update",
            device_id: deviceId,
            device_name: (getDevice(deviceId) || {}).device_name || "Unknown",
            sensors: effectiveSensors,
            effective: hasOverride,
            real_sensors: hasOverride ? validated : null,
            pump: pumpShouldRun,
            mode: controls.mode || "AUTO",
            manual_override: !!controls.manual_override,
            timestamp: new Date().toISOString(),
          });
          broadcastToDashboard({
            type: "device_status",
            device_id: deviceId,
            device_name: (getDevice(deviceId) || {}).device_name,
            online: true,
            last_seen: new Date().toISOString(),
          });
          return;
        }

        if (msg.type === "heartbeat") {
          updateDeviceLastSeen(deviceId);
          setAtPath(`devices/${deviceId}/info/last_seen`, new Date().toISOString());

          broadcastToDashboard({
            type: "device_status",
            device_id: deviceId,
            device_name: (getDevice(deviceId) || {}).device_name,
            online: true,
            last_seen: new Date().toISOString(),
          });
          const pending = getPendingCommands(deviceId).length;
          sendJSON({ type: "heartbeat_ack", server_time: new Date().toISOString(), pending_commands: pending });
          return;
        }
        return;
      }

      // ── Dashboard Commands ──────────────────────────────
      if (role === "dashboard") {
        if (msg.type === "command") {
          const { device_id, command, params } = msg;
          if (!device_id || !command) return;
          const cmd = addCommand(device_id, command, params || {}, "dashboard");

          // Update controls in DB when pump or mode command received
          const currentControls = getControls(device_id) || { manual_override: 0, pump: 0, mode: "AUTO" };
          if (command === "pump") {
            upsertControls(device_id, {
              manual_override: 1,
              pump: params?.state ? 1 : 0,
              mode: "MANUAL",
            });
          } else if (command === "mode") {
            const newMode = params?.mode || "AUTO";
            upsertControls(device_id, {
              manual_override: newMode === "MANUAL" ? 1 : 0,
              pump: currentControls.pump || 0,
              mode: newMode,
            });
          }

          const sent = sendToESP32(device_id, { type: "command", id: cmd.id, command, params: params || {} });
          console.log(`[Dashboard] Command ${command} -> ${device_id} (${sent ? "sent" : "device offline"})`);
          sendJSON({ type: "command_status", device_id, command, status: sent ? "sent" : "queued" });
          return;
        }

        if (msg.type === "get_tree") {
          sendJSON({ type: "tree_data", tree: dbTree });
          return;
        }

        if (msg.type === "get_device_tree") {
          const did = msg.device_id;
          const deviceTree = did ? getAtPath(`devices/${did}`) : null;
          sendJSON({ type: "device_tree", device_id: did, data: deviceTree || {} });
          return;
        }

        if (msg.type === "override_sensor") {
          const { device_id, sensor_key, value, enabled } = msg;
          if (device_id && sensor_key) {
            // Store override separately — don't touch real sensors
            setAtPath(`devices/${device_id}/overrides/${sensor_key}`, {
              value,
              enabled: !!enabled,
              updated_at: new Date().toISOString(),
            });

            // Get current real sensors from tree
            const currentSensors = getAtPath(`devices/${device_id}/sensors`) || {};
            const overrides = getAtPath(`devices/${device_id}/overrides`) || {};

            // Build effective sensors (apply enabled overrides)
            const effectiveSensors = { ...currentSensors };
            for (const [key, ov] of Object.entries(overrides)) {
              if (ov.enabled && key in effectiveSensors) {
                effectiveSensors[key] = ov.value;
              }
            }

            // Broadcast effective sensors to dashboard
            broadcastToDashboard({
              type: "sensor_update",
              device_id,
              device_name: (getDevice(device_id) || {}).device_name || "Unknown",
              sensors: effectiveSensors,
              effective: true,
              real_sensors: currentSensors,
              timestamp: new Date().toISOString(),
            });
          }
          return;
        }

        if (msg.type === "rename_device") {
          const { device_id, device_name } = msg;
          if (device_id && device_name) {
            setAtPath(`devices/${device_id}/info/device_name`, device_name);
            broadcastToDashboard({ type: "device_list", devices: getAllDevices() });
          }
          return;
        }
      }
    });

    ws.on("close", () => {
      if (role === "dashboard") {
        dashboardConnections.delete(ws);
        console.log(`[Dashboard] Client disconnected (${dashboardConnections.size} total)`);
      }
      if (role === "esp32" && deviceId) {
        esp32Connections.delete(deviceId);
        setAtPath(`devices/${deviceId}/info/connected`, false);
        console.log(`[ESP32] Disconnected: ${deviceId}`);
        setTimeout(() => {
          if (!esp32Connections.has(deviceId)) {
            setDeviceOffline(deviceId);
            setAtPath(`devices/${deviceId}/info/connected`, false);
            broadcastToDashboard({
              type: "device_disconnected",
              device_id: deviceId,
              timestamp: new Date().toISOString(),
            });
          }
        }, 30000);
      }
    });

    ws.on("error", (err) => {
      console.log(`[WS] Error: ${err.message}`);
    });
  });

  // ── REST API ──────────────────────────────────────────

  app.get("/api/devices", (req, res) => {
    try {
      res.json(getAllDevices());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/devices/:deviceId/history", (req, res) => {
    try {
      const { deviceId } = req.params;
      const from = req.query.from || new Date(Date.now() - 86400000).toISOString();
      const to = req.query.to || new Date().toISOString();
      const limit = parseInt(req.query.limit || "500", 10);
      res.json({ device_id: deviceId, from, to, entries: getSensorHistory(deviceId, from, to, limit) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/tree", (req, res) => {
    res.json(dbTree);
  });

  app.get("/api/tree/:path(*)", (req, res) => {
    const data = getAtPath(req.params.path);
    if (data === undefined) return res.status(404).json({ error: "Path not found" });
    res.json(data);
  });

  // ── Device Management API ─────────────────────────────

  app.post("/api/devices", (req, res) => {
    try {
      const { device_id, device_name, firmware_version, board_type } = req.body;
      if (!device_id) return res.status(400).json({ error: "device_id is required" });
      const d = registerDevice({
        device_id,
        device_name: device_name || "ESP32",
        firmware_version: firmware_version || "",
        board_type: board_type || "ESP32",
      });
      setAtPath(`devices/${device_id}/info`, {
        device_id,
        device_name: device_name || "ESP32",
        firmware_version: firmware_version || "",
        board_type: board_type || "ESP32",
        connected: false,
        last_seen: null,
      });
      broadcastToDashboard({ type: "device_list", devices: getAllDevices() });
      res.json(d);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/devices/:deviceId", (req, res) => {
    try {
      const { deviceId } = req.params;
      const { device_name, firmware_version, board_type } = req.body;
      const existing = getDevice(deviceId);
      if (!existing) return res.status(404).json({ error: "Device not found" });

      if (device_name !== undefined) {
        updateDeviceName(deviceId, device_name);
        setAtPath(`devices/${deviceId}/info/device_name`, device_name);
      }
      if (firmware_version !== undefined) {
        setAtPath(`devices/${deviceId}/info/firmware_version`, firmware_version);
      }
      if (board_type !== undefined) {
        setAtPath(`devices/${deviceId}/info/board_type`, board_type);
      }

      broadcastToDashboard({ type: "device_list", devices: getAllDevices() });
      res.json(getDevice(deviceId));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/devices/:deviceId", (req, res) => {
    try {
      const { deviceId } = req.params;
      const existing = getDevice(deviceId);
      if (!existing) return res.status(404).json({ error: "Device not found" });

      deleteDevice(deviceId);
      removeAtPath(`devices/${deviceId}`);

      broadcastToDashboard({ type: "device_list", devices: getAllDevices() });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Cleanup & Start ───────────────────────────────────

  setInterval(() => {
    try {
      cleanupOldData(DATA_RETENTION_DAYS);
    } catch (err) {
      console.error("[Cleanup] Error:", err);
    }
  }, 3600000);

  httpServer.listen(PORT, () => {
    const isRender = !!process.env.RENDER;
    const wsUrl = isRender
      ? `wss://${process.env.RENDER_EXTERNAL_URL?.replace(/^https?:\/\//, "") || "climaneer-v2.onrender.com"}`
      : `ws://localhost:${PORT}`;
    console.log(`
  ┌─────────────────────────────────────┐
  │  CLIMANEER V2 Realtime DB           │
  │  Port: ${String(PORT).padEnd(29)}│
  │  CORS: ${CORS_ORIGIN.padEnd(29)}│
  │  WebSocket: ${wsUrl.padEnd(24)}│
  │  Path: /ws                          │
  │  ESP32 + Dashboard: Unified WS      │
  └─────────────────────────────────────┘
    `);
  });
}

start().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
