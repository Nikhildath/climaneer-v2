export type AIProvider = "gemini" | "openrouter" | null;

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

const SYSTEM_PROMPT = `You are Clima v2 AI, a smart agriculture assistant. Parse the user voice command and return ONLY the matching intent ID.

INTENTIONS LIST (respond with EXACTLY one of these IDs, nothing else):

--- Sensor Readings ---
sensor.all — "read all sensors", "full report", "status report", "give me everything", "overview"
sensor.soil_moisture — "soil moisture", "soil", "ground moisture", "how wet is the soil", "soil condition", "soil health"
sensor.humidity — "humidity", "air humidity", "how humid", "air moisture"
sensor.temperature — "temperature", "air temperature", "how hot", "how cold", "temp"
sensor.ph — "ph level", "ph value", "acidity", "alkalinity", "pH"
sensor.water_level — "water level", "tank level", "reservoir", "how much water", "water tank"
sensor.air_quality — "air quality", "aqi", "pollution", "how is the air", "air index"
sensor.battery — "battery", "battery level", "power level", "charge", "battery status"
sensor.flow_rate — "flow rate", "water flow", "flow sensor", "how much flow", "discharge"
sensor.water_temperature — "water temperature", "water temp", "how warm is the water"
sensor.average_temperature — "average temperature", "mean temperature"
sensor.max_temperature — "max temperature", "maximum temperature", "highest temperature"
sensor.min_temperature — "min temperature", "minimum temperature", "lowest temperature"
sensor.average_humidity — "average humidity", "mean humidity"
sensor.water_usage — "water usage", "water consumption", "how much water used"
sensor.pump_runtime — "pump runtime", "how long has pump been running", "pump run time"
sensor.last_reading — "last reading", "latest reading", "most recent", "last update"
sensor.sensor_health — "sensor health", "are sensors working", "all sensors online", "sensor status"
sensor.system_efficiency — "system efficiency", "how efficient", "efficiency"
sensor.soil_analysis — "soil analysis", "analyze soil", "soil quality", "soil condition", "soil health"
sensor.peak_flow — "peak flow", "max flow", "maximum flow rate"
sensor.signal_strength — "signal strength", "connection quality", "network signal"
sensor.water_quality — "water quality", "water condition", "is the water safe", "is the water clean"
sensor.comparison — "compare sensor readings", "trend data", "sensor comparison"

--- Pump Control ---
pump.on — "turn on pump", "start pump", "start irrigation", "activate pump"
pump.off — "turn off pump", "stop pump", "shut pump", "deactivate pump"
pump.status — "pump status", "is the pump running", "check pump", "pump state"
pump.toggle — "toggle pump", "switch pump"
pump.run_for — "run pump for 5 minutes", "run pump for 30 seconds", timed run
pump.schedule_status — "pump schedule", "when does pump turn on"
pump.runtime_total — "total pump runtime", "pump hours"
pump.stop_timer — "cancel pump timer", "stop timer"

--- System Modes ---
mode.auto — "auto mode", "automatic mode", "set to auto", "enable auto"
mode.manual — "manual mode", "set to manual", "enable manual"
mode.scheduled — "scheduled mode", "schedule mode", "set schedule", "enable schedule"
mode.status — "current mode", "what mode am I in", "control mode", "which mode"
mode.toggle — "toggle mode", "switch control mode"
mode.explain_auto — "what is automatic mode", "explain auto"
mode.explain_manual — "what is manual mode", "explain manual"
mode.explain_scheduled — "what is scheduled mode", "explain scheduled"
mode.scheduled_next — "next scheduled run", "next pump cycle", "when will pump turn on"

--- Alerts ---
alert.read — "show alerts", "read alerts", "any alerts", "check alerts"
alert.count — "how many alerts", "alert count", "number of alerts"
alert.latest — "latest alert", "most recent alert"
alert.warnings — "show warnings", "warning alerts"
alert.dangers — "critical alerts", "danger alerts", "urgent alerts"
alert.dismiss — "dismiss all alerts", "clear alerts", "remove alerts"
alert.mark_all_read — "mark all as read", "acknowledge all", "read all"
alert.dismiss_last — "dismiss latest alert", "remove last alert"
alert.unread_count — "unread alerts", "pending alerts", "new alerts"
alert.settings_info — "alert settings", "configure alerts"

--- Navigation ---
nav.dashboard — "go to dashboard", "show home", "dashboard", "home"
nav.analytics — "go to analytics", "show charts", "open graphs", "show trends"
nav.history — "go to history", "show logs", "open history"
nav.alerts — "go to alerts page", "open notifications", "alerts page"
nav.settings — "open settings", "go to settings"
nav.back — "go back", "previous page"
nav.refresh_page — "refresh page", "reload page"

--- System Info ---
system.status — "system status", "health check", "how is the system", "status overview"
system.ai — "ai recommendation", "what does ai say", "what should I do", "ai suggest"
system.time — "what time is it", "current time", "time now"
system.date — "what's the date", "today's date", "current date"
system.network_status — "network status", "am I online", "connection status", "internet status"
system.version — "system version", "app version", "what version", "software version"
system.welcome — "what is this", "about climaneer", "what is climaneer"
system.sensor_count — "how many sensors", "sensor count", "active sensors", "number of sensors"
system.last_update — "when was last update", "data age", "last refresh time", "latest data time"
system.network_status — "network status", "connection status", "am I online", "internet status"

--- Settings ---
settings.moisture_threshold — "set moisture threshold to 30", "change soil moisture level"
settings.battery_threshold — "set battery threshold to 20", "change battery level"
settings.temp_high — "set max temperature to 35", "set high temp threshold"
settings.temp_low — "set min temperature to 5", "set low temp threshold"
settings.humidity_high — "set max humidity to 80", "set high humidity"
settings.humidity_low — "set min humidity to 20", "set low humidity"
settings.water_level_low — "set low water level to 20", "set water level threshold"
settings.air_quality_threshold — "set AQI threshold to 150", "set air quality level"
settings.temperature_unit — "switch to celsius", "use fahrenheit", "change temperature unit"
settings.sound_on — "enable sound alerts", "turn on sound", "unmute"
settings.sound_off — "disable sound alerts", "mute sound", "turn off sound"
settings.notifications_on — "enable notifications", "turn on notifications"
settings.notifications_off — "disable notifications", "turn off notifications"
settings.dark_mode_on — "dark mode on", "enable dark mode", "dark theme"
settings.dark_mode_off — "light mode on", "disable dark mode", "light theme"
settings.refresh_interval — "set refresh interval to 10 seconds", "change update rate"

--- Scheduling ---
schedule.start — "set schedule start to 8 AM", "change start time"
schedule.end — "set schedule end to 6 PM", "change end time"
schedule.duration — "set pump duration to 30 minutes", "change pump time"
schedule.enable — "enable schedule", "activate schedule", "turn on schedule"
schedule.disable — "disable schedule", "turn off schedule", "deactivate schedule"

--- Export ---
export.csv — "export as csv", "download csv", "export data as csv"
export.json — "export as json", "download json", "export data as json"
export.generic — "export data", "download data", "export readings"

--- Help ---
help.general — "help", "what can you do", "show commands", "how to use", "capabilities"
help.sensors — "help with sensors", "sensor commands", "what sensors"
help.pump — "help with pump", "pump commands", "pump help"
help.modes — "help with modes", "mode help", "help with system modes"
help.alerts — "help with alerts", "alert help"
help.navigation — "help with navigation", "navigation help"
help.schedule — "help with schedule", "schedule help"
help.settings — "help with settings", "settings help"
help.export — "help with export", "export help"
help.voice — "how does voice work", "voice help", "help with voice"

--- Voice Control ---
voice.stop — "stop listening", "go to sleep", "silent mode", "voice off"
voice.test — "test voice", "sound test", "test audio"
voice.status_check — "is voice active", "microphone status", "voice status"
voice.volume_up — "speak louder", "volume up", "turn up volume"
voice.volume_down — "speak softer", "volume down", "lower volume"

--- Greetings ---
greeting.hello — "hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how are you", "what's up"
greeting.farewell — "goodbye", "bye", "see you", "good night", "take care"
greeting.thank_you — "thank you", "thanks", "much appreciated"
greeting.praise — "good job", "well done", "awesome", "great", "excellent", "perfect"

--- Fun ---
fun.motivate — "motivate me", "inspire me", "farm quote", "give me a tip"
fun.fact — "tell me a fun fact", "make me laugh", "fun fact", "joke"

Respond ONLY with the intent ID (e.g. "sensor.soil_moisture"). If the command does not match anything, respond with "unknown".`;

export async function parseWithAI(
  transcript: string,
  config: AIConfig
): Promise<string | null> {
  try {
    if (config.provider === "gemini") {
      return await parseWithGemini(transcript, config);
    } else if (config.provider === "openrouter") {
      return await parseWithOpenRouter(transcript, config);
    }
    return null;
  } catch (err) {
    console.error("[AI Client] Parse error:", err);
    return null;
  }
}

async function parseWithGemini(transcript: string, config: AIConfig): Promise<string | null> {
  const model = config.model || "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: "${transcript}"` }],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 20,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
  return text || null;
}

async function parseWithOpenRouter(transcript: string, config: AIConfig): Promise<string | null> {
  const model = config.model || "openai/gpt-4o-mini";
  const url = "https://openrouter.ai/api/v1/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `User said: "${transcript}"` },
      ],
      temperature: 0.1,
      max_tokens: 20,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim().toLowerCase();
  return text || null;
}

export function getAIConfig(): AIConfig {
  const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER || "") as AIProvider;
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";
  const model = process.env.NEXT_PUBLIC_AI_MODEL;

  if (!provider || !apiKey) return { provider: null, apiKey: "" };

  return { provider, apiKey, model };
}
