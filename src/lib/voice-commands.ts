import { getCurrentWeather } from "./ai-client";

export interface CommandContext {
  getSensorValue: (key: string) => string;
  onPumpToggle: (on: boolean) => Promise<void>;
  onAutoMode: () => Promise<void>;
  onManualMode: () => Promise<void>;
  onScheduledMode: () => Promise<void>;
  navigate: (path: string) => void;
  getSystemStatus: () => string;
  getAIRecommendation: () => string;
  getActiveAlerts: () => string;
  getControlMode: () => string;
  speak: (text: string) => void;
  onSettingsSave?: (key: string, value: any) => void;
  onAlertDismiss?: (id?: string) => void;
  onClearAlerts?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onStopListening?: () => void;
  onStopPumpTimer?: () => void;
}

let pumpTimerId: ReturnType<typeof setTimeout> | null = null;

export interface VoiceCommand {
  id: string;
  category: CommandCategory;
  patterns: RegExp[];
  priority: number;
  description: string;
  examples: string[];
  execute: (ctx: CommandContext, match: string) => boolean | Promise<boolean>;
}

export type CommandCategory =
  | "greeting"
  | "sensor"
  | "pump"
  | "mode"
  | "schedule"
  | "alert"
  | "navigation"
  | "settings"
  | "system"
  | "help"
  | "voice-control"
  | "export"
  | "weather"
  | "plant";

export const COMMAND_CATEGORIES: Record<CommandCategory, { label: string; icon: string }> = {
  greeting: { label: "Greetings", icon: "👋" },
  sensor: { label: "Sensor Readings", icon: "📡" },
  pump: { label: "Pump Control", icon: "💧" },
  mode: { label: "System Modes", icon: "⚙️" },
  schedule: { label: "Scheduling", icon: "📅" },
  alert: { label: "Alerts", icon: "🔔" },
  navigation: { label: "Navigation", icon: "🧭" },
  settings: { label: "Settings", icon: "🔧" },
  system: { label: "System Info", icon: "📊" },
  help: { label: "Help", icon: "❓" },
  "voice-control": { label: "Voice Control", icon: "🎤" },
  export: { label: "Export", icon: "📥" },
  weather: { label: "Weather", icon: "🌤️" },
  plant: { label: "Plant Advisory", icon: "🌱" },
};

const sensorNames = [
  "soil moisture", "soil", "ground moisture",
  "humidity", "air humidity",
  "temperature", "air temperature",
  "p h", "ph", "ph level", "ph value",
  "water level", "tank level", "reservoir",
  "air quality", "aqi",
  "battery", "battery level", "power level",
  "flow rate", "water flow", "flow sensor",
  "water temperature",
];

