import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
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
  const { initializeDatabase, getAllDevices, getSensorHistory, cleanupOldData } = await import("./database.js");
  const { setupSocketHandlers } = await import("./socket-handlers.js");

  await initializeDatabase();

  app.get("/api/devices", (req, res) => {
    try {
      const devices = getAllDevices();
      res.json(devices);
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
      const history = getSensorHistory(deviceId, from, to, limit);
      res.json({ device_id: deviceId, from, to, entries: history });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  setupSocketHandlers(io);

  setInterval(() => {
    try {
      cleanupOldData(DATA_RETENTION_DAYS);
    } catch (err) {
      console.error("[Cleanup] Error:", err);
    }
  }, 3600000);

  httpServer.listen(PORT, () => {
    const isRender = !!process.env.RENDER;
    const wsUrl = isRender ? `wss://${process.env.RENDER_EXTERNAL_URL?.replace(/^https?:\/\//, "") || "climaneer-v2.onrender.com"}:${PORT}` : `ws://localhost:${PORT}`;
    console.log(`
  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
  \u2502  CLIMANEER V2 Server                    \u2502
  \u2502  Port: ${String(PORT).padEnd(37)}\u2502
  \u2502  CORS: ${CORS_ORIGIN.padEnd(36)}\u2502
  \u2502  WebSocket: ${wsUrl.padEnd(33)}\u2502
  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
    `);
  });
}

start().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
