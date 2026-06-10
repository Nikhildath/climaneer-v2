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
}

export interface VoiceCommand {
  id: string;
  category: CommandCategory;
  patterns: RegExp[];
  priority: number;
  description: string;
  examples: string[];
  execute: (ctx: CommandContext, transcript: string, match?: RegExpMatchArray) => boolean | Promise<boolean>;
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
  | "fun";

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
  fun: { label: "Fun", icon: "🎯" },
};

function speakSensor(ctx: CommandContext, key: string, label: string) {
  const value = ctx.getSensorValue(key);
  ctx.speak(`${label} is ${value}.`);
  return true;
}

function speakSystemStatus(ctx: CommandContext) {
  ctx.speak(`System status: ${ctx.getSystemStatus()}.`);
  return true;
}

function parseNumber(transcript: string): number | null {
  const match = transcript.match(/(-?\d+\.?\d*)/);
  return match ? Number(match[1]) : null;
}

export function buildCommands(ctx: CommandContext): VoiceCommand[] {
  return [
    {
      id: "greeting.hello",
      category: "greeting",
      priority: 20,
      patterns: [/^(hey|hi|hello|good morning|good afternoon|good evening)\b/i],
      description: "Greet Clima",
      examples: ["Hello", "Good morning", "Hey"],
      execute: () => {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        ctx.speak(`${greeting}! I'm Clima — your smart agriculture assistant. Ask me to read sensors, control the pump, check system status, or say 'help' for options.`);
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
        ctx.speak("Goodbye! Take care and stay green. I'll be here whenever you need me.");
        return true;
      },
    },
    {
      id: "greeting.wake",
      category: "greeting",
      priority: 10,
      patterns: [/\b(clima|hey clima|hi clima)\b/i],
      description: "Wake Clima",
      examples: ["Hey Clima"],
      execute: () => {
        ctx.speak("Yes, I'm here and listening. What can I do for you?");
        return true;
      },
    },
    {
      id: "sensor.all",
      category: "sensor",
      priority: 18,
      patterns: [/(read all sensors|full report|status report|give me everything|overview|complete system overview)/i],
      description: "Read all sensor values",
      examples: ["Read all sensors", "Full report"],
      execute: () => {
        const sensors = [
          `soil moisture is ${ctx.getSensorValue("soilMoisture")}`,
          `humidity is ${ctx.getSensorValue("airHumidity")}`,
          `air temperature is ${ctx.getSensorValue("airTemperature")}`,
          `water temperature is ${ctx.getSensorValue("waterTemperature")}`,
          `pH level is ${ctx.getSensorValue("phValue")}`,
          `water level is ${ctx.getSensorValue("waterLevel")}`,
          `air quality is ${ctx.getSensorValue("airQuality")}`,
          `battery level is ${ctx.getSensorValue("batteryLevel")}`,
          `flow rate is ${ctx.getSensorValue("flowRate")}`,
        ];
        ctx.speak(sensors.join(", ") + ".");
        return true;
      },
    },
    {
      id: "sensor.soil_moisture",
      category: "sensor",
      priority: 17,
      patterns: [/\b(soil moisture|soil|ground moisture|how wet is the soil|soil condition|soil health|soil analysis)\b/i],
      description: "Get soil moisture reading",
      examples: ["Soil moisture", "How wet is the soil?"],
      execute: () => speakSensor(ctx, "soilMoisture", "Soil moisture"),
    },
    {
      id: "sensor.humidity",
      category: "sensor",
      priority: 17,
      patterns: [/\b(humidity|air humidity|how humid|humid is it)\b/i],
      description: "Get air humidity reading",
      examples: ["Humidity", "How humid?"],
      execute: () => speakSensor(ctx, "airHumidity", "Air humidity"),
    },
    {
      id: "sensor.temperature",
      category: "sensor",
      priority: 17,
      patterns: [/\b(temperature|air temperature|how hot|how cold|temp)\b/i],
      description: "Get air temperature reading",
      examples: ["Temperature", "How hot is it?"],
      execute: () => speakSensor(ctx, "airTemperature", "Air temperature"),
    },
    {
      id: "sensor.water_temperature",
      category: "sensor",
      priority: 17,
      patterns: [/\b(water temperature|water temp|how warm is the water|water is|water temp)\b/i],
      description: "Get water temperature reading",
      examples: ["Water temperature", "Water temp"],
      execute: () => speakSensor(ctx, "waterTemperature", "Water temperature"),
    },
    {
      id: "sensor.ph",
      category: "sensor",
      priority: 17,
      patterns: [/\b(p\s?h|pH level|pH value|acidity|alkalinity)\b/i],
      description: "Get pH reading",
      examples: ["pH level", "Acidity"],
      execute: () => speakSensor(ctx, "phValue", "pH level"),
    },
    {
      id: "sensor.water_level",
      category: "sensor",
      priority: 17,
      patterns: [/\b(water level|tank level|reservoir|how much water|reservoir level)\b/i],
      description: "Get water level reading",
      examples: ["Water level", "Tank level"],
      execute: () => speakSensor(ctx, "waterLevel", "Water level"),
    },
    {
      id: "sensor.air_quality",
      category: "sensor",
      priority: 17,
      patterns: [/\b(air quality|aqi|pollution|how is the air|air index)\b/i],
      description: "Get air quality reading",
      examples: ["Air quality", "AQI"],
      execute: () => speakSensor(ctx, "airQuality", "Air quality"),
    },
    {
      id: "sensor.battery",
      category: "sensor",
      priority: 17,
      patterns: [/\b(battery|battery level|power level|charge|battery status)\b/i],
      description: "Get battery level",
      examples: ["Battery level", "Power level"],
      execute: () => speakSensor(ctx, "batteryLevel", "Battery level"),
    },
    {
      id: "sensor.flow_rate",
      category: "sensor",
      priority: 17,
      patterns: [/\b(flow rate|water flow|flow sensor|how much flow|discharge)\b/i],
      description: "Get flow rate reading",
      examples: ["Flow rate", "Water flow"],
      execute: () => speakSensor(ctx, "flowRate", "Flow rate"),
    },
    {
      id: "sensor.last_reading",
      category: "sensor",
      priority: 15,
      patterns: [/\b(last reading|latest reading|most recent|last update|data age)\b/i],
      description: "Get the latest sensor snapshot",
      examples: ["Last reading", "Most recent"],
      execute: () => {
        ctx.speak(`Here is the latest data: ${ctx.getSensorValue("soilMoisture")}, ${ctx.getSensorValue("airHumidity")}, ${ctx.getSensorValue("airTemperature")}, and ${ctx.getSensorValue("waterLevel")}.`);
        return true;
      },
    },
    {
      id: "pump.on",
      category: "pump",
      priority: 18,
      patterns: [/\b(turn on pump|start pump|turn on water pump|start irrigation|activate pump|enable pump)\b/i],
      description: "Turn pump on",
      examples: ["Turn on pump", "Start irrigation"],
      execute: async () => {
        await ctx.onPumpToggle(true);
        ctx.speak("Turning the pump on now.");
        return true;
      },
    },
    {
      id: "pump.off",
      category: "pump",
      priority: 18,
      patterns: [/\b(turn off pump|stop pump|shut pump|deactivate pump|disable pump)\b/i],
      description: "Turn pump off",
      examples: ["Turn off pump", "Stop pump"],
      execute: async () => {
        await ctx.onPumpToggle(false);
        ctx.speak("Turning the pump off now.");
        return true;
      },
    },
    {
      id: "pump.status",
      category: "pump",
      priority: 16,
      patterns: [/\b(is the pump running|pump status|check pump|pump state|pump is)\b/i],
      description: "Check pump state",
      examples: ["Is the pump running?", "Pump status"],
      execute: () => speakSystemStatus(ctx),
    },
    {
      id: "pump.toggle",
      category: "pump",
      priority: 15,
      patterns: [/\b(toggle pump|switch pump|flip pump)\b/i],
      description: "Toggle pump",
      examples: ["Toggle pump", "Switch pump"],
      execute: async () => {
        const status = ctx.getSystemStatus();
        const on = /running/i.test(status);
        await ctx.onPumpToggle(!on);
        ctx.speak(`Toggling the pump ${on ? "off" : "on"}.`);
        return true;
      },
    },
    {
      id: "mode.auto",
      category: "mode",
      priority: 16,
      patterns: [/\b(auto mode|automatic mode|set to auto|enable auto|switch to automatic)\b/i],
      description: "Switch to automatic mode",
      examples: ["Auto mode", "Set to automatic"],
      execute: async () => {
        await ctx.onAutoMode();
        ctx.speak("Switching to automatic mode.");
        return true;
      },
    },
    {
      id: "mode.manual",
      category: "mode",
      priority: 16,
      patterns: [/\b(manual mode|set to manual|enable manual|switch to manual)\b/i],
      description: "Switch to manual mode",
      examples: ["Manual mode", "Set to manual"],
      execute: async () => {
        await ctx.onManualMode();
        ctx.speak("Switching to manual mode.");
        return true;
      },
    },
    {
      id: "mode.scheduled",
      category: "mode",
      priority: 15,
      patterns: [/\b(scheduled mode|schedule mode|set schedule|enable schedule)\b/i],
      description: "Switch to scheduled mode",
      examples: ["Scheduled mode", "Schedule mode"],
      execute: async () => {
        await ctx.onScheduledMode();
        ctx.speak("Opening schedule settings so you can configure scheduled mode.");
        return true;
      },
    },
    {
      id: "mode.status",
      category: "mode",
      priority: 15,
      patterns: [/\b(current mode|what mode am i in|control mode|which mode|how am i controlling)\b/i],
      description: "Report active mode",
      examples: ["What mode am I in?", "Current mode"],
      execute: () => {
        ctx.speak(`The system is currently in ${ctx.getControlMode()} mode.`);
        return true;
      },
    },
    {
      id: "alert.read",
      category: "alert",
      priority: 15,
      patterns: [/\b(show alerts|read alerts|any alerts|check alerts|alert count|unread alerts|new alerts)\b/i],
      description: "Read active alerts",
      examples: ["Show alerts", "Check alerts"],
      execute: () => {
        const active = ctx.getActiveAlerts();
        if (!active) {
          ctx.speak("There are no active alerts right now.");
        } else {
          ctx.speak(`Active alerts: ${active}`);
        }
        return true;
      },
    },
    {
      id: "alert.clear",
      category: "alert",
      priority: 15,
      patterns: [/\b(dismiss all alerts|clear alerts|mark all as read|acknowledge all|remove all alerts)\b/i],
      description: "Clear all alerts",
      examples: ["Dismiss all alerts", "Clear alerts"],
      execute: () => {
        ctx.onClearAlerts?.();
        ctx.speak("All alerts have been cleared.");
        return true;
      },
    },
    {
      id: "navigation.dashboard",
      category: "navigation",
      priority: 14,
      patterns: [/\b(go to dashboard|show home|home page|dashboard)\b/i],
      description: "Go to dashboard",
      examples: ["Go to dashboard", "Show home"],
      execute: () => {
        ctx.navigate("/");
        ctx.speak("Opening the dashboard.");
        return true;
      },
    },
    {
      id: "navigation.analytics",
      category: "navigation",
      priority: 14,
      patterns: [/\b(go to analytics|show charts|open graphs|show trends|analytics)\b/i],
      description: "Go to analytics",
      examples: ["Go to analytics", "Show charts"],
      execute: () => {
        ctx.navigate("/analytics");
        ctx.speak("Opening analytics.");
        return true;
      },
    },
    {
      id: "navigation.history",
      category: "navigation",
      priority: 14,
      patterns: [/\b(go to history|show logs|history|logs)\b/i],
      description: "Go to history",
      examples: ["Go to history", "Show logs"],
      execute: () => {
        ctx.navigate("/history");
        ctx.speak("Opening history.");
        return true;
      },
    },
    {
      id: "navigation.alerts",
      category: "navigation",
      priority: 14,
      patterns: [/\b(go to alerts page|open notifications|alerts page|notifications)\b/i],
      description: "Go to alerts page",
      examples: ["Go to alerts page", "Show notifications"],
      execute: () => {
        ctx.navigate("/alerts");
        ctx.speak("Opening alerts.");
        return true;
      },
    },
    {
      id: "navigation.settings",
      category: "navigation",
      priority: 14,
      patterns: [/\b(open settings|go to settings|settings)\b/i],
      description: "Open settings",
      examples: ["Open settings", "Go to settings"],
      execute: () => {
        ctx.speak("Please use the settings menu in the app to update your configuration.");
        return true;
      },
    },
    {
      id: "navigation.refresh",
      category: "navigation",
      priority: 13,
      patterns: [/\b(refresh page|reload page|refresh data|update sensors|reload app)\b/i],
      description: "Refresh data or page",
      examples: ["Refresh page", "Reload page"],
      execute: () => {
        ctx.onRefresh?.();
        ctx.speak("Refreshing data now.");
        return true;
      },
    },
    {
      id: "system.status",
      category: "system",
      priority: 14,
      patterns: [/\b(system status|health check|status overview|how is the system|how are things|system health)\b/i],
      description: "Check system health/status",
      examples: ["System status", "Health check"],
      execute: () => speakSystemStatus(ctx),
    },
    {
      id: "system.ai",
      category: "system",
      priority: 14,
      patterns: [/\b(ai recommendation|what does ai say|what should i do|ai suggest|recommendation)\b/i],
      description: "Get AI recommendation",
      examples: ["AI recommendation", "What does AI suggest?"],
      execute: () => {
        const recommendation = ctx.getAIRecommendation();
        if (recommendation) {
          ctx.speak(recommendation);
        } else {
          ctx.speak("There is no AI recommendation available right now.");
        }
        return true;
      },
    },
    {
      id: "system.time",
      category: "system",
      priority: 12,
      patterns: [/\b(what time is it|current time|time now)\b/i],
      description: "Tell the current time",
      examples: ["What time is it?", "Current time"],
      execute: () => {
        ctx.speak(`The current time is ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric" }).format(new Date())}.`);
        return true;
      },
    },
    {
      id: "system.date",
      category: "system",
      priority: 12,
      patterns: [/\b(what(?:'s| is) the date|today(?:'s)? date|current date)\b/i],
      description: "Tell the current date",
      examples: ["What's the date?", "Today's date"],
      execute: () => {
        ctx.speak(`Today is ${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}.`);
        return true;
      },
    },
    {
      id: "system.network",
      category: "system",
      priority: 12,
      patterns: [/\b(network status|am i online|connection status|internet status|are we online)\b/i],
      description: "Report connectivity",
      examples: ["Network status", "Am I online?"],
      execute: () => {
        const online = typeof navigator !== "undefined" ? navigator.onLine : true;
        ctx.speak(online ? "You are online." : "You are offline.");
        return true;
      },
    },
    {
      id: "system.version",
      category: "system",
      priority: 10,
      patterns: [/\b(system version|app version|what version|version info)\b/i],
      description: "Report app version",
      examples: ["System version", "App version"],
      execute: () => {
        ctx.speak("App version information is not available in voice mode.");
        return true;
      },
    },
    {
      id: "settings.update_threshold",
      category: "settings",
      priority: 14,
      patterns: [/\b(set|change) (moisture|battery|temperature|humidity|water level|aqi|air quality) (threshold|level) to (\d+)\b/i],
      description: "Update threshold settings",
      examples: ["Set moisture threshold to 30", "Set AQI threshold to 150"],
      execute: (ctx, transcript, match) => {
        if (!match) {
          ctx.speak("I didn't catch the value. Please say the threshold again.");
          return true;
        }
        const key = match[2].toLowerCase();
        const value = Number(match[3]);
        let settingsKey: string | null = null;
        if (key.includes("moisture")) settingsKey = "moistureThreshold";
        else if (key.includes("battery")) settingsKey = "batteryThreshold";
        else if (key.includes("temperature")) settingsKey = "temperatureUnit";
        else if (key.includes("humidity")) settingsKey = "humidityThreshold";
        else if (key.includes("water level")) settingsKey = "waterLevelLowThreshold";
        else if (key.includes("aqi") || key.includes("air quality")) settingsKey = "airQualityThreshold";

        if (!settingsKey) {
          ctx.speak("That setting isn't supported yet.");
          return true;
        }

        if (settingsKey === "temperatureUnit") {
          ctx.speak("Temperature unit settings must be Celsius or Fahrenheit.");
          return true;
        }

        ctx.onSettingsSave?.(settingsKey, value);
        ctx.speak(`Setting ${key} threshold to ${value}.`);
        return true;
      },
    },
    {
      id: "settings.temperature_unit",
      category: "settings",
      priority: 14,
      patterns: [/\b(switch to celsius|switch to fahrenheit|use celsius|use fahrenheit|set temperature unit to celsius|set temperature unit to fahrenheit)\b/i],
      description: "Change temperature unit",
      examples: ["Switch to Celsius", "Use Fahrenheit"],
      execute: (ctx, transcript) => {
        const useF = /fahrenheit/i.test(transcript);
        ctx.onSettingsSave?.("temperatureUnit", useF ? "fahrenheit" : "celsius");
        ctx.speak(`Setting temperature unit to ${useF ? "Fahrenheit" : "Celsius"}.`);
        return true;
      },
    },
    {
      id: "settings.theme",
      category: "settings",
      priority: 12,
      patterns: [/\b(dark mode on|enable dark mode|light mode on|disable dark mode)\b/i],
      description: "Toggle theme",
      examples: ["Dark mode on", "Light mode on"],
      execute: (ctx, transcript) => {
        const dark = /dark mode|enable dark mode/i.test(transcript);
        ctx.onSettingsSave?.("darkMode", dark);
        ctx.speak(`Turning ${dark ? "on" : "off"} dark mode.`);
        return true;
      },
    },
    {
      id: "settings.sound_alerts",
      category: "settings",
      priority: 12,
      patterns: [/\b(enable sound alerts|turn on sound|mute sound alerts|disable sound alerts|turn off sound)\b/i],
      description: "Toggle sound alerts",
      examples: ["Enable sound alerts", "Mute sound alerts"],
      execute: (ctx, transcript) => {
        const enable = /enable|turn on/i.test(transcript);
        ctx.onSettingsSave?.("soundAlerts", enable);
        ctx.speak(enable ? "Sound alerts enabled." : "Sound alerts disabled.");
        return true;
      },
    },
    {
      id: "settings.notifications",
      category: "settings",
      priority: 12,
      patterns: [/\b(enable notifications|turn on notifications|disable notifications|turn off notifications)\b/i],
      description: "Toggle notifications",
      examples: ["Enable notifications", "Disable notifications"],
      execute: (ctx, transcript) => {
        const enable = /enable|turn on/i.test(transcript);
        ctx.onSettingsSave?.("pushNotifications", enable);
        ctx.speak(enable ? "Notifications enabled." : "Notifications disabled.");
        return true;
      },
    },
    {
      id: "schedule.info",
      category: "schedule",
      priority: 12,
      patterns: [/\b(set schedule start to|set schedule end to|set pump duration to|enable schedule|activate schedule|disable schedule|turn off schedule)\b/i],
      description: "Open schedule settings",
      examples: ["Set schedule start to 8 AM", "Enable schedule"],
      execute: async () => {
        await ctx.onScheduledMode();
        ctx.speak("Opening schedule settings for you.");
        return true;
      },
    },
    {
      id: "export.csv",
      category: "export",
      priority: 12,
      patterns: [/\b(export as csv|download csv|export data|download data)\b/i],
      description: "Open CSV export",
      examples: ["Export as CSV", "Download CSV"],
      execute: () => {
        ctx.onExport?.();
        ctx.speak("Opening export options.");
        return true;
      },
    },
    {
      id: "help.general",
      category: "help",
      priority: 10,
      patterns: [/\b(help|what can you do|show commands|list all commands|how to use|capabilities)\b/i],
      description: "General help overview",
      examples: ["Help", "Show commands"],
      execute: () => {
        ctx.speak("I can answer questions about sensor readings, pump control, modes, alerts, navigation, system status, settings, scheduling, export, and voice control. Say 'help' plus a topic for more details.");
        return true;
      },
    },
    {
      id: "voice.stop",
      category: "voice-control",
      priority: 40,
      patterns: [/(stop listening|go to sleep|silent mode|stop voice|voice off|shut up)/i],
      description: "Stop voice recognition",
      examples: ["Stop listening", "Go to sleep"],
      execute: () => {
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
        ctx.speak("This is Clima speaking. Audio test successful.");
        return true;
      },
    },
    {
      id: "voice.status_check",
      category: "voice-control",
      priority: 30,
      patterns: [/\b(is voice active|is voice working|microphone status|voice status|is voice on)\b/i],
      description: "Check voice status",
      examples: ["Is voice active?"],
      execute: () => {
        ctx.speak("Voice recognition is active while the microphone icon is enabled. Click the microphone button to toggle.");
        return true;
      },
    },
    {
      id: "fun.motivate",
      category: "fun",
      priority: 5,
      patterns: [/\b(motivate me|give me a tip|inspire me|farm quote|fun fact|make me laugh)\b/i],
      description: "Provide a farming quote or fun fact",
      examples: ["Motivate me", "Tell me a fun fact"],
      execute: () => {
        const lines = [
          "Healthy soil is the foundation of a healthy harvest.",
          "A small seed of care can grow into a field of success.",
          "Water smart, grow strong, and let nature do the rest.",
        ];
        const quote = lines[Math.floor(Math.random() * lines.length)];
        ctx.speak(quote);
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