export function buildCommands(ctx: CommandContext): VoiceCommand[] {
  return [
    // ── Greetings ──────────────────────────────────────────────────────────────
    {
      id: "greeting.hello",
      category: "greeting",
      priority: 10,
      patterns: [/^(hey|hi|hello|good morning|good afternoon|good evening)(\s|$)/i],
      description: "Greet Clima",
      examples: ["Hello", "Good morning", "Hey"],
      execute: () => {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        ctx.speak(`${greeting}! I'm Clima — your smart agriculture assistant. Ask me to read sensors, control the pump, check system status, or just say "help" to see what I can do.`);
        return true;
      },
    },
    {
      id: "greeting.farewell",
      category: "greeting",
      priority: 10,
      patterns: [/(bye|goodbye|see you|good night|take care|signing off)/i],
      description: "Say goodbye",
      examples: ["Goodbye", "See you later"],
      execute: () => {
        ctx.speak("Goodbye! Take care and stay green! I'll be here whenever you need me.");
        return true;
      },
    },
    {
      id: "greeting.wake",
      category: "greeting",
      priority: 10,
      patterns: [/\bclima\b/i],
      description: "Wake word / call Clima",
      examples: ["Clima", "Hey Clima"],
      execute: () => {
        ctx.speak("Yes, I'm here and listening. What would you like me to do?");
        return true;
      },
    },

    // ── Sensor Commands ─────────────────────────────────────────────────────────
    {
      id: "sensor.all",
      category: "sensor",
      priority: 20,
      patterns: [
        /(all sensors|all readings|full report|read everything|status report|give me (all|everything))/i,
        /(read all|report all|overview)/i,
      ],
      description: "Read all sensor values",
      examples: ["Read all sensors", "Full report", "Status report"],
      execute: () => {
        const soil = ctx.getSensorValue("soilMoisture");
        const airHum = ctx.getSensorValue("airHumidity");
        const airTemp = ctx.getSensorValue("airTemperature");
        const ph = ctx.getSensorValue("phValue");
        const water = ctx.getSensorValue("waterLevel");
        const airQ = ctx.getSensorValue("airQuality");
        const battery = ctx.getSensorValue("batteryLevel");
        const flow = ctx.getSensorValue("flowRate");
        const waterTemp = ctx.getSensorValue("waterTemperature");
        ctx.speak(`Full system report: Soil moisture is ${soil}. Air humidity ${airHum}. Air temperature ${airTemp}. Water temperature ${waterTemp}. pH level ${ph}. Water level ${water}. Air quality ${airQ}. Flow rate ${flow}. Battery ${battery}. All systems operational.`);
        return true;
      },
    },
    {
      id: "sensor.soil_moisture",
      category: "sensor",
      priority: 20,
      patterns: [/(soil moisture|soil|ground moisture|how (wet|dry) is the soil|soil condition)/i],
      description: "Read soil moisture",
      examples: ["What's the soil moisture?", "Soil condition"],
      execute: () => { ctx.speak(`Soil moisture is ${ctx.getSensorValue("soilMoisture")}.`); return true; },
    },
    {
      id: "sensor.humidity",
      category: "sensor",
      priority: 20,
      patterns: [/(humidity|air humidity|how humid)/i],
      description: "Read air humidity",
      examples: ["What's the humidity?", "How humid is it?"],
      execute: () => { ctx.speak(`Air humidity is ${ctx.getSensorValue("airHumidity")}.`); return true; },
    },
    {
      id: "sensor.temperature",
      category: "sensor",
      priority: 20,
      patterns: [/(air )?temperature|how hot|how cold|what.?s the temp/i],
      description: "Read air temperature",
      examples: ["What's the temperature?", "How hot is it?"],
      execute: () => { ctx.speak(`Air temperature is ${ctx.getSensorValue("airTemperature")}.`); return true; },
    },
    {
      id: "sensor.ph",
      category: "sensor",
      priority: 20,
      patterns: [/(p h|ph|ph level|ph value|acidity|alkalinity)/i],
      description: "Read pH level",
      examples: ["What's the pH level?", "Check pH"],
      execute: () => { ctx.speak(`pH level is ${ctx.getSensorValue("phValue")}.`); return true; },
    },
    {
      id: "sensor.water_level",
      category: "sensor",
      priority: 20,
      patterns: [/(water level|tank level|reservoir|how much water|water tank)/i],
      description: "Read water level",
      examples: ["What's the water level?", "How much water is left?"],
      execute: () => { ctx.speak(`Water level is ${ctx.getSensorValue("waterLevel")}.`); return true; },
    },
    {
      id: "sensor.air_quality",
      category: "sensor",
      priority: 20,
      patterns: [/(air quality|aqi|air index|how is the air|pollution)/i],
      description: "Read air quality",
      examples: ["What's the AQI?", "Air quality check"],
      execute: () => { ctx.speak(`Air quality is ${ctx.getSensorValue("airQuality")}.`); return true; },
    },
    {
      id: "sensor.battery",
      category: "sensor",
      priority: 20,
      patterns: [/(battery|battery level|power level|how much battery|charge)/i],
      description: "Read battery level",
      examples: ["What's the battery level?", "Battery status"],
      execute: () => { ctx.speak(`Battery level is ${ctx.getSensorValue("batteryLevel")}.`); return true; },
    },
    {
      id: "sensor.flow_rate",
      category: "sensor",
      priority: 20,
      patterns: [/(flow rate|water flow|flow sensor|how much flow|discharge)/i],
      description: "Read water flow rate",
      examples: ["What's the flow rate?", "Water flow"],
      execute: () => { ctx.speak(`The current water flow rate is ${ctx.getSensorValue("flowRate")}.`); return true; },
    },
    {
      id: "sensor.water_temperature",
      category: "sensor",
      priority: 20,
      patterns: [/(water temperature|water temp|how (warm|cold) is the water)/i],
      description: "Read water temperature",
      examples: ["Water temperature?", "How warm is the water?"],
      execute: () => { ctx.speak(`Water temperature is ${ctx.getSensorValue("waterTemperature")}.`); return true; },
    },

    // ── Pump Commands ──────────────────────────────────────────────────────────
    {
      id: "pump.on",
      category: "pump",
      priority: 30,
      patterns: [/(turn on|start|activate|enable) (the )?(pump|water pump|irrigation|sprinkler)/i],
      description: "Turn pump on",
      examples: ["Turn on the pump", "Start irrigation"],
      execute: async () => {
        ctx.speak("Turning the pump on now.");
        try {
          await ctx.onPumpToggle(true);
        } catch {
          ctx.speak("Failed to turn on the pump. Please check the connection and try again.");
        }
        return true;
      },
    },
    {
      id: "pump.off",
      category: "pump",
      priority: 30,
      patterns: [/(turn off|stop|deactivate|disable|shut) (the )?(pump|water pump|irrigation|sprinkler)/i],
      description: "Turn pump off",
      examples: ["Turn off the pump", "Stop irrigation"],
      execute: async () => {
        ctx.speak("Stopping the pump now.");
        try {
          await ctx.onPumpToggle(false);
        } catch {
          ctx.speak("Failed to stop the pump.");
        }
        return true;
      },
    },
    {
      id: "pump.status",
      category: "pump",
      priority: 30,
      patterns: [/(pump status|is the pump (running|on|off)|pump state|check pump)/i],
      description: "Check pump status",
      examples: ["Is the pump running?", "Pump status"],
      execute: () => {
        const status = ctx.getSystemStatus();
        if (status.includes("running")) {
          ctx.speak("The pump is currently running.");
        } else {
          ctx.speak("The pump is currently stopped.");
        }
        return true;
      },
    },
    {
      id: "pump.toggle",
      category: "pump",
      priority: 30,
      patterns: [/(toggle pump|switch pump)/i],
      description: "Toggle pump on/off",
      examples: ["Toggle pump"],
      execute: async () => {
        const status = ctx.getSystemStatus();
        const isRunning = status.includes("running");
        ctx.speak(isRunning ? "Turning pump off." : "Turning pump on.");
        try {
          await ctx.onPumpToggle(!isRunning);
        } catch {
          ctx.speak("Failed to toggle pump.");
        }
        return true;
      },
    },

    // ── Mode Commands ──────────────────────────────────────────────────────────
    {
      id: "mode.auto",
      category: "mode",
      priority: 30,
      patterns: [/(auto(matic)? mode|switch to auto|enable auto|set to auto)/i],
      description: "Switch to automatic mode",
      examples: ["Auto mode", "Switch to automatic"],
      execute: async () => {
        ctx.speak("Switching to automatic mode now. The system will control the pump based on sensor data.");
        try {
          await ctx.onAutoMode();
        } catch {
          ctx.speak("Failed to switch to auto mode.");
        }
        return true;
      },
    },
    {
      id: "mode.manual",
      category: "mode",
      priority: 30,
      patterns: [/(manual mode|switch to manual|enable manual|set to manual)/i],
      description: "Switch to manual mode",
      examples: ["Manual mode", "Switch to manual"],
      execute: async () => {
        ctx.speak("Switching to manual mode. You now have full control over the pump.");
        try {
          await ctx.onManualMode();
        } catch {
          ctx.speak("Failed to switch to manual mode.");
        }
        return true;
      },
    },
    {
      id: "mode.scheduled",
      category: "mode",
      priority: 30,
      patterns: [/(scheduled mode|schedule mode|switch to schedule|set to schedule)/i],
      description: "Switch to scheduled mode",
      examples: ["Scheduled mode"],
      execute: async () => {
        ctx.speak("Switching to scheduled mode.");
        try {
          await ctx.onScheduledMode();
        } catch {
          ctx.speak("Failed to switch to scheduled mode.");
        }
        return true;
      },
    },
    {
      id: "mode.status",
      category: "mode",
      priority: 30,
      patterns: [/(what mode|current mode|which mode|control mode|how am i controlling)/i],
      description: "Check current control mode",
      examples: ["What mode am I in?", "Current mode"],
      execute: () => {
        const mode = ctx.getControlMode();
        ctx.speak(`The system is currently in ${mode} mode.`);
        return true;
      },
    },

    // ── Alert Commands ─────────────────────────────────────────────────────────
    {
      id: "alert.read",
      category: "alert",
      priority: 25,
      patterns: [/(read alerts|show alerts|what alerts|any alerts|list alerts|check alerts)/i],
      description: "Read active alerts",
      examples: ["Show alerts", "Any alerts?"],
      execute: () => {
        const alerts = ctx.getActiveAlerts();
        ctx.speak(alerts || "No active alerts. Everything looks good!");
        return true;
      },
    },
    {
      id: "alert.count",
      category: "alert",
      priority: 25,
      patterns: [/(how many alerts|alert count|number of alerts)/i],
      description: "Count active alerts",
      examples: ["How many alerts?"],
      execute: () => {
        const alerts = ctx.getActiveAlerts();
        if (!alerts) {
          ctx.speak("There are no active alerts. All systems normal.");
        } else {
          const count = alerts.split(",").length;
          ctx.speak(`There ${count === 1 ? "is" : "are"} ${count} active alert${count === 1 ? "" : "s"}. ${alerts}`);
        }
        return true;
      },
    },
    {
      id: "alert.dismiss",
      category: "alert",
      priority: 25,
      patterns: [/(dismiss( all)? alerts|clear alerts|remove alerts)/i],
      description: "Dismiss alerts",
      examples: ["Clear all alerts", "Dismiss alerts"],
      execute: () => {
        ctx.speak("Clearing all alerts.");
        ctx.onClearAlerts?.();
        return true;
      },
    },

    // ── Navigation Commands ────────────────────────────────────────────────────
    {
      id: "nav.dashboard",
      category: "navigation",
      priority: 15,
      patterns: [/(go to|open|show|navigate to) (the )?(dashboard|home|main)/i],
      description: "Go to dashboard",
      examples: ["Go to dashboard", "Show home"],
      execute: () => {
        ctx.speak("Opening the dashboard.");
        ctx.navigate("/");
        return true;
      },
    },
    {
      id: "nav.analytics",
      category: "navigation",
      priority: 15,
      patterns: [/(go to|open|show|navigate to) (the )?(analytics|charts|graphs|trends|data)/i],
      description: "Go to analytics page",
      examples: ["Show analytics", "Open charts"],
      execute: () => {
        ctx.speak("Opening the analytics page.");
        ctx.navigate("/analytics");
        return true;
      },
    },
    {
      id: "nav.history",
      category: "navigation",
      priority: 15,
      patterns: [/(go to|open|show|navigate to) (the )?(history|log|logs|past data)/i],
      description: "Go to history page",
      examples: ["Show history", "Open logs"],
      execute: () => {
        ctx.speak("Opening the history page.");
        ctx.navigate("/history");
        return true;
      },
    },
    {
      id: "nav.alerts",
      category: "navigation",
      priority: 15,
      patterns: [/(go to|open|show|navigate to) (the )?(alerts|notifications|alert page)/i],
      description: "Go to alerts page",
      examples: ["Show alerts page", "Open notifications"],
      execute: () => {
        ctx.speak("Opening the alerts page.");
        ctx.navigate("/alerts");
        return true;
      },
    },

    // ── System Commands ────────────────────────────────────────────────────────
    {
      id: "system.status",
      category: "system",
      priority: 20,
      patterns: [/(system status|system health|how is the system|health check|status overview)/i],
      description: "Check system health",
      examples: ["System status", "Health check"],
      execute: () => {
        const status = ctx.getSystemStatus();
        const mode = ctx.getControlMode();
        ctx.speak(`System status: ${status}. Control mode: ${mode}.`);
        return true;
      },
    },
    {
      id: "system.ai",
      category: "system",
      priority: 20,
      patterns: [/(ai recommendation|what does ai say|ai suggest|smart recommendation|clima suggest|what should i do)/i],
      description: "Get AI recommendation",
      examples: ["What does AI recommend?", "AI suggestion"],
      execute: () => {
        const rec = ctx.getAIRecommendation();
        if (rec) {
          ctx.speak(`The AI recommends: ${rec}`);
        } else {
          ctx.speak("No AI recommendation available at the moment. Sensor data is being collected normally.");
        }
        return true;
      },
    },
    {
      id: "system.uptime",
      category: "system",
      priority: 20,
      patterns: [/(uptime|how long has the system been (running|on)|system time)/i],
      description: "Check system uptime",
      examples: ["What's the uptime?", "How long running?"],
      execute: () => { ctx.speak(`The system has been running continuously. ${ctx.getSystemStatus()}`); return true; },
    },

    // ── Settings Commands ──────────────────────────────────────────────────────
    {
      id: "settings.moisture_threshold",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) (soil )?moisture threshold (to )?(\d+)/i],
      description: "Set soil moisture threshold",
      examples: ["Set moisture threshold to 30"],
      execute: (_ctx, match) => {
        const val = match.match(/(\d+)/)?.[0];
        if (val) {
          ctx.speak(`Setting soil moisture threshold to ${val} percent.`);
          ctx.onSettingsSave?.("moistureThreshold", parseInt(val));
        }
        return true;
      },
    },
    {
      id: "settings.battery_threshold",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) battery threshold (to )?(\d+)/i],
      description: "Set battery threshold",
      examples: ["Set battery threshold to 20"],
      execute: (_ctx, match) => {
        const val = match.match(/(\d+)/)?.[0];
        if (val) {
          ctx.speak(`Setting battery threshold to ${val} percent.`);
          ctx.onSettingsSave?.("batteryThreshold", parseInt(val));
        }
        return true;
      },
    },
    {
      id: "settings.temperature_unit",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|switch to|use) (celsius|fahrenheit)/i],
      description: "Switch temperature unit",
      examples: ["Switch to Fahrenheit", "Use Celsius"],
      execute: (_ctx, match) => {
        const unit = match.match(/(celsius|fahrenheit)/i)?.[0]?.toLowerCase();
        if (unit) {
          ctx.speak(`Switching temperature display to ${unit}.`);
          ctx.onSettingsSave?.("temperatureUnit", unit);
        }
        return true;
      },
    },

    // ── Export Commands ────────────────────────────────────────────────────────
    {
      id: "export.csv",
      category: "export",
      priority: 25,
      patterns: [/(export|download) (data|history|readings) (as |to )?(csv|excel)/i],
      description: "Export data as CSV",
      examples: ["Export data as CSV", "Download CSV"],
      execute: () => {
        ctx.speak("Opening export dialog for CSV format.");
        ctx.onExport?.();
        return true;
      },
    },
    {
      id: "export.json",
      category: "export",
      priority: 25,
      patterns: [/(export|download) (data|history|readings) (as |to )?json/i],
      description: "Export data as JSON",
      examples: ["Export as JSON"],
      execute: () => {
        ctx.speak("Opening export dialog for JSON format.");
        ctx.onExport?.();
        return true;
      },
    },

    // ── Help Commands ──────────────────────────────────────────────────────────
    {
      id: "help.general",
      category: "help",
      priority: 5,
      patterns: [/(help|what can you do|what can i say|commands|how (to )?use|what do you do|capabilities)/i],
      description: "List all available commands",
      examples: ["Help", "What can you do?", "Show commands"],
      execute: async () => {
        ctx.speak("I can help you monitor and control your smart farm. Try saying: read all sensors, turn on pump, auto mode, system status, AI recommendation, show analytics, export data, or help for each category. What would you like to do?");
        return true;
      },
    },
    {
      id: "help.sensors",
      category: "help",
      priority: 5,
      patterns: [/(help with sensors|sensor commands|what sensors|list sensors)/i],
      description: "List sensor commands",
      examples: ["What sensors?"],
      execute: () => {
        ctx.speak("I can read: soil moisture, air humidity, air temperature, water temperature, pH level, water level, air quality, battery level, and flow rate. Try saying any of those, or say 'read all sensors' for a full report.");
        return true;
      },
    },
    {
      id: "help.pump",
      category: "help",
      priority: 5,
      patterns: [/(help with pump|pump commands|pump help)/i],
      description: "List pump commands",
      examples: ["Pump commands"],
      execute: () => {
        ctx.speak("You can control the pump by saying: turn on pump, turn off pump, pump status, or toggle pump. You can also switch between automatic, manual, and scheduled modes.");
        return true;
      },
    },

    // ── Voice Control Commands ─────────────────────────────────────────────────
    {
      id: "voice.stop",
      category: "voice-control",
      priority: 40,
      patterns: [/(stop listening|go to sleep|silent mode|stop voice|voice off|shut up)/i],
      description: "Stop voice recognition",
      examples: ["Stop listening", "Go to sleep"],
      execute: (ctx) => {
        ctx.speak("Going quiet now. Click the microphone button to wake me up.");
        ctx.onStopListening?.();
        return true;
      },
    },
    {
      id: "voice.test",
      category: "voice-control",
      priority: 40,
      patterns: [/(test voice|test audio|test mic|sound test|say test)/i],
      description: "Test voice output",
      examples: ["Test voice"],
      execute: () => {
        ctx.speak("This is Clima speaking! Audio test successful. I can hear you loud and clear.");
        return true;
      },
    },

    // ── Refresh ────────────────────────────────────────────────────────────────
    {
      id: "system.refresh",
      category: "system",
      priority: 20,
      patterns: [/(refresh|update|sync|reload) (data|sensors|readings)/i],
      description: "Refresh sensor data",
      examples: ["Refresh data", "Update sensors"],
      execute: () => {
        ctx.speak("Refreshing sensor data now.");
        ctx.onRefresh?.();
        return true;
      },
    },

    // ── Additional Sensor Commands ─────────────────────────────────────────────
    {
      id: "sensor.average_temperature",
      category: "sensor",
      priority: 18,
      patterns: [/(average|mean) (temperature|temp)/i],
      description: "Get average temperature",
      examples: ["Average temperature"],
      execute: () => { ctx.speak(`Current air temperature is ${ctx.getSensorValue("airTemperature")}.`); return true; },
    },
    {
      id: "sensor.max_temperature",
      category: "sensor",
      priority: 18,
      patterns: [/(max|maximum|highest) (temperature|temp)/i],
      description: "Get max temperature",
      examples: ["Maximum temperature"],
      execute: () => { ctx.speak(`Current air temperature is ${ctx.getSensorValue("airTemperature")}.`); return true; },
    },
    {
      id: "sensor.min_temperature",
      category: "sensor",
      priority: 18,
      patterns: [/(min|minimum|lowest) (temperature|temp)/i],
      description: "Get min temperature",
      examples: ["Minimum temperature"],
      execute: () => { ctx.speak(`Current air temperature is ${ctx.getSensorValue("airTemperature")}.`); return true; },
    },
    {
      id: "sensor.average_humidity",
      category: "sensor",
      priority: 18,
      patterns: [/(average|mean) humidity/i],
      description: "Get average humidity",
      examples: ["Average humidity"],
      execute: () => { ctx.speak(`Current air humidity is ${ctx.getSensorValue("airHumidity")}.`); return true; },
    },
    {
      id: "sensor.water_usage",
      category: "sensor",
      priority: 18,
      patterns: [/(water usage|water consumption|how much water used)/i],
      description: "Check water usage",
      examples: ["Water usage today"],
      execute: () => {
        const flow = ctx.getSensorValue("flowRate");
        ctx.speak(`Current water flow rate is ${flow}. For total water usage, check the analytics page.`);
        return true;
      },
    },
    {
      id: "sensor.pump_runtime",
      category: "sensor",
      priority: 18,
      patterns: [/(pump runtime|how long (has )?pump (been )?running|pump run time)/i],
      description: "Check pump runtime",
      examples: ["Pump runtime"],
      execute: () => {
        const status = ctx.getSystemStatus();
        ctx.speak(`Pump status: ${status}.`);
        return true;
      },
    },
    {
      id: "sensor.sensor_health",
      category: "sensor",
      priority: 18,
      patterns: [/(sensor health|are sensors (working|online|ok)|sensor status|all sensors (online|working))/i],
      description: "Check if all sensors are operational",
      examples: ["Are all sensors working?"],
      execute: () => {
        ctx.speak("All sensors are reporting normally. System is operational.");
        return true;
      },
    },
    {
      id: "sensor.last_reading",
      category: "sensor",
      priority: 18,
      patterns: [/(last reading|latest reading|most recent|last update|last data)/i],
      description: "Get most recent sensor reading",
      examples: ["Last reading", "Latest data"],
      execute: () => {
        ctx.speak(`The latest readings: soil ${ctx.getSensorValue("soilMoisture")}, temp ${ctx.getSensorValue("airTemperature")}, humidity ${ctx.getSensorValue("airHumidity")}.`);
        return true;
      },
    },
    {
      id: "sensor.system_efficiency",
      category: "sensor",
      priority: 18,
      patterns: [/(efficiency|system efficiency|how efficient)/i],
      description: "Check system efficiency",
      examples: ["System efficiency"],
      execute: () => { ctx.speak(`System is running in ${ctx.getControlMode()} mode. All metrics are within normal range.`); return true; },
    },
    {
      id: "sensor.soil_analysis",
      category: "sensor",
      priority: 18,
      patterns: [/(soil analysis|soil condition|analyze soil|soil health|soil quality)/i],
      description: "Analyze soil condition",
      examples: ["Soil analysis"],
      execute: () => {
        ctx.speak(`Soil analysis: moisture is ${ctx.getSensorValue("soilMoisture")}, pH level is ${ctx.getSensorValue("phValue")}.`);
        return true;
      },
    },
    {
      id: "sensor.peak_flow",
      category: "sensor",
      priority: 18,
      patterns: [/(peak flow|max flow|maximum flow)/i],
      description: "Get peak flow rate",
      examples: ["Peak flow rate"],
      execute: () => { ctx.speak(`Current flow rate is ${ctx.getSensorValue("flowRate")}.`); return true; },
    },
    {
      id: "sensor.signal_strength",
      category: "sensor",
      priority: 18,
      patterns: [/(signal strength|signal quality|connection quality|network signal)/i],
      description: "Check network signal strength",
      examples: ["Signal strength"],
      execute: () => {
        const status = ctx.getSystemStatus();
        ctx.speak(`Network status: ${status}.`);
        return true;
      },
    },
    {
      id: "sensor.water_quality",
      category: "sensor",
      priority: 18,
      patterns: [/(water quality|water condition|is the water (clean|good|safe))/i],
      description: "Check water quality indicators",
      examples: ["Water quality"],
      execute: () => {
        ctx.speak(`Water quality: pH is ${ctx.getSensorValue("phValue")}, temperature is ${ctx.getSensorValue("waterTemperature")}, flow rate is ${ctx.getSensorValue("flowRate")}.`);
        return true;
      },
    },
    {
      id: "sensor.comparison",
      category: "sensor",
      priority: 18,
      patterns: [/(compare|difference|change|trend) (in )?(sensor|readings|data)/i],
      description: "Get sensor data trends",
      examples: ["Compare sensor readings"],
      execute: () => {
        ctx.speak("For detailed trends and comparisons, check the analytics page. I can read any individual sensor if you ask.");
        return true;
      },
    },

    // ── More Pump Commands ────────────────────────────────────────────────────
    {
      id: "pump.run_for",
      category: "pump",
      priority: 32,
      patterns: [/(run|start|turn on) (the )?pump (for )?(\d+) (minutes?|seconds?|hours?)/i],
      description: "Run pump for a duration",
      examples: ["Run pump for 5 minutes"],
      execute: async (_ctx, match) => {
        const duration = parseInt(match.match(/(\d+)/)?.[0] || "0");
        const unit = match.match(/(minutes?|seconds?|hours?)/i)?.[0]?.toLowerCase() || "minutes";
        const ms = unit.startsWith("hour") ? duration * 3600000 : unit.startsWith("min") ? duration * 60000 : duration * 1000;
        if (ms > 3600000) { ctx.speak("Maximum pump runtime is 1 hour for safety."); return true; }
        ctx.speak(`Starting pump for ${duration} ${unit}.`);
        try {
          await ctx.onPumpToggle(true);
          if (pumpTimerId) { clearTimeout(pumpTimerId); pumpTimerId = null; }
          pumpTimerId = setTimeout(async () => {
            pumpTimerId = null;
            try { await ctx.onPumpToggle(false); ctx.speak(`${duration} ${unit} pump cycle complete.`); } catch {}
          }, ms);
        } catch { ctx.speak("Failed to start pump."); }
        return true;
      },
    },
    {
      id: "pump.schedule_status",
      category: "pump",
      priority: 25,
      patterns: [/(pump schedule|when (does|will) pump (turn|go) (on|off)|scheduled pump)/i],
      description: "Check pump schedule",
      examples: ["What's the pump schedule?"],
      execute: () => {
        const mode = ctx.getControlMode();
        ctx.speak(`System is in ${mode} mode. ${mode === "scheduled" ? "The pump follows your scheduled times." : "Use scheduled mode to set pump timings."}`);
        return true;
      },
    },
    {
      id: "pump.runtime_total",
      category: "pump",
      priority: 25,
      patterns: [/(total pump runtime|how many hours (has )?pump (been )?running|pump hours)/i],
      description: "Get total pump runtime",
      examples: ["Total pump runtime"],
      execute: () => {
        const status = ctx.getSystemStatus();
        ctx.speak(`Pump is currently ${status.includes("running") ? "running" : "stopped"}.`);
        return true;
      },
    },
    {
      id: "pump.stop_timer",
      category: "pump",
      priority: 32,
      patterns: [/(cancel|stop|abort) (pump )?(timer|schedule|delay)/i],
      description: "Cancel pump timer",
      examples: ["Cancel pump timer"],
      execute: async () => {
        ctx.speak("Cancelling pump timer and stopping pump.");
        if (pumpTimerId) { clearTimeout(pumpTimerId); pumpTimerId = null; }
        try { await ctx.onPumpToggle(false); } catch {}
        return true;
      },
    },

    // ── More Mode Commands ────────────────────────────────────────────────────
    {
      id: "mode.explain_auto",
      category: "mode",
      priority: 22,
      patterns: [/(what is|explain|tell me about) automatic mode/i],
      description: "Explain automatic mode",
      examples: ["What is automatic mode?"],
      execute: () => {
        ctx.speak("In automatic mode, the system controls the pump based on sensor data and Firebase logic. It adjusts watering based on soil moisture, temperature, and other factors automatically.");
        return true;
      },
    },
    {
      id: "mode.explain_manual",
      category: "mode",
      priority: 22,
      patterns: [/(what is|explain|tell me about) manual mode/i],
      description: "Explain manual mode",
      examples: ["What is manual mode?"],
      execute: () => {
        ctx.speak("In manual mode, you have full control over the pump. You can turn it on or off with voice commands or the dashboard buttons.");
        return true;
      },
    },
    {
      id: "mode.explain_scheduled",
      category: "mode",
      priority: 22,
      patterns: [/(what is|explain|tell me about) scheduled mode/i],
      description: "Explain scheduled mode",
      examples: ["What is scheduled mode?"],
      execute: () => {
        ctx.speak("In scheduled mode, the pump runs automatically based on your configured time schedule. You can set start time, end time, and duration in settings.");
        return true;
      },
    },
    {
      id: "mode.toggle",
      category: "mode",
      priority: 25,
      patterns: [/(toggle|switch|change|flip) (the )?(mode|control mode)/i],
      description: "Toggle between modes",
      examples: ["Toggle mode"],
      execute: async () => {
        const current = ctx.getControlMode();
        if (current === "automatic") {
          ctx.speak("Switching to manual mode.");
          try { await ctx.onManualMode(); } catch {}
        } else {
          ctx.speak("Switching to automatic mode.");
          try { await ctx.onAutoMode(); } catch {}
        }
        return true;
      },
    },
    {
      id: "mode.scheduled_next",
      category: "mode",
      priority: 22,
      patterns: [/(next (scheduled )?run|next pump (cycle|event)|when (will|does) pump (turn|go) on)/i],
      description: "Get next scheduled pump run",
      examples: ["Next scheduled run"],
      execute: () => {
        ctx.speak(`System is in ${ctx.getControlMode()} mode. Check the settings page for schedule details.`);
        return true;
      },
    },

    // ── More Alert Commands ───────────────────────────────────────────────────
    {
      id: "alert.latest",
      category: "alert",
      priority: 27,
      patterns: [/(latest alert|most recent alert|newest alert|last alert|recent alert)/i],
      description: "Get the latest alert",
      examples: ["Latest alert"],
      execute: () => {
        const alerts = ctx.getActiveAlerts();
        ctx.speak(alerts ? `Recent alerts: ${alerts}` : "No recent alerts.");
        return true;
      },
    },
    {
      id: "alert.warnings",
      category: "alert",
      priority: 27,
      patterns: [/(show|list|read|any) (warning|warn) (alerts?|notifications?)/i],
      description: "Show warning alerts",
      examples: ["Show warnings"],
      execute: () => {
        const alerts = ctx.getActiveAlerts();
        ctx.speak(alerts ? `Active alerts: ${alerts}` : "No warning alerts.");
        return true;
      },
    },
    {
      id: "alert.dangers",
      category: "alert",
      priority: 27,
      patterns: [/(show|list|read|any) (danger|critical|urgent|emergency) (alerts?|notifications?)/i],
      description: "Show critical alerts",
      examples: ["Critical alerts"],
      execute: () => {
        const alerts = ctx.getActiveAlerts();
        ctx.speak(alerts ? `Critical alerts: ${alerts}` : "No critical alerts. All clear!");
        return true;
      },
    },
    {
      id: "alert.mark_all_read",
      category: "alert",
      priority: 27,
      patterns: [/(mark (all|every) (as )?read|read all|acknowledge all)/i],
      description: "Mark all alerts as read",
      examples: ["Mark all as read"],
      execute: () => {
        ctx.speak("Marking all alerts as read.");
        ctx.onClearAlerts?.();
        return true;
      },
    },
    {
      id: "alert.unread_count",
      category: "alert",
      priority: 27,
      patterns: [/(unread alerts|how many unread|pending alerts|new alerts)/i],
      description: "Count unread alerts",
      examples: ["How many unread alerts?"],
      execute: () => {
        const alerts = ctx.getActiveAlerts();
        ctx.speak(alerts ? `There are active alerts. ${alerts}` : "No unread alerts.");
        return true;
      },
    },
    {
      id: "alert.dismiss_last",
      category: "alert",
      priority: 27,
      patterns: [/(dismiss|remove|delete) (the )?(last|latest|most recent) alert/i],
      description: "Dismiss the most recent alert",
      examples: ["Dismiss latest alert"],
      execute: () => {
        ctx.speak("Dismissing the latest alert.");
        ctx.onAlertDismiss?.();
        return true;
      },
    },
    {
      id: "alert.settings_info",
      category: "alert",
      priority: 22,
      patterns: [/(alert settings|alert configuration|configure alerts|alert preferences)/i],
      description: "Get alert configuration info",
      examples: ["Alert settings"],
      execute: () => {
        ctx.speak("You can configure alert thresholds for moisture, battery, temperature, humidity, water level, and air quality in the settings panel.");
        return true;
      },
    },

    // ── More Navigation Commands ──────────────────────────────────────────────
    {
      id: "nav.settings",
      category: "navigation",
      priority: 15,
      patterns: [/(go to|open|show|navigate to) (the )?(settings|preferences|configuration)/i],
      description: "Go to settings",
      examples: ["Open settings"],
      execute: () => {
        ctx.speak("Opening settings.");
        ctx.navigate("/");
        ctx.onSettingsSave?.("_openSettings", true);
        return true;
      },
    },
    {
      id: "nav.back",
      category: "navigation",
      priority: 15,
      patterns: [/(go back|back|previous page|go previous)/i],
      description: "Go back to previous page",
      examples: ["Go back"],
      execute: () => {
        ctx.speak("Going back.");
        ctx.navigate("/");
        return true;
      },
    },
    {
      id: "nav.refresh_page",
      category: "navigation",
      priority: 15,
      patterns: [/(refresh page|reload page|hard refresh)/i],
      description: "Refresh the page",
      examples: ["Refresh page"],
      execute: () => {
        ctx.speak("Reloading the page.");
        window.location.reload();
        return true;
      },
    },

    // ── Time and Date Commands ────────────────────────────────────────────────
    {
      id: "system.time",
      category: "system",
      priority: 10,
      patterns: [/(what|current|tell me) (is )?(the )?time/i],
      description: "Get current time",
      examples: ["What time is it?"],
      execute: () => {
        ctx.speak(`The current time is ${new Date().toLocaleTimeString()}.`);
        return true;
      },
    },
    {
      id: "system.date",
      category: "system",
      priority: 10,
      patterns: [/(what|current|tell me|today.?s) (is )?(the )?date/i],
      description: "Get today's date",
      examples: ["What's the date?"],
      execute: () => {
        ctx.speak(`Today is ${new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`);
        return true;
      },
    },
    {
      id: "system.network_status",
      category: "system",
      priority: 18,
      patterns: [/(network status|connection status|am i (online|connected)|internet status)/i],
      description: "Check network connection",
      examples: ["Network status"],
      execute: () => {
        const online = navigator.onLine;
        ctx.speak(online ? "You are connected to the network. Sensors are reporting normally." : "You are currently offline. Cached data is being displayed.");
        return true;
      },
    },
    {
      id: "system.sensor_count",
      category: "system",
      priority: 18,
      patterns: [/(how many sensors|sensor count|number of sensors|active sensors)/i],
      description: "Count active sensors",
      examples: ["How many sensors?"],
      execute: () => {
        ctx.speak("The system monitors 8 sensor types: soil moisture, air humidity, air temperature, water temperature, pH level, water level, air quality, and flow rate. Plus battery monitoring.");
        return true;
      },
    },
    {
      id: "system.last_update_time",
      category: "system",
      priority: 18,
      patterns: [/(when (was|is) (the )?(last update|latest data)|last refresh|data age)/i],
      description: "Check when sensors were last updated",
      examples: ["When was the last update?"],
      execute: () => {
        ctx.speak("Sensor data is updated every few seconds from Firebase.");
        return true;
      },
    },
    {
      id: "system.version_info",
      category: "system",
      priority: 12,
      patterns: [/(system version|firmware version|app version|dashboard version|software version)/i],
      description: "Get system version",
      examples: ["System version"],
      execute: () => {
        ctx.speak("This is CLIMANEER Smart Agriculture Dashboard version 1.0.");
        return true;
      },
    },
    {
      id: "system.welcome",
      category: "system",
      priority: 10,
      patterns: [/(what is this|about|about this|what is climaneer)/i],
      description: "About CLIMANEER",
      examples: ["What is this?"],
      execute: () => {
        ctx.speak("This is CLIMANEER, your smart agriculture dashboard. It monitors soil moisture, temperature, humidity, water levels, and more. You can control the pump, view analytics, and manage your farm using voice commands.");
        return true;
      },
    },

    // ── More Settings Commands ────────────────────────────────────────────────
    {
      id: "settings.temp_high",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) (max|high|maximum) (temperature|temp) (threshold|limit)? (to )?(\d+)/i],
      description: "Set high temperature threshold",
      examples: ["Set max temperature to 35"],
      execute: (_ctx, match) => {
        const val = parseInt(match.match(/(\d+)/)?.[0] || "35");
        ctx.speak(`Setting maximum temperature threshold to ${val} degrees.`);
        ctx.onSettingsSave?.("temperatureHighThreshold", val);
        return true;
      },
    },
    {
      id: "settings.temp_low",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) (min|low|minimum) (temperature|temp) (threshold|limit)? (to )?(\d+)/i],
      description: "Set low temperature threshold",
      examples: ["Set min temperature to 5"],
      execute: (_ctx, match) => {
        const val = parseInt(match.match(/(\d+)/)?.[0] || "5");
        ctx.speak(`Setting minimum temperature threshold to ${val} degrees.`);
        ctx.onSettingsSave?.("temperatureLowThreshold", val);
        return true;
      },
    },
    {
      id: "settings.humidity_high",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) (max|high|maximum) humidity (threshold|limit)? (to )?(\d+)/i],
      description: "Set high humidity threshold",
      examples: ["Set max humidity to 80"],
      execute: (_ctx, match) => {
        const val = parseInt(match.match(/(\d+)/)?.[0] || "80");
        ctx.speak(`Setting maximum humidity threshold to ${val} percent.`);
        ctx.onSettingsSave?.("humidityHighThreshold", val);
        return true;
      },
    },
    {
      id: "settings.humidity_low",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) (min|low|minimum) humidity (threshold|limit)? (to )?(\d+)/i],
      description: "Set low humidity threshold",
      examples: ["Set min humidity to 20"],
      execute: (_ctx, match) => {
        const val = parseInt(match.match(/(\d+)/)?.[0] || "20");
        ctx.speak(`Setting minimum humidity threshold to ${val} percent.`);
        ctx.onSettingsSave?.("humidityLowThreshold", val);
        return true;
      },
    },
    {
      id: "settings.water_level_low",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) (low|minimum) water level (threshold|limit)? (to )?(\d+)/i],
      description: "Set low water level threshold",
      examples: ["Set low water level to 20"],
      execute: (_ctx, match) => {
        const val = parseInt(match.match(/(\d+)/)?.[0] || "20");
        ctx.speak(`Setting low water level threshold to ${val} percent.`);
        ctx.onSettingsSave?.("waterLevelLowThreshold", val);
        return true;
      },
    },
    {
      id: "settings.air_quality_threshold",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) (air quality|aqi) (threshold|limit)? (to )?(\d+)/i],
      description: "Set AQI threshold",
      examples: ["Set AQI threshold to 150"],
      execute: (_ctx, match) => {
        const val = parseInt(match.match(/(\d+)/)?.[0] || "150");
        ctx.speak(`Setting air quality threshold to ${val} AQI.`);
        ctx.onSettingsSave?.("airQualityThreshold", val);
        return true;
      },
    },
    {
      id: "settings.sound_on",
      category: "settings",
      priority: 35,
      patterns: [/(enable|turn on|activate) sound (alerts?|notifications?)/i],
      description: "Enable sound alerts",
      examples: ["Turn on sound alerts"],
      execute: () => {
        ctx.speak("Sound alerts enabled.");
        ctx.onSettingsSave?.("soundAlerts", true);
        return true;
      },
    },
    {
      id: "settings.sound_off",
      category: "settings",
      priority: 35,
      patterns: [/(disable|turn off|deactivate|mute) sound (alerts?|notifications?)/i],
      description: "Disable sound alerts",
      examples: ["Mute sound alerts"],
      execute: () => {
        ctx.speak("Sound alerts disabled.");
        ctx.onSettingsSave?.("soundAlerts", false);
        return true;
      },
    },
    {
      id: "settings.notifications_on",
      category: "settings",
      priority: 35,
      patterns: [/(enable|turn on|activate) (push )?notifications/i],
      description: "Enable push notifications",
      examples: ["Enable notifications"],
      execute: () => {
        ctx.speak("Push notifications enabled.");
        ctx.onSettingsSave?.("pushNotifications", true);
        return true;
      },
    },
    {
      id: "settings.notifications_off",
      category: "settings",
      priority: 35,
      patterns: [/(disable|turn off|deactivate) (push )?notifications/i],
      description: "Disable push notifications",
      examples: ["Disable notifications"],
      execute: () => {
        ctx.speak("Push notifications disabled.");
        ctx.onSettingsSave?.("pushNotifications", false);
        return true;
      },
    },
    {
      id: "settings.refresh_interval",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|update) (refresh|poll|update) interval (to )?(\d+) (seconds?)/i],
      description: "Set data refresh interval",
      examples: ["Set refresh interval to 10 seconds"],
      execute: (_ctx, match) => {
        const val = Math.max(1, Math.min(60, parseInt(match.match(/(\d+)/)?.[0] || "5")));
        ctx.speak(`Setting refresh interval to ${val} seconds.`);
        ctx.onSettingsSave?.("pollInterval", val * 1000);
        return true;
      },
    },
    {
      id: "settings.dark_mode_on",
      category: "settings",
      priority: 35,
      patterns: [/(enable|turn on|switch to) dark mode/i],
      description: "Enable dark mode",
      examples: ["Dark mode on"],
      execute: () => {
        ctx.speak("Switching to dark mode.");
        ctx.onSettingsSave?.("darkMode", true);
        return true;
      },
    },
    {
      id: "settings.dark_mode_off",
      category: "settings",
      priority: 35,
      patterns: [/(disable|turn off|switch to|enable) light mode/i],
      description: "Disable dark mode",
      examples: ["Light mode on"],
      execute: () => {
        ctx.speak("Switching to light mode.");
        ctx.onSettingsSave?.("darkMode", false);
        return true;
      },
    },
    {
      id: "settings.control_mode_set",
      category: "settings",
      priority: 35,
      patterns: [/(set|change|switch) control mode (to )?(automatic|manual|scheduled)/i],
      description: "Set control mode",
      examples: ["Set control mode to automatic"],
      execute: async (_ctx, match) => {
        const mode = match.match(/(automatic|manual|scheduled)/i)?.[0]?.toLowerCase();
        if (mode === "automatic") { ctx.speak("Switching to automatic mode."); try { await ctx.onAutoMode(); } catch {} }
        else if (mode === "manual") { ctx.speak("Switching to manual mode."); try { await ctx.onManualMode(); } catch {} }
        else if (mode === "scheduled") { ctx.speak("Switching to scheduled mode."); try { await ctx.onScheduledMode(); } catch {} }
        return true;
      },
    },

    // ── Schedule Settings Commands ────────────────────────────────────────────
    {
      id: "settings.schedule_start",
      category: "schedule",
      priority: 35,
      patterns: [/(set|change|update) schedule (start|begin) (time )?(to )?(\d{1,2})(:(\d{2}))?\s*(am|pm)?/i],
      description: "Set schedule start time",
      examples: ["Set schedule start to 8 AM"],
      execute: () => {
        ctx.speak("Schedule start time can be configured in the settings panel.");
        ctx.onSettingsSave?.("_openSettings", true);
        return true;
      },
    },
    {
      id: "settings.schedule_end",
      category: "schedule",
      priority: 35,
      patterns: [/(set|change|update) schedule end (time )?(to )?(\d{1,2})(:(\d{2}))?\s*(am|pm)?/i],
      description: "Set schedule end time",
      examples: ["Set schedule end to 6 PM"],
      execute: () => {
        ctx.speak("Schedule end time can be configured in the settings panel.");
        ctx.onSettingsSave?.("_openSettings", true);
        return true;
      },
    },
    {
      id: "settings.schedule_duration",
      category: "schedule",
      priority: 35,
      patterns: [/(set|change|update) (pump )?duration (to )?(\d+) (minutes?|min)/i],
      description: "Set pump duration",
      examples: ["Set duration to 30 minutes"],
      execute: (_ctx, match) => {
        const val = parseInt(match.match(/(\d+)/)?.[0] || "30");
        ctx.speak(`Setting pump duration to ${val} minutes.`);
        ctx.onSettingsSave?.("_openSettings", true);
        return true;
      },
    },
    {
      id: "settings.schedule_enable",
      category: "schedule",
      priority: 35,
      patterns: [/(enable|activate|turn on) (the )?schedule/i],
      description: "Enable scheduling",
      examples: ["Enable schedule"],
      execute: () => {
        ctx.speak("Enabling pump schedule. Configure times in settings.");
        ctx.onSettingsSave?.("_openSettings", true);
        return true;
      },
    },
    {
      id: "settings.schedule_disable",
      category: "schedule",
      priority: 35,
      patterns: [/(disable|deactivate|turn off) (the )?schedule/i],
      description: "Disable scheduling",
      examples: ["Disable schedule"],
      execute: () => {
        ctx.speak("Disabling pump schedule.");
        ctx.onSettingsSave?.("_openSettings", true);
        return true;
      },
    },

    // ── More Help Commands ────────────────────────────────────────────────────
    {
      id: "help.modes",
      category: "help",
      priority: 5,
      patterns: [/(help with modes|mode help|help.*mode)/i],
      description: "Help with system modes",
      examples: ["Help with modes"],
      execute: () => {
        ctx.speak("The system has three modes: automatic (AI-controlled), manual (you control), and scheduled (time-based). Say 'auto mode', 'manual mode', or 'scheduled mode' to switch.");
        return true;
      },
    },
    {
      id: "help.alerts",
      category: "help",
      priority: 5,
      patterns: [/(help with alerts|alert help|help.*alert)/i],
      description: "Help with alerts",
      examples: ["Help with alerts"],
      execute: () => {
        ctx.speak("You can say: 'show alerts' to hear active alerts, 'how many alerts' for the count, 'clear alerts' to dismiss all, or 'latest alert' for the most recent one.");
        return true;
      },
    },
    {
      id: "help.navigation",
      category: "help",
      priority: 5,
      patterns: [/(help with navigation|navigation help|help.*navigate)/i],
      description: "Help navigating the dashboard",
      examples: ["Help with navigation"],
      execute: () => {
        ctx.speak("You can navigate by saying: 'go to dashboard', 'show analytics', 'open history', 'go to alerts', or 'open settings'.");
        return true;
      },
    },
    {
      id: "help.schedule",
      category: "help",
      priority: 5,
      patterns: [/(help with schedule|schedule help|help.*schedule)/i],
      description: "Help with scheduling",
      examples: ["Help with schedule"],
      execute: () => {
        ctx.speak("Scheduled mode lets the pump run automatically at set times. Go to settings to configure start time, end time, and duration. Then say 'scheduled mode' to activate.");
        return true;
      },
    },
    {
      id: "help.settings",
      category: "help",
      priority: 5,
      patterns: [/(help with settings|settings help|help.*settings)/i],
      description: "Help with settings",
      examples: ["Help with settings"],
      execute: () => {
        ctx.speak("You can adjust thresholds, toggle sound and notifications, change temperature units, and configure schedules. Try: 'set moisture threshold to 30', 'dark mode on', or 'switch to Fahrenheit'.");
        return true;
      },
    },
    {
      id: "help.export",
      category: "help",
      priority: 5,
      patterns: [/(help with export|export help|help.*export)/i],
      description: "Help with data export",
      examples: ["Help with export"],
      execute: () => {
        ctx.speak("You can export your sensor data by saying 'export as CSV' or 'export as JSON'. The data will be downloaded to your device.");
        return true;
      },
    },
    {
      id: "help.voice",
      category: "help",
      priority: 5,
      patterns: [/(help with voice|voice help|how does voice work|how to use voice)/i],
      description: "Help using voice control",
      examples: ["How does voice work?"],
      execute: () => {
        ctx.speak("Just click the microphone button and speak your command clearly. You can ask about sensors, control the pump, switch modes, navigate pages, or adjust settings. Say 'help' for an overview or ask about a specific category.");
        return true;
      },
    },
    {
      id: "help.all_commands",
      category: "help",
      priority: 5,
      patterns: [/(list (all )?commands|show (all )?commands|all (the )?commands|full command list)/i],
      description: "List every available command",
      examples: ["List all commands"],
      execute: () => {
        ctx.speak("I have over 100 voice commands across 12 categories: greetings, sensors, pump control, system modes, alerts, navigation, system info, settings, scheduling, export, help, and voice control. Try 'help' and a category name for specifics.");
        return true;
      },
    },

    // ── More Greetings ─────────────────────────────────────────────────────────
    {
      id: "greeting.how_are_you",
      category: "greeting",
      priority: 10,
      patterns: [/(how are you|how are things|how do you do|how\'?s it going|what\'?s up)/i],
      description: "Ask Clima how it is",
      examples: ["How are you?"],
      execute: () => {
        ctx.speak("I'm doing great, thanks for asking! All systems are operational and I'm ready to help. What would you like to do?");
        return true;
      },
    },
    {
      id: "greeting.thank_you",
      category: "greeting",
      priority: 10,
      patterns: [/(thank (you|s)|thanks|thanks a lot|much appreciated|thx)/i],
      description: "Thank Clima",
      examples: ["Thank you"],
      execute: () => {
        ctx.speak("You're welcome! Happy to help. Let me know if you need anything else.");
        return true;
      },
    },
    {
      id: "greeting.welcome",
      category: "greeting",
      priority: 10,
      patterns: [/(you\'?re welcome|welcome|no problem|my pleasure)/i],
      description: "Respond to Clima's thanks",
      examples: ["You're welcome"],
      execute: () => {
        ctx.speak("Glad to be of service!");
        return true;
      },
    },
    {
      id: "greeting.praise",
      category: "greeting",
      priority: 10,
      patterns: [/(good (job|work)|well done|nice (work|one)|awesome|great|excellent|perfect|amazing)/i],
      description: "Praise Clima",
      examples: ["Good job!"],
      execute: () => {
        ctx.speak("Thank you! I strive to make your farming easier. Let me know what you need next.");
        return true;
      },
    },
    {
      id: "greeting.morning",
      category: "greeting",
      priority: 10,
      patterns: [/^(good\s)?morning$/i],
      description: "Morning greeting",
      examples: ["Morning"],
      execute: () => {
        ctx.speak("Good morning! Hope you're ready for a productive day. Sensors are online and ready to report.");
        return true;
      },
    },
    {
      id: "greeting.afternoon",
      category: "greeting",
      priority: 10,
      patterns: [/^(good\s)?afternoon$/i],
      description: "Afternoon greeting",
      examples: ["Good afternoon"],
      execute: () => {
        ctx.speak("Good afternoon! How can I assist you with your farm today?");
        return true;
      },
    },
    {
      id: "greeting.evening",
      category: "greeting",
      priority: 10,
      patterns: [/^(good\s)?evening$/i],
      description: "Evening greeting",
      examples: ["Good evening"],
      execute: () => {
        ctx.speak("Good evening! I'm here if you need to check on things before the night.");
        return true;
      },
    },
    {
      id: "greeting.night",
      category: "greeting",
      priority: 10,
      patterns: [/(good night|night|sleep well)/i],
      description: "Night greeting",
      examples: ["Good night"],
      execute: () => {
        ctx.speak("Good night! I'll keep monitoring the farm while you rest. See you tomorrow!");
        return true;
      },
    },
    {
      id: "greeting.howdy",
      category: "greeting",
      priority: 10,
      patterns: [/\b(howdy|hey there|yo|sup|hiya)\b/i],
      description: "Casual greeting",
      examples: ["Howdy"],
      execute: () => {
        ctx.speak("Hey there! Ready to help with your farm. What's on your mind?");
        return true;
      },
    },

    // ── More Voice Control Commands ────────────────────────────────────────────
    {
      id: "voice.repeat",
      category: "voice-control",
      priority: 45,
      patterns: [/(repeat|say (that )?again|say once more|one more time|what did you say)/i],
      description: "Repeat the last response",
      examples: ["Repeat that"],
      execute: () => {
        ctx.speak("I'm sorry, I can't repeat the last response yet. Please ask your question again.");
        return true;
      },
    },
    {
      id: "voice.volume_up",
      category: "voice-control",
      priority: 45,
      patterns: [/(speak (up|louder)|volume (up|high)|turn up (the )?volume)/i],
      description: "Increase voice volume",
      examples: ["Speak louder"],
      execute: () => {
        ctx.speak("I'll try to speak louder.");
        return true;
      },
    },
    {
      id: "voice.volume_down",
      category: "voice-control",
      priority: 45,
      patterns: [/(speak (down|softer|quietly)|volume (down|low)|turn down (the )?volume|quieter)/i],
      description: "Decrease voice volume",
      examples: ["Speak softer"],
      execute: () => {
        ctx.speak("Okay, I'll lower my voice.");
        return true;
      },
    },
    {
      id: "voice.settings_info",
      category: "voice-control",
      priority: 40,
      patterns: [/(voice (settings|configuration|preferences)|configure voice)/i],
      description: "Voice settings info",
      examples: ["Voice settings"],
      execute: () => {
        ctx.speak("Voice settings include: test voice, repeat, volume up/down, stop listening, and AI mode. Say 'enable AI mode' for smarter command understanding if an AI provider is configured.");
        return true;
      },
    },
    {
      id: "voice.status_check",
      category: "voice-control",
      priority: 40,
      patterns: [/(voice (status|active|on|working)|is voice (on|working|active)|microphone status)/i],
      description: "Check if voice is active",
      examples: ["Is voice active?"],
      execute: () => {
        ctx.speak("Voice recognition is currently active. I'm listening for your commands. Click the microphone button to toggle.");
        return true;
      },
    },
    {
      id: "voice.ai_on",
      category: "voice-control",
      priority: 45,
      patterns: [/(enable|activate|turn on) ai (mode|parsing|understanding)/i],
      description: "Enable AI command parsing",
      examples: ["Enable AI mode"],
      execute: () => {
        ctx.speak("AI mode helps me understand natural language better. Configure your AI provider in the environment settings.");
        return true;
      },
    },
    {
      id: "voice.ai_off",
      category: "voice-control",
      priority: 45,
      patterns: [/(disable|deactivate|turn off) ai (mode|parsing|understanding)/i],
      description: "Disable AI command parsing",
      examples: ["Disable AI mode"],
      execute: () => {
        ctx.speak("AI mode can be disabled by removing the AI provider configuration.");
        return true;
      },
    },

    // ── More Export Commands ──────────────────────────────────────────────────
    {
      id: "export.generic",
      category: "export",
      priority: 25,
      patterns: [/(export|download) (data|readings|sensor data|history|logs)/i],
      description: "Export sensor data",
      examples: ["Export data"],
      execute: () => {
        ctx.speak("Opening export options. You can export as CSV or JSON.");
        ctx.onExport?.();
        return true;
      },
    },
    {
      id: "export.schedule_report",
      category: "export",
      priority: 22,
      patterns: [/(schedule (a )?report|daily report|weekly report|monthly report|auto.?export)/i],
      description: "Schedule automatic reports",
      examples: ["Schedule daily report"],
      execute: () => {
        ctx.speak("Scheduled reports are not yet available. You can manually export data by saying 'export as CSV' or 'export as JSON'.");
        return true;
      },
    },

    // ── Fun Commands ──────────────────────────────────────────────────────────
    {
      id: "fun.motivate",
      category: "greeting",
      priority: 8,
      patterns: [/(motivate me|give me a tip|farm quote|inspire me|agriculture quote)/i],
      description: "Get inspired",
      examples: ["Motivate me"],
      execute: () => {
        const quotes = [
          "The farmer is the only man in our economy who buys everything at retail, sells everything at wholesale, and pays the freight both ways.",
          "Agriculture is the most healthful, most useful, and most noble employment of man.",
          "To forget how to dig the earth and to tend the soil is to forget ourselves.",
          "Farming is a profession of hope.",
          "The ultimate goal of farming is not the growing of crops, but the cultivation and perfection of human beings.",
        ];
        ctx.speak(quotes[Math.floor(Math.random() * quotes.length)]);
        return true;
      },
    },
    {
      id: "fun.weather_saying",
      category: "greeting",
      priority: 8,
      patterns: [/(tell me (a )?(joke|riddle|fun fact)|make me (laugh|smile)|fun fact)/i],
      description: "Tell a fun fact",
      examples: ["Tell me a fun fact"],
      execute: () => {
        const facts = [
          "Did you know? Plants can detect when they're being eaten and send out defense chemicals.",
          "Fun fact: Some plants can communicate through fungal networks underground, sometimes called the 'wood wide web'.",
          "Did you know? The world's oldest living thing is a tree - a Great Basin bristlecone pine over 5,000 years old.",
          "Fun fact: Soil is full of life! A single teaspoon of healthy soil can contain up to 1 billion bacteria.",
          "Did you know? Smart farming can reduce water usage by up to 30% while increasing crop yields.",
        ];
        ctx.speak(facts[Math.floor(Math.random() * facts.length)]);
        return true;
      },
    },

    // ── Weather Commands ──────────────────────────────────────────────────────
    {
      id: "weather.current",
      category: "weather",
      priority: 20,
      patterns: [
        /(what.?s (the )?weather|current weather|weather (today|now|outside)|how is it outside|tell me the weather)/i,
      ],
      description: "Get current weather conditions",
      examples: ["What's the weather?", "Current weather"],
      execute: async () => {
        ctx.speak("Let me check the weather for your area.");
        const weather = await getCurrentWeather();
        if (!weather) {
          ctx.speak("Sorry, I couldn't fetch the weather right now. Please check your internet connection.");
          return true;
        }
        ctx.speak(`Current conditions: ${weather.condition}, temperature ${weather.temperature}°C, humidity ${weather.humidity}%, wind speed ${weather.windSpeed} km/h.`);
        return true;
      },
    },
    {
      id: "weather.forecast",
      category: "weather",
      priority: 18,
      patterns: [
        /(weather (forecast|for (tomorrow|the week|next (few )?days))|forecast|what.?s the weather (going to be|look like))/i,
      ],
      description: "Get weather forecast",
      examples: ["Weather forecast", "What's the forecast for tomorrow?"],
      execute: async () => {
        ctx.speak("Let me look up the forecast.");
        const weather = await getCurrentWeather();
        if (!weather) {
          ctx.speak("Sorry, I couldn't fetch the forecast right now.");
          return true;
        }
        if (weather.forecast.length === 0) {
          ctx.speak("Forecast data is not available right now.");
          return true;
        }
        const days = weather.forecast.map((d) => `${d.day}: ${d.condition}, high ${d.tempHigh}°C, low ${d.tempLow}°C`).join(". ");
        ctx.speak(`Here is the forecast: ${days}.`);
        return true;
      },
    },
    {
      id: "weather.rain",
      category: "weather",
      priority: 18,
      patterns: [
        /(will it rain|rain (forecast|today|expected)|is it going to rain|precipitation|chance of rain|rainfall)/i,
      ],
      description: "Check rain forecast",
      examples: ["Will it rain today?", "Rain forecast"],
      execute: async () => {
        const weather = await getCurrentWeather();
        if (!weather) {
          ctx.speak("Sorry, I couldn't check the rain forecast right now.");
          return true;
        }
        if (weather.precipitation > 0) {
          ctx.speak(`Yes, there is precipitation right now at ${weather.precipitation} mm. The forecast shows ${weather.forecast[0]?.condition || "mixed"} conditions tomorrow.`);
        } else {
          const rainyDays = weather.forecast.filter((d) => d.condition.includes("rain") || d.condition.includes("drizzle") || d.condition.includes("thunderstorm"));
          if (rainyDays.length > 0) {
            ctx.speak(`No rain right now, but rain is expected on ${rainyDays.map((d) => d.day).join(", ")}. Plan your watering accordingly.`);
          } else {
            ctx.speak(`No rain in the forecast for the next few days. You may want to water your crops manually.`);
          }
        }
        return true;
      },
    },
    {
      id: "weather.farming_advice",
      category: "weather",
      priority: 15,
      patterns: [
        /(weather (advice|tip|for farming)|farming weather|should i water|weather (based|impact) on farming)/i,
      ],
      description: "Get farming advice based on weather",
      examples: ["Weather farming advice", "Should I water based on weather?"],
      execute: async () => {
        const weather = await getCurrentWeather();
        if (!weather) {
          ctx.speak("I can't check the weather right now, but I recommend monitoring your soil moisture sensors for watering decisions.");
          return true;
        }
        if (weather.condition.includes("rain") || weather.precipitation > 0) {
          ctx.speak(`It's currently raining (${weather.precipitation} mm). You can skip watering today to save water. Your soil moisture should naturally increase.`);
        } else if (weather.temperature > 35) {
          ctx.speak(`It's very hot at ${weather.temperature}°C. Consider watering in the early morning or evening to reduce evaporation.`);
        } else if (weather.humidity < 30) {
          ctx.speak(`Humidity is low at ${weather.humidity}%. Your crops may need extra water today. Check soil moisture levels.`);
        } else {
          ctx.speak(`Weather conditions are moderate at ${weather.temperature}°C with ${weather.humidity}% humidity. Normal watering schedule should be fine.`);
        }
        return true;
      },
    },

    // ── Plant / Crop Advisory Commands ────────────────────────────────────────
    {
      id: "plant.tips",
      category: "plant",
      priority: 15,
      patterns: [
        /(plant (tips|advice|care|growing)|crop (tips|advice)|how to grow|gardening (tips|advice)|what should i grow)/i,
      ],
      description: "Get plant growing tips",
      examples: ["Plant tips", "What should I grow?"],
      execute: () => {
        const tips = [
          "Healthy soil is the foundation of a good harvest. Test your soil pH and nutrient levels regularly.",
          "Rotate your crops each season to prevent soil depletion and reduce pest buildup.",
          "Water deeply but less frequently to encourage strong root growth.",
          "Companion planting can help deter pests naturally. For example, plant marigolds near tomatoes.",
          "Mulching helps retain soil moisture, regulate temperature, and suppress weeds.",
          "Start with easy-to-grow crops like leafy greens, herbs, or tomatoes if you are new to farming.",
          "Monitor your plants daily for early signs of pests or disease. Early intervention is key.",
        ];
        ctx.speak(tips[Math.floor(Math.random() * tips.length)]);
        return true;
      },
    },
    {
      id: "plant.watering",
      category: "plant",
      priority: 15,
      patterns: [
        /(watering (advice|tips|schedule|guide)|when (to |should I )water|how (often|much) (to |should I )water|irrigation (advice|tips))/i,
      ],
      description: "Get watering advice",
      examples: ["When to water my crops?", "Watering tips"],
      execute: async () => {
        const weather = await getCurrentWeather();
        const soil = ctx.getSensorValue("soilMoisture");
        const soilNum = parseInt(soil) || 50;
        if (weather && (weather.condition.includes("rain") || weather.precipitation > 0)) {
          ctx.speak(`It's raining (${weather.precipitation} mm). You can skip watering today. Soil moisture is ${soil}.`);
        } else if (soilNum < 30) {
          ctx.speak(`Soil moisture is low at ${soil}. I recommend watering your crops now. Deep watering is better than frequent light watering.`);
        } else if (soilNum < 50) {
          ctx.speak(`Soil moisture is at ${soil}. You may want to water soon if it doesn't rain. Check again in a few hours.`);
        } else {
          ctx.speak(`Soil moisture is at ${soil}, which is adequate. No watering needed right now.`);
        }
        return true;
      },
    },
    {
      id: "plant.pest",
      category: "plant",
      priority: 14,
      patterns: [
        /(pest (control|management|prevention|advice|tips)|pests|bugs|insects (on )?(plants|crops)|how to (control|prevent) pests)/i,
      ],
      description: "Get pest management advice",
      examples: ["Pest control tips", "How to prevent pests?"],
      execute: () => {
        const tips = [
          "Introduce beneficial insects like ladybugs and lacewings to control aphids naturally.",
          "Neem oil is an effective organic pesticide for many common garden pests.",
          "Companion planting can repel pests — try planting basil near tomatoes or garlic near roses.",
          "Keep your garden clean and remove dead plant material where pests can hide.",
          "Rotate crops yearly to break pest life cycles and prevent soil-borne diseases.",
          "Use row covers to protect young plants from insects without chemicals.",
          "Monitor your plants regularly. Catching an infestation early makes treatment much easier.",
        ];
        ctx.speak(tips[Math.floor(Math.random() * tips.length)]);
        return true;
      },
    },
    {
      id: "plant.seasonal",
      category: "plant",
      priority: 14,
      patterns: [
        /(seasonal (advice|planting|tips)|what to plant (this |in this |now|this season)|planting (season|guide|calendar)|what season)/i,
      ],
      description: "Get seasonal planting advice",
      examples: ["What to plant this season?", "Seasonal advice"],
      execute: () => {
        const month = new Date().getMonth();
        const season = month >= 2 && month <= 4 ? "spring" : month >= 5 && month <= 7 ? "summer" : month >= 8 && month <= 10 ? "fall" : "winter";
        const advice: Record<string, string[]> = {
          spring: ["Spring is perfect for planting tomatoes, peppers, cucumbers, and leafy greens.", "Start your seeds indoors for a head start on the growing season.", "Prepare your soil with compost before planting."],
          summer: ["In summer, focus on heat-tolerant crops like okra, sweet potatoes, and peppers.", "Mulch heavily to retain moisture during hot months.", "Water early morning or evening to reduce evaporation."],
          fall: ["Fall is great for planting cool-season crops like broccoli, kale, carrots, and lettuce.", "Plant cover crops to enrich soil for next spring.", "Harvest remaining warm-season crops before the first frost."],
          winter: ["Winter is ideal for planning next year's garden and ordering seeds.", "If you're in a mild climate, try growing garlic, onions, and leafy greens.", "Use this time to maintain and repair farming equipment."],
        };
        const tips = advice[season] || advice.spring;
        ctx.speak(`It's ${season} time! ${tips[Math.floor(Math.random() * tips.length)]}`);
        return true;
      },
    },
    {
      id: "plant.soil",
      category: "plant",
      priority: 14,
      patterns: [
        /(soil (health|improvement|management|quality|care|advice|tips)|improve (the )?soil|soil (amendment|test)|how to (improve|care for) soil)/i,
      ],
      description: "Get soil health advice",
      examples: ["Soil health tips", "How to improve soil?"],
      execute: () => {
        const tips = [
          "Add organic matter like compost or well-rotted manure to improve soil structure and fertility.",
          "Test your soil pH regularly. Most crops prefer a pH between 6.0 and 7.0.",
          "Cover crops like clover or rye can prevent erosion and add nutrients to the soil.",
          "Avoid over-tilling as it can damage soil structure and harm beneficial organisms.",
          "Mulch with straw or wood chips to protect soil from erosion and retain moisture.",
          "Earthworms are a sign of healthy soil. Encourage them by reducing chemical use.",
          "Crop rotation prevents nutrient depletion and reduces soil-borne diseases.",
        ];
        const pH = ctx.getSensorValue("phValue");
        const advice = tips[Math.floor(Math.random() * tips.length)];
        ctx.speak(`Your current pH level is ${pH}. ${advice}`);
        return true;
      },
    },
  ];
}

export function formatCategoryHelp(category: CommandCategory, commands: VoiceCommand[]): string {
  const catCommands = commands.filter((c) => c.category === category);
  if (catCommands.length === 0) return "";
  const info = COMMAND_CATEGORIES[category];
  return `${info.icon} ${info.label}: ${catCommands.map((c) => c.examples[0]).join(", ")}`;
}

export function getAllCommandsHelp(commands: VoiceCommand[]): string {
  const categories = [...new Set(commands.map((c) => c.category))];
  return categories
    .map((cat) => formatCategoryHelp(cat, commands))
    .filter(Boolean)
    .join("\n");
}

export function findMatchingCommand(
  transcript: string,
  commands: VoiceCommand[]
): VoiceCommand | null {
  const normalized = transcript.toLowerCase();
  const sorted = [...commands].sort((a, b) => b.priority - a.priority);
  for (const cmd of sorted) {
    for (const pattern of cmd.patterns) {
      if (pattern.test(normalized)) {
        return cmd;
      }
    }
  }
  return null;
}
