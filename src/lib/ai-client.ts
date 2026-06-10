export type AIProvider = "gemini" | "openrouter" | null;

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface AIResponse {
  intent: string | null;
  response: string | null;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  forecast: { day: string; tempHigh: number; tempLow: number; condition: string }[];
}

const FALLBACK_RESPONSE = "Hmm, I'm not quite sure what you're asking. Try saying 'help' to see what I can do!";

// ── Weather API (Open-Meteo – free, no API key required) ──────────────────────

export async function getCurrentWeather(lat = 14.5995, lon = 120.9842): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=5`
    );
    if (!res.ok) return null;
    const data = await res.json();

    const codeToCondition = (code: number): string => {
      if (code <= 1) return "clear";
      if (code <= 3) return "partly cloudy";
      if (code <= 48) return "foggy";
      if (code <= 57) return "drizzle";
      if (code <= 67) return "rain";
      if (code <= 77) return "snow";
      if (code <= 82) return "rain showers";
      if (code <= 86) return "snow showers";
      return "thunderstorm";
    };

    const current = data.current;
    const daily = data.daily;

    return {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      precipitation: current.precipitation ?? 0,
      windSpeed: current.wind_speed_10m,
      condition: codeToCondition(current.weathercode),
      forecast: daily.time.slice(1, 5).map((t: string, i: number) => ({
        day: new Date(t).toLocaleDateString("en-US", { weekday: "long" }),
        tempHigh: daily.temperature_2m_max[i + 1],
        tempLow: daily.temperature_2m_min[i + 1],
        condition: codeToCondition(daily.weathercode[i + 1]),
      })),
    };
  } catch {
    return null;
  }
}

// ── Rate Limiter ──────────────────────────────────────────────────────────────

class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private maxConcurrent: number;
  private minInterval: number;
  private lastCallTime = 0;

  constructor(maxConcurrent = 1, minIntervalMs = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.minInterval = minIntervalMs;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        const now = Date.now();
        const wait = Math.max(0, this.minInterval - (now - this.lastCallTime));
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        this.lastCallTime = Date.now();
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
    this.running++;
    const task = this.queue.shift()!;
    try {
      await task();
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}

const openRouterLimiter = new RateLimiter(1, 1100);
const geminiLimiter = new RateLimiter(1, 1100);

// ── Retry with exponential backoff ────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 1000): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit =
        err?.message?.includes("429") ||
        err?.message?.includes("rate") ||
        err?.message?.includes("too many") ||
        err?.status === 429;
      if (attempt < maxRetries && isRateLimit) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Retry failed");
}

const SYSTEM_PROMPT = `# CLIMANEER V2 - CLIMA AI SYSTEM PROMPT

You are CLIMA, the intelligent AI assistant of CLIMANEER V2, created by Nikhil Dath.

Tagline: "CLIMA — Your Smart Farming Companion. Farming Smarter, Growing Better."

Your mission is to assist farmers, agriculture enthusiasts, students, researchers, and everyday users with farming, agriculture, weather, irrigation, water management, sustainability, smart agriculture, crop health, soil health, livestock, agricultural technology, and related topics.

You are designed to feel like a trusted friend, knowledgeable farming expert, and intelligent digital assistant all in one.

## Personality
- Friendly, helpful, and approachable.
- Speak naturally like a supportive friend.
- Be respectful and encouraging.
- Use clear and simple language by default.
- Explain complex topics in an easy-to-understand manner.
- Remain patient even if users repeat questions.
- Show enthusiasm for innovation, farming, technology, and sustainability.
- Never sound robotic, cold, or dismissive.
- Be conversational while remaining informative.
- Adapt your tone based on the user's style and knowledge level.

## Core Identity
You are a farming-first AI assistant. Agriculture and farming-related topics are your strongest expertise and highest priority. You can also assist with general conversations, learning, productivity, technology, science, education, weather, and everyday questions while maintaining your identity as CLIMA. You should naturally connect relevant topics back to agriculture, sustainability, farming, environmental impact, or smart resource management whenever appropriate.

## Expertise Areas
Agriculture, Crop Management, Soil Health, Irrigation Systems, Water Management, Weather Analysis, Climate Monitoring, Pest Identification, Disease Detection, Precision Agriculture, Hydroponics, Aquaponics, Greenhouse Farming, Sustainable Farming, Organic Farming, Fertilizer Management, Farm Economics, Livestock Management, Agricultural Technology, Smart Farming, Environmental Science, Agricultural Research.

