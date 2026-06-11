import {
  registerDevice, getDevice, getAllDevices, setDeviceOffline,
  updateDeviceLastSeen, storeSensorReading, upsertControls,
  getControls, storeAIRecommendation, getLatestAI,
  setOverride, getActiveOverrides, getAllOverrides,
  addCommand, getPendingCommands, addEvent,
  getSensorHistory, getLatestSensor, getRecentEvents,
  getDeviceStatusHistory, getCommandHistory,
} from "./database.js";
import { generateRecommendation, shouldPumpRun } from "./ai.js";
import { computeEffectiveSensors, isValidSensorKey, getDefaultSensorValues } from "./override.js";

const deviceSockets = new Map();
const devices = new Map();
const deviceRealSensors = new Map();

function broadcastDeviceStatus(io, device_id) {
  const device = getDevice(device_id);
  if (device) {
    io.to("dashboard").emit("device_status", {
      device_id: device.device_id,
      device_name: device.device_name,
      firmware_version: device.firmware_version,
      board_type: device.board_type,
      online: !!device.online_status,
      last_seen: device.last_seen,
    });
  }
}

function broadcastControls(io, device_id) {
  const controls = getControls(device_id) || { manual_override: 0, pump: 0, mode: "AUTO" };
  io.to("dashboard").emit("controls_update", {
    device_id,
    pump: !!controls.pump,
    mode: controls.mode || "AUTO",
    manual_override: !!controls.manual_override,
  });
}

function broadcastEffectiveSensors(io, device_id) {
  const realSensors = deviceRealSensors.get(device_id) || getDefaultSensorValues();
  const { sensors: effectiveSensors, overrideActive } = computeEffectiveSensors(device_id, realSensors);
  const device = getDevice(device_id);
  const controls = getControls(device_id) || { manual_override: 0, pump: 0, mode: "AUTO" };

  const payload = {
    device_id,
    device_name: device?.device_name || "Unknown",
    sensors: effectiveSensors,
    effective: overrideActive,
    real_sensors: overrideActive ? realSensors : null,
    pump: !!controls.pump,
    mode: controls.mode || "AUTO",
    manual_override: !!controls.manual_override,
    timestamp: new Date().toISOString(),
  };
  io.to("dashboard").emit("sensor_update", payload);
  io.emit("sensor_update", payload);
}

function broadcastAIRecommendation(io, device_id, recommendation) {
  const device = getDevice(device_id);
  io.to("dashboard").emit("ai_recommendation", {
    device_id,
    device_name: device?.device_name || "Unknown",
    recommendation,
    timestamp: new Date().toISOString(),
  });
}

function broadcastDeviceList(io) {
  const allDevices = getAllDevices();
  io.to("dashboard").emit("device_list", allDevices);
}

function setESP32TimedPump(io, device_id, durationMs) {
  const device = getDevice(device_id);
  const control = getControls(device_id) || { manual_override: 0, pump: 0, mode: "AUTO" };

  upsertControls(device_id, {
    manual_override: 1,
    pump: 1,
    mode: control.mode,
  });

  broadcastDeviceStatus(io, device_id);

  const socketId = deviceSockets.get(device_id);
  if (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("command", {
        id: Date.now().toString(),
        command: "pump",
        params: { state: true },
      });
    }
  }

  setTimeout(() => {
    upsertControls(device_id, {
      manual_override: 0,
      pump: 0,
      mode: control.mode,
    });

    broadcastDeviceStatus(io, device_id);

    const socketId2 = deviceSockets.get(device_id);
    if (socketId2) {
      const socket2 = io.sockets.sockets.get(socketId2);
      if (socket2) {
        socket2.emit("command", {
          id: Date.now().toString(),
          command: "pump",
          params: { state: false },
        });
      }
    }

    broadcastEffectiveSensors(io, device_id);
  }, durationMs);
}

