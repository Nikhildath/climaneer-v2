import initSqlJs from "sql.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "climaneer.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db = null;

function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error("[DB] Save error:", err);
  }
}

export async function initializeDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      device_name TEXT NOT NULL DEFAULT 'ESP32',
      firmware_version TEXT DEFAULT '',
      board_type TEXT DEFAULT '',
      last_seen TEXT DEFAULT (datetime('now','localtime')),
      online_status INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      soil_moisture REAL DEFAULT 0,
      ph REAL DEFAULT 7.0,
      air_humidity REAL DEFAULT 0,
      air_temp REAL DEFAULT 0,
      water_temp REAL DEFAULT 0,
      water_level REAL DEFAULT 0,
      air_quality REAL DEFAULT 0,
      flow REAL DEFAULT 0,
      battery REAL DEFAULT 100,
      recorded_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_sensor_history_device ON sensor_history(device_id, recorded_at)");

  db.run(`
    CREATE TABLE IF NOT EXISTS controls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      manual_override INTEGER DEFAULT 0,
      pump INTEGER DEFAULT 0,
      mode TEXT DEFAULT 'AUTO',
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      recommendation TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      sensor_key TEXT NOT NULL,
      override_value REAL DEFAULT 0,
      enabled INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(device_id, sensor_key)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      command TEXT NOT NULL,
      params TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      source TEXT DEFAULT 'dashboard',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      executed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      online_status INTEGER NOT NULL,
      changed_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  saveDb();
  console.log("[DB] Database initialized");
}

function q(sql, params = {}) {
  if (!db) throw new Error("Database not initialized");
  const stmt = db.prepare(sql);
  const bindParams = [];
  const keys = Object.keys(params);
  for (let i = 0; i < keys.length; i++) {
    bindParams.push(params[keys[i]]);
  }
  if (keys.length > 0) {
    stmt.bind(bindParams);
  }
  return stmt;
}

function run(sql, params = {}) {
  const stmt = q(sql, params);
  stmt.step();
  stmt.free();
  saveDb();
}

function get(sql, params = {}) {
  const stmt = q(sql, params);
  const result = [];
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

function getOne(sql, params = {}) {
  const rows = get(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function registerDevice({ device_id, device_name, firmware_version, board_type }) {
  run(
    `INSERT INTO devices (device_id, device_name, firmware_version, board_type, last_seen, online_status)
     VALUES (@d, @n, @f, @b, datetime('now','localtime'), 1)
     ON CONFLICT(device_id) DO UPDATE SET
       device_name = COALESCE(NULLIF(@n, ''), device_name),
       firmware_version = COALESCE(NULLIF(@f, ''), firmware_version),
       board_type = COALESCE(NULLIF(@b, ''), board_type),
       last_seen = datetime('now','localtime'),
       online_status = 1,
       updated_at = datetime('now','localtime')`,
    { d: device_id, n: device_name || "", f: firmware_version || "", b: board_type || "" }
  );
  return getDevice(device_id);
}

export function getDevice(device_id) {
  return getOne("SELECT * FROM devices WHERE device_id = ?", [device_id]);
}

export function getAllDevices() {
  return get("SELECT * FROM devices ORDER BY last_seen DESC");
}

export function setDeviceOffline(device_id) {
  run("UPDATE devices SET online_status = 0, updated_at = datetime('now','localtime') WHERE device_id = ?", [device_id]);
  run("INSERT INTO device_status_history (device_id, online_status) VALUES (?, 0)", [device_id]);
}

export function updateDeviceLastSeen(device_id) {
  run("UPDATE devices SET last_seen = datetime('now','localtime'), online_status = 1, updated_at = datetime('now','localtime') WHERE device_id = ?", [device_id]);
}

export function updateDeviceName(device_id, device_name) {
  run("UPDATE devices SET device_name = ?, updated_at = datetime('now','localtime') WHERE device_id = ?", [device_name, device_id]);
}

export function storeSensorReading(device_id, sensors) {
  run(
    `INSERT INTO sensor_history (device_id, soil_moisture, ph, air_humidity, air_temp, water_temp, water_level, air_quality, flow, battery)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      device_id,
      sensors.soil_moisture ?? 0,
      sensors.ph ?? 7.0,
      sensors.air_humidity ?? 0,
      sensors.air_temp ?? 0,
      sensors.water_temp ?? 0,
      sensors.water_level ?? 0,
      sensors.air_quality ?? 0,
      sensors.flow ?? 0,
      sensors.battery ?? 100,
    ]
  );
}