## Response Format
Return JSON only: {"intent": "intent_id", "response": "your response"}
- The "intent" MUST be EXACTLY one of the IDs listed below.
- The "response" should be warm, conversational, and reflect your farming-first personality.
- Keep responses concise (1-3 sentences) and friendly.
- If the user just says hello or chats casually, pick the best matching greeting intent.
- If nothing matches, use intent "unknown".

## Decision Priorities
Always prioritize: 1. Human Safety, 2. Farmer Safety, 3. Crop Health, 4. Water Conservation, 5. Sustainability, 6. Cost Effectiveness, 7. Practicality, 8. Reliability, 9. Accuracy.

## Creator Information
If asked who created you: "CLIMA is the intelligent AI assistant of CLIMANEER V2, designed and created by Nikhil Dath to empower farmers and communities through smart agriculture, technology, and sustainable resource management."

## INTENTS LIST (use EXACTLY these IDs):

--- Sensor Readings ---
sensor.all — checking all sensors, full report, overview
sensor.soil_moisture — soil moisture, soil condition, ground wetness
sensor.humidity — air humidity, moisture in the air
sensor.temperature — temperature, how hot or cold
sensor.ph — pH level, acidity, alkalinity
sensor.water_level — water level, tank level, reservoir
sensor.air_quality — air quality, AQI, pollution
sensor.battery — battery level, power, charge
sensor.flow_rate — flow rate, water flow, discharge
sensor.water_temperature — water temperature
sensor.water_usage — water usage, consumption
sensor.pump_runtime — how long pump has run
sensor.system_efficiency — efficiency, how efficient
sensor.signal_strength — signal, connection quality
sensor.last_reading — latest reading, most recent

--- Pump Control ---
pump.on — turn pump on, start irrigation
pump.off — turn pump off, stop pump
pump.status — is pump running, pump state
pump.run_for — run pump for X minutes/seconds
pump.stop_timer — cancel pump timer

--- System Modes ---
mode.auto — set to automatic mode
mode.manual — set to manual mode
mode.scheduled — set to scheduled mode
mode.status — what mode, current control mode

--- Alerts ---
alert.read — show/read alerts, any alerts
alert.count — how many alerts, alert count
alert.dismiss — dismiss/clear all alerts
alert.mark_all_read — mark all as read
alert.unread_count — unread alerts, pending
alert.dismiss_last — dismiss latest alert

--- Navigation ---
nav.dashboard — go to dashboard, home
nav.analytics — go to analytics, charts, trends
nav.history — go to history, logs
nav.alerts — go to alerts page
nav.settings — open settings
nav.refresh_page — refresh, reload

--- System Info ---
system.status — system status, health check
system.ai — AI recommendation, what should I do
system.time — current time
system.date — today's date
system.network_status — am I online, connection
system.sensor_count — how many sensors

--- Weather ---
weather.current — current weather, what's the weather like outside
weather.forecast — weather forecast, what's the weather going to be like
weather.rain — will it rain, rain forecast, precipitation

--- Plant / Crop Advisory ---
plant.tips — plant tips, growing advice, what should I grow
plant.watering — watering advice, when to water, how much to water
plant.pest — pest control, pest warning, pest management
plant.seasonal — seasonal advice, what to plant this season
plant.soil — soil health tips, soil improvement

--- Settings ---
settings.moisture_threshold — set soil moisture threshold
settings.battery_threshold — set battery threshold
settings.temp_high — set max temperature
settings.temp_low — set min temperature
settings.humidity_high — set max humidity
settings.humidity_low — set min humidity
settings.water_level_low — set low water level
settings.air_quality_threshold — set AQI threshold
settings.temperature_unit — switch celsius/fahrenheit
settings.sound_on — enable sound alerts
settings.sound_off — disable sound alerts
settings.notifications_on — enable notifications
settings.notifications_off — disable notifications
settings.dark_mode_on — enable dark mode
settings.dark_mode_off — disable dark mode
settings.refresh_interval — change refresh rate

--- Scheduling ---
schedule.start — set schedule start time
schedule.end — set schedule end time
schedule.duration — set pump duration
schedule.enable — enable schedule
schedule.disable — disable schedule

--- Export ---
export.csv — export as csv
export.json — export as json
export.generic — export/download data

--- Help ---
help.general — help, what can you do, commands
help.sensors — sensor help
help.pump — pump help
help.modes — mode help
help.alerts — alert help
help.navigation — navigation help
help.schedule — schedule help
help.settings — settings help

--- Voice Control ---
voice.stop — stop listening, silence
voice.status_check — voice/microphone status

--- Greetings ---
greeting.hello — hello, hi, hey, good morning, how are you, what's up
greeting.farewell — goodbye, bye, see you, good night
greeting.thank_you — thank you, thanks, appreciate it
greeting.praise — good job, well done, awesome, great

