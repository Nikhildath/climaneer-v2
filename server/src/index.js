import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { WebSocketServer } from "ws";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import config from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { PORT, CORS_ORIGIN, WS_PING_INTERVAL, WS_PING_TIMEOUT, DATA_RETENTION_DAYS } = config;

const app = express();
const httpServer = createServer(app);

const corsOrigins = CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean);
const allowAll = corsOrigins.includes("*");
const io = new Server(httpServer, {
  cors: {
    origin: allowAll ? "*" : (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  },
  pingInterval: WS_PING_INTERVAL,
  pingTimeout: WS_PING_TIMEOUT,
  transports: ["websocket", "polling"],
});

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

async function start() {
  const { initializeDatabase, getAllDevices, getSensorHistory, cleanupOldData,
    registerDevice, getDevice, setDeviceOffline, updateDeviceLastSeen,
    storeSensorReading, upsertControls, getControls, storeAIRecommendation, getLatestAI,
    addCommand, getPendingCommands, addEvent, getCommandHistory, getDeviceStatusHistory } = await import("./database.js");
  const { generateRecommendation, shouldPumpRun } = await import("./ai.js");

  await initializeDatabase();

  // Raw WebSocket endpoint for ESP32 devices (no Engine.IO/Socket.IO complexity)
  const esp32Connections = new Map();

  const wss = new WebSocketServer({ server: httpServer, path: "/esp32" });

  wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[ESP32 WS] New connection from ${ip}`);
    let deviceId = null;

    const sendJSON = (data) => ws.send(JSON.stringify(data));

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "register") {
        const d = registerDevice({
          device_id: msg.device_id,
          device_name: msg.device_name || "ESP32",
          firmware_version: msg.firmware_version || "1.0.0",
          board_type: msg.board_type || "ESP32",
        });
        deviceId = d.device_id;
        esp32Connections.set(deviceId, ws);
        console.log(`[ESP32 WS] Device registered: ${deviceId}`);
        sendJSON({ type: "device_registered", device_id: deviceId, success: true });

        // Send pending commands
        const pending = getPendingCommands(deviceId);
        for (const cmd of pending) {
          sendJSON({ type: "command", id: cmd.id, command: cmd.command, params: JSON.parse(cmd.params || "{}") });
        }
        return;
      }

      if (!deviceId) return;

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

        // Broadcast to Socket.IO dashboard clients
        io.to("dashboard").emit("sensor_update", {
          device_id: deviceId,
          device_name: (getDevice(deviceId) || {}).device_name || "Unknown",
          sensors: validated,
          effective: false,
          real_sensors: null,
          pump: !!controls.pump,
          mode: controls.mode || "AUTO",
          manual_override: !!controls.manual_override,
          timestamp: new Date().toISOString(),
        });
        io.to("dashboard").emit("device_status", {
          device_id: deviceId, device_name: (getDevice(deviceId) || {}).device_name,
          online: true, last_seen: new Date().toISOString(),
        });
        return;
      }

      if (msg.type === "heartbeat") {
        updateDeviceLastSeen(deviceId);
        io.to("dashboard").emit("device_status", {
          device_id: deviceId, device_name: (getDevice(deviceId) || {}).device_name,
          online: true, last_seen: new Date().toISOString(),
        });
        const pending = getPendingCommands(deviceId).length;
        sendJSON({ type: "heartbeat_ack", server_time: new Date().toISOString(), pending_commands: pending });
        return;
      }
    });

    ws.on("close", () => {
      console.log(`[ESP32 WS] Disconnected: ${deviceId || ip}`);
      if (deviceId) {
        esp32Connections.delete(deviceId);
        setTimeout(() => {
          if (!esp32Connections.has(deviceId)) {
            setDeviceOffline(deviceId);
            io.to("dashboard").emit("device_disconnected", { device_id: deviceId, timestamp: new Date().toISOString() });
          }
        }, 30000);
      }
    });

    ws.on("error", (err) => {
      console.log(`[ESP32 WS] Error: ${err.message}`);
    });
  });

  // Bridge commands from Socket.IO dashboard to ESP32 raw WebSocket
  io.on("connection", (socket) => {
    socket.on("dashboard_join", () => {
      socket.join("dashboard");
      const allDevices = getAllDevices();
      socket.emit("device_list", allDevices);
      for (const device of allDevices) {
        const d = getDevice(device.device_id);
        io.to("dashboard").emit("device_status", {
          device_id: device.device_id, device_name: (d || {}).device_name,
          online: !!esp32Connections.has(device.device_id),
          last_seen: d ? d.last_seen : null,
        });
      }
    });

    socket.on("command", (data) => {
      const { device_id, command, params } = data;
      if (!device_id || !command) return;
      const cmd = addCommand(device_id, command, params || {}, "dashboard");
      const ws = esp32Connections.get(device_id);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "command", id: cmd.id, command, params: params || {} }));
        console.log(`[ESP32 WS] Command forwarded: ${command} -> ${device_id}`);
      }
    });

    socket.on("disconnect", () => {
      // Dashboard disconnected, nothing special to do
    });
  });

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

  setInterval(() => {
    try {
      cleanupOldData(DATA_RETENTION_DAYS);
    } catch (err) {
      console.error("[Cleanup] Error:", err);
    }
  }, 3600000);

  httpServer.listen(PORT, () => {
    const isRender = !!process.env.RENDER;
    const wsUrl = isRender ? `wss://${process.env.RENDER_EXTERNAL_URL?.replace(/^https?:\/\//, "") || "climaneer-v2.onrender.com"}` : `ws://localhost:${PORT}`;
    console.log(`
  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
  \u2502  CLIMANEER V2 Server                    \u2502
  \u2502  Port: ${String(PORT).padEnd(37)}\u2502
  \u2502  CORS: ${CORS_ORIGIN.padEnd(36)}\u2502
  \u2502  ESP32 WS: ${wsUrl.padEnd(31)}\u2502
  \u2502  Dashboard: ${wsUrl}/socket.io  \u2502
  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
    `);
  });
}

start().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