export function upsertControls(device_id, controls) {
  const existing = getControls(device_id);
  if (existing) {
    run(
      `UPDATE controls SET manual_override = ?, pump = ?, mode = ?, updated_at = datetime('now','localtime') WHERE device_id = ?`,
      [controls.manual_override ?? 0, controls.pump ?? 0, controls.mode ?? "AUTO", device_id]
    );
  } else {
    run(
      `INSERT INTO controls (device_id, manual_override, pump, mode) VALUES (?, ?, ?, ?)`,
      [device_id, controls.manual_override ?? 0, controls.pump ?? 0, controls.mode ?? "AUTO"]
    );
  }
}

export function getControls(device_id) {
  return getOne("SELECT * FROM controls WHERE device_id = ?", [device_id]);
}

export function storeAIRecommendation(device_id, recommendation) {
  run("INSERT INTO ai_recommendations (device_id, recommendation) VALUES (?, ?)", [device_id, recommendation]);
}

export function getLatestAI(device_id) {
  return getOne(
    "SELECT * FROM ai_recommendations WHERE device_id = ? ORDER BY created_at DESC LIMIT 1",
    [device_id]
  );
}

export function setOverride(device_id, sensor_key, override_value, enabled) {
  const existing = getOne(
    "SELECT * FROM overrides WHERE device_id = ? AND sensor_key = ?",
    [device_id, sensor_key]
  );
  if (existing) {
    run(
      "UPDATE overrides SET override_value = ?, enabled = ?, updated_at = datetime('now','localtime') WHERE device_id = ? AND sensor_key = ?",
      [override_value, enabled ? 1 : 0, device_id, sensor_key]
    );
  } else {
    run(
      "INSERT INTO overrides (device_id, sensor_key, override_value, enabled) VALUES (?, ?, ?, ?)",
      [device_id, sensor_key, override_value, enabled ? 1 : 0]
    );
  }
}

export function getActiveOverrides(device_id) {
  return get("SELECT * FROM overrides WHERE device_id = ? AND enabled = 1", [device_id]);
}

export function getAllOverrides(device_id) {
  return get("SELECT * FROM overrides WHERE device_id = ?", [device_id]);
}

export function addCommand(device_id, command, params, source = "dashboard") {
  const paramsStr = JSON.stringify(params || {});
  run(
    "INSERT INTO commands (device_id, command, params, status, source) VALUES (?, ?, ?, 'pending', ?)",
    [device_id, command, paramsStr, source]
  );
  const rows = get(
    "SELECT * FROM commands WHERE device_id = ? ORDER BY created_at DESC LIMIT 1",
    [device_id]
  );
  return rows[0] || null;
}

export function completeCommand(id) {
  run("UPDATE commands SET status = 'executed', executed_at = datetime('now','localtime') WHERE id = ?", [id]);
}

export function getPendingCommands(device_id) {
  return get(
    "SELECT * FROM commands WHERE device_id = ? AND status = 'pending' ORDER BY created_at ASC",
    [device_id]
  );
}

export function addEvent(device_id, event_type, event_data = {}) {
  run(
    "INSERT INTO events (device_id, event_type, event_data) VALUES (?, ?, ?)",
    [device_id, event_type, JSON.stringify(event_data)]
  );
}

export function getSensorHistory(device_id, from, to, limit = 500) {
  return get(
    `SELECT * FROM sensor_history
     WHERE device_id = ? AND recorded_at >= ? AND recorded_at <= ?
     ORDER BY recorded_at ASC LIMIT ?`,
    [device_id, from, to, limit]
  );
}

export function getLatestSensor(device_id) {
  return getOne(
    "SELECT * FROM sensor_history WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1",
    [device_id]
  );
}

export function getRecentEvents(device_id, limit = 100) {
  return get(
    "SELECT * FROM events WHERE device_id = ? ORDER BY created_at DESC LIMIT ?",
    [device_id, limit]
  );
}

export function getDeviceStatusHistory(device_id) {
  return get(
    "SELECT * FROM device_status_history WHERE device_id = ? ORDER BY changed_at DESC LIMIT 50",
    [device_id]
  );
}

export function getCommandHistory(device_id, limit = 100) {
  return get(
    "SELECT * FROM commands WHERE device_id = ? ORDER BY created_at DESC LIMIT ?",
    [device_id, limit]
  );
}

export function cleanupOldData(days = 90) {
  const cutoff = `-${days} days`;
  run("DELETE FROM sensor_history WHERE recorded_at < datetime('now','localtime', ?)", [cutoff]);
  run("DELETE FROM events WHERE created_at < datetime('now','localtime', ?)", [cutoff]);
}

export function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}
