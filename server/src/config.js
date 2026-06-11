const config = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  WS_PING_INTERVAL: parseInt(process.env.WS_PING_INTERVAL || "25000", 10),
  WS_PING_TIMEOUT: parseInt(process.env.WS_PING_TIMEOUT || "10000", 10),
  HEARTBEAT_TIMEOUT: parseInt(process.env.HEARTBEAT_TIMEOUT || "30000", 10),
  DATA_RETENTION_DAYS: parseInt(process.env.DATA_RETENTION_DAYS || "90", 10),
};

export default config;