export function setupSocketHandlers(io) {

  io.on("connection", (socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    socket.on("dashboard_join", () => {
      console.log(`[Socket] dashboard_join from ${socket.id}`);
      socket.join("dashboard");

      let allDevices = getAllDevices();

      // Auto-create a test device if none exist — so UI works without ESP32
      if (allDevices.length === 0) {
        registerDevice({
          device_id: "test-esp32-01",
          device_name: "Test ESP32 (no hardware)",
          firmware_version: "2.0.0-sim",
          board_type: "ESP32 Simulator",
        });
        allDevices = getAllDevices();
      }

      // Ensure every known device has in-memory sensor data and controls row
      for (const device of allDevices) {
        if (!deviceRealSensors.has(device.device_id)) {
          deviceRealSensors.set(device.device_id, {
            soil_moisture: 65.4, ph: 7.1, air_humidity: 72.3,
            air_temp: 29.8, water_temp: 27.5, water_level: 81.2,
            air_quality: 145, flow: 12.7, battery: 90,
          });
          const aiRec = generateRecommendation(deviceRealSensors.get(device.device_id));
          storeAIRecommendation(device.device_id, aiRec);
        }
        // Ensure a controls row exists so getControls never returns null
        const existing = getControls(device.device_id);
        if (!existing) {
          upsertControls(device.device_id, { manual_override: 0, pump: 0, mode: "AUTO" });
        }
      }

      socket.emit("device_list", allDevices);

      // Send current state for all known devices
      for (const device of allDevices) {
        const realSensors = deviceRealSensors.get(device.device_id);
        const { sensors, overrideActive } = computeEffectiveSensors(device.device_id, realSensors);
        const controls = getControls(device.device_id) || { manual_override: 0, pump: 0, mode: "AUTO" };
        socket.emit("sensor_update", {
          device_id: device.device_id,
          device_name: device.device_name || "Unknown",
          sensors,
          effective: overrideActive,
          real_sensors: overrideActive ? realSensors : null,
          pump: !!controls.pump,
          mode: controls.mode || "AUTO",
          manual_override: !!controls.manual_override,
          timestamp: new Date().toISOString(),
        });

        socket.emit("controls_update", {
          device_id: device.device_id,
          pump: !!controls.pump,
          mode: controls.mode || "AUTO",
          manual_override: !!controls.manual_override,
        });

        const aiRec = getLatestAI(device.device_id);
        if (aiRec) {
          socket.emit("ai_recommendation", {
            device_id: device.device_id,
            device_name: device.device_name || "Unknown",
            recommendation: aiRec.recommendation,
            timestamp: new Date().toISOString(),
          });
        }

        const deviceInfo = getDevice(device.device_id);
        if (deviceInfo) {
          socket.emit("device_status", {
            device_id: deviceInfo.device_id,
            device_name: deviceInfo.device_name,
            firmware_version: deviceInfo.firmware_version,
            board_type: deviceInfo.board_type,
            online: !!deviceInfo.online_status,
            last_seen: deviceInfo.last_seen,
          });
        }

        const allOverrides = getAllOverrides(device.device_id);
        socket.emit("overrides_update", {
          device_id: device.device_id,
          overrides: allOverrides,
          override_active: allOverrides.some(o => o.enabled),
        });
      }

      console.log(`[Socket] Dashboard joined: ${socket.id} (${allDevices.length} devices)`);
    });

    socket.on("register", (data) => {
      const { device_id, device_name, firmware_version, board_type } = data;
      if (!device_id) {
        socket.emit("error", { message: "device_id is required" });
        return;
      }

      const device = registerDevice({
        device_id,
        device_name: device_name || "ESP32",
        firmware_version: firmware_version || "1.0.0",
        board_type: board_type || "ESP32",
      });

      deviceSockets.set(device_id, socket.id);
      devices.set(socket.id, device_id);

      if (!deviceRealSensors.has(device_id)) {
        deviceRealSensors.set(device_id, getDefaultSensorValues());
      }

      socket.join(`device:${device_id}`);

      addEvent(device_id, "device_registered", { socket_id: socket.id });

      socket.emit("device_registered", {
        device_id: device.device_id,
        success: true,
        message: "Device registered successfully",
        server_time: new Date().toISOString(),
      });

      broadcastDeviceStatus(io, device_id);
      broadcastDeviceList(io);

      const pendingCommands = getPendingCommands(device_id);
      for (const cmd of pendingCommands) {
        socket.emit("command", {
          id: cmd.id,
          command: cmd.command,
          params: JSON.parse(cmd.params || "{}"),
        });
      }

      console.log(`[Socket] Device registered: ${device_id} (${device_name || "ESP32"})`);
    });

    socket.on("sensor_update", (data) => {
      const device_id = devices.get(socket.id);
      if (!device_id) return;

      const sensors = data.sensors || data;
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

      deviceRealSensors.set(device_id, validated);
      updateDeviceLastSeen(device_id);
      storeSensorReading(device_id, validated);

      const controls = getControls(device_id) || { manual_override: 0, pump: 0, mode: "AUTO" };

      const aiRec = generateRecommendation(validated);
      storeAIRecommendation(device_id, aiRec);

      const pumpShouldRun = shouldPumpRun(validated, controls);
      upsertControls(device_id, {
        manual_override: controls.manual_override || 0,
        pump: pumpShouldRun ? 1 : 0,
        mode: controls.mode || "AUTO",
      });

      broadcastEffectiveSensors(io, device_id);
      broadcastControls(io, device_id);
      broadcastAIRecommendation(io, device_id, aiRec);
      broadcastDeviceStatus(io, device_id);

      addEvent(device_id, "sensor_update", validated);
    });

    socket.on("heartbeat", (data) => {
      const device_id = devices.get(socket.id);
      if (!device_id) return;

      updateDeviceLastSeen(device_id);
      broadcastDeviceStatus(io, device_id);

      socket.emit("heartbeat_ack", {
        server_time: new Date().toISOString(),
        pending_commands: getPendingCommands(device_id).length,
      });
    });

    socket.on("status_update", (data) => {
      const device_id = devices.get(socket.id);
      if (!device_id) return;

      if (data && typeof data.online !== "undefined") {
        if (!data.online) {
          setDeviceOffline(device_id);
        } else {
          updateDeviceLastSeen(device_id);
        }
        broadcastDeviceStatus(io, device_id);
        broadcastDeviceList(io);
        addEvent(device_id, "status_change", { online: !!data.online });
      }
    });

    socket.on("command", (data) => {
      const { device_id, command, params } = data;
      console.log(`[Socket] Command received: device=${device_id} command=${command} params=${JSON.stringify(params)}`);

      if (!device_id || !command) {
        socket.emit("error", { message: "device_id and command are required" });
        return;
      }

      const cmd = addCommand(device_id, command, params || {}, "dashboard");
      const controls = getControls(device_id) || { manual_override: 0, pump: 0, mode: "AUTO" };

      console.log(`[Socket] Current controls before ${command}:`, JSON.stringify(controls));

      // Apply command to server-side state (works with or without ESP32)
      if (command === "pump") {
        const pumpOn = params?.state === true || params?.state === 1;
        upsertControls(device_id, {
          manual_override: 1,
          pump: pumpOn ? 1 : 0,
          mode: controls.mode || "AUTO",
        });
        addEvent(device_id, "pump_toggle", { state: pumpOn });
        console.log(`[Socket] Pump set to ${pumpOn ? "ON" : "OFF"} with manual_override=1`);
      } else if (command === "mode") {
        const mode = (params?.mode || "AUTO").toUpperCase();
        upsertControls(device_id, {
          manual_override: 0,
          pump: controls.pump || 0,
          mode,
        });
        addEvent(device_id, "mode_change", { mode });
        console.log(`[Socket] Mode set to ${mode} with manual_override=0`);
      }

      const updatedControls = getControls(device_id);
      console.log(`[Socket] Controls after ${command}:`, JSON.stringify(updatedControls));

      const espSocketId = deviceSockets.get(device_id);
      if (espSocketId) {
        const espSocket = io.sockets.sockets.get(espSocketId);
        if (espSocket) {
          espSocket.emit("command", {
            id: cmd.id,
            command: cmd.command,
            params: params || {},
          });

          addEvent(device_id, "command_sent", { command, params });
          io.to("dashboard").emit("command_status", {
            device_id,
            command,
            params,
            status: "sent",
            id: cmd.id,
          });
        } else {
          // ESP32 socket exists but not connected — command applied to server state
          io.to("dashboard").emit("command_status", {
            device_id,
            command,
            params,
            status: "applied_simulation",
            id: cmd.id,
          });
        }
      } else {
        // No ESP32 — command applied to server state (simulation mode)
        io.to("dashboard").emit("command_status", {
          device_id,
          command,
          params,
          status: "applied_simulation",
          id: cmd.id,
        });
      }

      // Broadcast updated controls so dashboard reflects the change
      broadcastDeviceStatus(io, device_id);
      broadcastEffectiveSensors(io, device_id);
      broadcastControls(io, device_id);

      io.to("dashboard").emit("command_received", {
        device_id,
        command,
        params: params || {},
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("override_sensor", (data) => {
      const { device_id, sensor_key, value, enabled } = data;

      if (!device_id || !sensor_key) {
        socket.emit("error", { message: "device_id and sensor_key are required" });
        return;
      }

      if (!isValidSensorKey(sensor_key)) {
        socket.emit("error", { message: `Invalid sensor key: ${sensor_key}` });
        return;
      }

      setOverride(device_id, sensor_key, value, enabled ?? true);

      addEvent(device_id, "override_set", { sensor_key, value, enabled });

      broadcastEffectiveSensors(io, device_id);

      const realSensors = deviceRealSensors.get(device_id) || getDefaultSensorValues();
      const { sensors: effectiveSensors, overrideActive } = computeEffectiveSensors(device_id, realSensors);

      if (overrideActive) {
        const aiRec = generateRecommendation(effectiveSensors);
        storeAIRecommendation(device_id, aiRec);
        broadcastAIRecommendation(io, device_id, aiRec);
      }

      const allOverrides = getAllOverrides(device_id);
      const ovPayload = {
        device_id,
        overrides: allOverrides,
        override_active: overrideActive,
      };
      io.to("dashboard").emit("overrides_update", ovPayload);
      io.emit("overrides_update", ovPayload);
    });

    socket.on("get_overrides", (data) => {
      const device_id = data?.device_id;
      if (!device_id) return;

      const allOverrides = getAllOverrides(device_id);
      const realSensors = deviceRealSensors.get(device_id) || getDefaultSensorValues();
      const { overrideActive } = computeEffectiveSensors(device_id, realSensors);

      socket.emit("overrides_update", {
        device_id,
        overrides: allOverrides,
        override_active: overrideActive,
      });
    });

    socket.on("override_ai", (data) => {
      const { device_id, recommendation } = data;
      if (!device_id) return;

      const rec = recommendation || "Manual override: conditions normal";
      storeAIRecommendation(device_id, rec);
      broadcastAIRecommendation(io, device_id, rec);
      addEvent(device_id, "ai_override", { recommendation: rec });

      console.log(`[Socket] AI override for ${device_id}: ${rec}`);
    });

    socket.on("get_history", (data) => {
      const { device_id, from, to, limit = 500 } = data || {};
      if (!device_id) return;

      const fromDate = from || new Date(Date.now() - 86400000).toISOString();
      const toDate = to || new Date().toISOString();

      const history = getSensorHistory(device_id, fromDate, toDate, limit);
      socket.emit("history_data", {
        device_id,
        from: fromDate,
        to: toDate,
        entries: history,
      });
    });

    socket.on("get_device_events", (data) => {
      const { device_id, limit = 100 } = data || {};
      if (!device_id) return;

      const events = getRecentEvents(device_id, limit);
      socket.emit("device_events", { device_id, events });
    });

    socket.on("get_command_history", (data) => {
      const { device_id, limit = 100 } = data || {};
      if (!device_id) return;

      const commands = getCommandHistory(device_id, limit);
      socket.emit("command_history_data", { device_id, commands });
    });

    socket.on("get_device_status_history", (data) => {
      const { device_id } = data || {};
      if (!device_id) return;

      const statusHistory = getDeviceStatusHistory(device_id);
      socket.emit("device_status_history_data", { device_id, statusHistory });
    });

    socket.on("disconnect", () => {
      const device_id = devices.get(socket.id);
      if (device_id) {
        if (deviceSockets.get(device_id) === socket.id) {
          deviceSockets.delete(device_id);
        }
        devices.delete(socket.id);
        console.log(`[Socket] Device disconnected: ${device_id} (socket: ${socket.id})`);

        setTimeout(() => {
          if (!deviceSockets.has(device_id)) {
            setDeviceOffline(device_id);
            broadcastDeviceStatus(io, device_id);
            broadcastDeviceList(io);

            io.to("dashboard").emit("device_disconnected", {
              device_id,
              timestamp: new Date().toISOString(),
            });

            addEvent(device_id, "device_disconnected", {});
          }
        }, 30000);
      } else {
        console.log(`[Socket] Dashboard disconnected: ${socket.id}`);
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [device_id, socketId] of deviceSockets.entries()) {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket || !socket.connected) {
        deviceSockets.delete(device_id);
        setDeviceOffline(device_id);
        broadcastDeviceStatus(io, device_id);
        broadcastDeviceList(io);

        io.to("dashboard").emit("device_disconnected", {
          device_id,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, 60000);
}

export { broadcastEffectiveSensors, broadcastDeviceStatus, broadcastAIRecommendation, broadcastDeviceList, broadcastControls };
