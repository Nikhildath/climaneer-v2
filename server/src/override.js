import { getActiveOverrides, setOverride as dbSetOverride } from "./database.js";

export function computeEffectiveSensors(device_id, realSensors) {
  const activeOverrides = getActiveOverrides(device_id);

  if (!activeOverrides || activeOverrides.length === 0) {
    return { sensors: realSensors, overrideActive: false };
  }

  const effective = { ...realSensors };
  const keys = [
    "soil_moisture", "ph", "air_humidity", "air_temp",
    "water_temp", "water_level", "air_quality", "flow", "battery",
  ];

  for (const ov of activeOverrides) {
    if (keys.includes(ov.sensor_key)) {
      effective[ov.sensor_key] = ov.override_value;
    }
  }

  return { sensors: effective, overrideActive: true };
}

export function handleOverrideSensor(device_id, sensor_key, value, enabled) {
  dbSetOverride(device_id, sensor_key, value, enabled);
}

const VALID_KEYS = [
  "soil_moisture", "ph", "air_humidity", "air_temp",
  "water_temp", "water_level", "air_quality", "flow", "battery",
];

export function isValidSensorKey(key) {
  return VALID_KEYS.includes(key);
}

export function getDefaultSensorValues() {
  return {
    soil_moisture: 0,
    ph: 7.0,
    air_humidity: 0,
    air_temp: 0,
    water_temp: 0,
    water_level: 0,
    air_quality: 0,
    flow: 0,
    battery: 100,
  };
}

export function validateSensorValues(sensors) {
  const valid = {};
  for (const [key, value] of Object.entries(sensors)) {
    if (VALID_KEYS.includes(key) && typeof value === "number" && !Number.isNaN(value)) {
      valid[key] = value;
    }
  }
  return valid;
}
