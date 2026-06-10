# CLIMANEER V2 — Smart Agriculture Dashboard

**CLIMANEER V2** is a smart agriculture monitoring and control dashboard built with Next.js. It provides real-time sensor monitoring, pump control, AI-powered voice assistance, weather integration, and crop advisory — all with a mobile-friendly PWA interface.

Created by **Nikhil Dath**.

---

## Features

- Real-time sensor monitoring (soil moisture, temperature, humidity, pH, water level, air quality, flow rate, battery)
- Pump control (on/off, timed runs, scheduled mode)
- Three control modes: Automatic (Firebase), Manual, Scheduled
- **CLIMA AI** — voice-powered AI assistant with natural language understanding
- Weather integration (current conditions, 5-day forecast, rain alerts)
- Plant & crop advisory (tips, watering advice, pest control, seasonal guidance, soil health)
- Voice commands with AI intent parsing (Gemini / OpenRouter)
- Analytics & charts (Recharts)
- Data export (CSV / JSON)
- Alert system with thresholds for all sensors
- Push notifications & sound alerts
- Dark mode
- PWA ready

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Configure

Copy `.env.local` and set your Firebase URL and optional AI API keys:

```
NEXT_PUBLIC_FIREBASE_URL=https://your-project.firebasedatabase.app
NEXT_PUBLIC_AI_PROVIDER=gemini       # or openrouter
NEXT_PUBLIC_GEMINI_API_KEY=your_key
NEXT_PUBLIC_OPENROUTER_API_KEY=your_key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## CLIMA AI Voice Assistant

CLIMA is your farming companion — a voice-powered AI that understands natural language and can control the dashboard, answer questions, and give advice.

### AI Providers

| Provider | Setup |
|----------|-------|
| **Gemini** (default) | Set `NEXT_PUBLIC_GEMINI_API_KEY` in `.env` |
| **OpenRouter** | Set `NEXT_PUBLIC_OPENROUTER_API_KEY` in `.env` |

When one provider fails (e.g. rate limited), CLIMA automatically falls back to the other.

### How to use

1. Click the microphone button (green, left side)
2. Speak naturally — e.g. "what's the soil moisture?", "turn on pump for 10 minutes", "will it rain today?"
3. CLIMA responds aloud with the answer

### Voice Categories

| Category | Examples |
|----------|----------|
| Sensor Readings | "soil moisture", "temperature", "full report" |
| Pump Control | "turn on pump", "run pump for 5 minutes" |
| System Modes | "auto mode", "manual mode" |
| Weather | "what's the weather?", "will it rain?", "forecast" |
| Plant Advisory | "plant tips", "when to water", "pest control" |
| Alerts | "show alerts", "clear alerts" |
| Navigation | "go to analytics", "open settings" |
| Settings | "set moisture threshold to 30", "dark mode on" |
| System Info | "system status", "what time is it?" |
| Help | "help", "what can you do?" |

---

## Architecture

```
src/
├── app/                  Next.js App Router (pages + API routes)
│   └── api/              REST endpoints (sensors, alerts, settings, export)
├── components/           UI components (shadcn/ui)
├── context/              Global state (AppContext)
├── hooks/                Voice control, toast, mobile detection
├── lib/
│   ├── ai-client.ts      AI provider (Gemini/OpenRouter), rate limiter, weather API
│   ├── voice-commands.ts 129+ voice command definitions
│   └── utils.ts          Utilities
└── shared/schema.ts      Zod schemas & TypeScript types
```

### Data Flow

- **Firebase Realtime Database** stores sensor readings and system controls
- Polling every N seconds (configurable) fetches latest data
- Voice commands route through either regex matching or AI intent parsing
- AI responses are text-to-speech via Puter.js

---

## Configuration

Settings are persisted in `localStorage` and synced to Firebase. Key settings:

| Setting | Description |
|---------|-------------|
| `controlMode` | automatic / manual / scheduled |
| `moistureThreshold` | Alert when soil moisture below this % |
| `temperatureUnit` | celsius / fahrenheit |
| `aiMode` | Enable/disable AI voice parsing |
| `aiProvider` | auto / gemini / openrouter / none |
| `pollInterval` | Data refresh rate in ms |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, shadcn/ui, Tailwind CSS, Framer Motion
- **Charts:** Recharts
- **Data:** Firebase Realtime Database (REST)
- **Mobile:** Capacitor (PWA + native TTS)
- **AI:** Google Gemini / OpenRouter (OpenAI)
- **Weather:** Open-Meteo (free, no API key)
- **Voice:** Web Speech API + Puter.js TTS

---

## License

MIT
