export function generateRecommendation(sensors) {
  const {
    soil_moisture = 0,
    ph = 7.0,
    air_humidity = 0,
    air_temp = 0,
    water_level = 0,
    air_quality = 0,
  } = sensors;

  if (water_level < 20) return "Low tank level \u2192 Refill soon";
  if (soil_moisture < 30) return "Soil dry \u2192 Pump recommended";
  if (soil_moisture > 80) return "Soil saturated \u2192 Hold watering";
  if (ph < 5.5) return "Soil acidic \u2192 Add lime";
  if (ph > 7.5) return "Soil alkaline \u2192 Add sulfur";
  if (air_humidity < 30) return "Low humidity \u2192 Mist recommended";
  if (air_temp > 38) return "High temp \u2192 Shade recommended";
  if (air_temp < 5) return "Low temp \u2192 Frost protection needed";
  if (air_quality > 200) return "Poor air quality \u2192 Limit exposure";
  if (water_level < 50 && soil_moisture < 40) return "Low water & dry soil \u2192 Refill tank";

  return "Conditions normal";
}

export function shouldPumpRun(sensors, controls) {
  const { manual_override = 0, pump = 0, mode = "AUTO" } = controls;
  const { soil_moisture = 0, water_level = 0 } = sensors;

  // If manual override is active, respect the user's pump state regardless of mode
  if (manual_override) {
    return !!pump;
  }

  if (mode === "MANUAL") {
    return false;
  }

  if (water_level < 20) return false;
  return soil_moisture < 50;
}