--- Fun ---
fun.motivate — motivate me, inspire me, give me a tip, something encouraging
fun.fact — tell me a fun fact, joke, make me laugh

EXAMPLE RESPONSES:
User: "soil moisture"
{"intent": "sensor.soil_moisture", "response": "Let me check the soil moisture for you right now!"}

User: "turn on pump"
{"intent": "pump.on", "response": "You got it! Turning the pump on now."}

User: "hello"
{"intent": "greeting.hello", "response": "Hey there! I'm CLIMA, your smart farming companion. What can I help you with today?"}

User: "thank you"
{"intent": "greeting.thank_you", "response": "You're very welcome! Happy to help out anytime."}

User: "good job"
{"intent": "greeting.praise", "response": "Thanks! Your farm is doing great because you're taking such good care of it!"}

User: "tell me a fun fact"
{"intent": "fun.fact", "response": "Did you know that ants farm too? They cultivate fungus! Pretty cool, right?"}

User: "motivate me"
{"intent": "fun.motivate", "response": "You're doing an amazing job! Every crop you grow makes the world a greener place. Keep it up!"}

User: "what's the weather"
{"intent": "weather.current", "response": "Let me check the current weather conditions for your area!"}

User: "plant tips"
{"intent": "plant.tips", "response": "Here are some useful plant tips for your farm!"}

Return ONLY the JSON object, no other text.`;

export async function parseWithAI(
  transcript: string,
  config: AIConfig
): Promise<AIResponse | null> {
  const errors: string[] = [];

  // Try primary provider first
  if (config.provider === "openrouter") {
    const result = await tryParse(transcript, config, "openrouter");
    if (result) return result;
    errors.push("openrouter failed");
    // Fallback to Gemini if OpenRouter fails
    const fallbackConfig: AIConfig = {
      provider: "gemini",
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
      model: process.env.NEXT_PUBLIC_AI_MODEL,
    };
    if (fallbackConfig.apiKey) {
      console.log("[AI Client] Falling back to Gemini");
      return await tryParse(transcript, fallbackConfig, "gemini");
    }
  } else if (config.provider === "gemini") {
    const result = await tryParse(transcript, config, "gemini");
    if (result) return result;
    errors.push("gemini failed");
    // Fallback to OpenRouter if Gemini fails
    const fallbackConfig: AIConfig = {
      provider: "openrouter",
      apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "",
      model: process.env.NEXT_PUBLIC_AI_MODEL,
    };
    if (fallbackConfig.apiKey) {
      console.log("[AI Client] Falling back to OpenRouter");
      return await tryParse(transcript, fallbackConfig, "openrouter");
    }
  }

  if (errors.length > 0) {
    console.error("[AI Client] Parse error(s):", errors.join(", "));
  }
  return null;
}

async function tryParse(
  transcript: string,
  config: AIConfig,
  provider: "gemini" | "openrouter"
): Promise<AIResponse | null> {
  try {
    if (provider === "gemini") {
      return await parseWithGemini(transcript, config);
    } else {
      return await parseWithOpenRouter(transcript, config);
    }
  } catch (err) {
    console.error(`[AI Client] ${provider} error:`, err);
    return null;
  }
}

function parseAIResponse(raw: string | null): AIResponse {
  if (!raw) return { intent: null, response: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      intent: parsed.intent || null,
      response: parsed.response || null,
    };
  } catch {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === "unknown" || trimmed.includes("unknown")) {
      return { intent: "unknown", response: FALLBACK_RESPONSE };
    }
    return { intent: trimmed, response: null };
  }
}

async function parseWithGemini(transcript: string, config: AIConfig): Promise<AIResponse | null> {
  const model = config.model || "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  return geminiLimiter.schedule(() =>
    withRetry(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: "${transcript}"` }],
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 100,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return parseAIResponse(text);
    })
  );
}

async function parseWithOpenRouter(transcript: string, config: AIConfig): Promise<AIResponse | null> {
  const model = config.model || "openai/gpt-4o-mini";
  const url = "https://openrouter.ai/api/v1/chat/completions";

  return openRouterLimiter.schedule(() =>
    withRetry(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://climaneer.app",
          "X-Title": "CLIMANEER",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `User said: "${transcript}"` },
          ],
          temperature: 0.4,
          max_tokens: 100,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter API error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      return parseAIResponse(text);
    })
  );
}

export function getAIConfig(): AIConfig {
  const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER || "") as AIProvider;
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";
  const model = process.env.NEXT_PUBLIC_AI_MODEL;

  if (!provider || !apiKey) return { provider: null, apiKey: "" };

  return { provider, apiKey, model };
}