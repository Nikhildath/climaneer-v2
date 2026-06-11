<p align="center">
  <img src="public/favicon.png" alt="CLIMANEER V2 Logo" width="120" height="120" />
</p>

<h1 align="center">CLIMANEER V2</h1>
<h3 align="center">Smart Agriculture Dashboard</h3>

<p align="center">
  Real-time sensor monitoring · AI voice assistant · Pump control · Mobile & Desktop
</p>

<p align="center">
  Built with Next.js · Socket.IO · Capacitor<br/>
  by <strong>Nikhil Dath</strong>
</p>

---

## Overview

**CLIMANEER V2** is a full-stack smart agriculture platform that monitors soil moisture, temperature, humidity, pH, water level, air quality, and flow rate in real time. It connects to an ESP32 sensor node via Socket.IO and provides AI-powered voice control, weather integration, crop advisory, and mobile/desktop apps via Capacitor and Electron.

---

## Features

- Real-time sensor monitoring via Socket.IO (ESP32)
- Pump control — on/off, timed runs, AUTO/MANUAL/SCHEDULED modes
- **CLIMA AI** — voice assistant with natural language understanding (Gemini / OpenRouter)
- Weather integration — current conditions, 5-day forecast, rain alerts
- Plant & crop advisory — tips, watering advice, pest control, soil health
- Analytics & interactive charts (Recharts)
- Alert system with configurable thresholds
- Dark mode
- PWA — install on mobile as a native app
- Android APK & Windows EXE builds via GitHub Actions

---

## Architecture

```
climaneer/
├── src/                    Next.js App Router frontend
│   ├── app/                Pages + API routes
│   ├── components/         UI components
│   ├── context/            Global state (AppContext)
│   ├── hooks/              Voice control, mobile detection
│   ├── lib/                AI client, voice commands, env config
│   ├── store/              Zustand stores
│   └── shared/             Types & schemas
├── server/                 Socket.IO backend (Express)
│   ├── src/
│   │   ├── index.js        Server entry, CORS, Socket.IO
│   │   ├── config.js       Environment configuration
│   │   ├── socket-handlers.js  All Socket.IO event handlers
│   │   ├── database.js     SQLite persistence
│   │   ├── override.js     Sensor override system
│   │   └── ai.js           Server-side AI logic
│   └── render.yaml         Render deploy config
├── electron/               Desktop app wrapper (Windows EXE)
├── ESP32_SocketIO.ino      ESP32 firmware
├── public/                 Static assets, favicon, manifest
└── .github/workflows/      CI/CD — APK & EXE builds
```

### Data Flow

```
ESP32 ──WebSocket (Socket.IO)──> Server ──broadcast──> Dashboard (Next.js)
                                   │
                              ┌────┴────┐
                              │  SQLite  │
                              └─────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
cd server && npm install && cd ..
```

### Configure

Edit [`src/lib/env.ts`](src/lib/env.ts) to set your server URL and AI API keys:

```ts
// Socket.IO server (auto-switches dev/prod)
export const SOCKET_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:3001"
  : "https://your-server.onrender.com";

// AI providers (optional)
export const AI_PROVIDER = "";          // "gemini" | "openrouter"
export const GEMINI_API_KEY = "";       // Your Gemini API key
export const OPENROUTER_API_KEY = "";   // Your OpenRouter API key
```

### Run (development)

```bash
npm run dev
```

Starts both the Next.js dashboard (`:3000`) and the Socket.IO server (`:3001`).

### ESP32 Setup

1. Open [`ESP32_SocketIO.ino`](ESP32_SocketIO.ino) in Arduino IDE
2. Set your Wi-Fi credentials
3. Set `HOST`, `PORT`, and `USE_SSL` for your server
4. Flash to ESP32

---

## CLIMA AI Voice Assistant

CLIMA is a voice-powered AI that understands natural language commands.

| Provider | How to enable |
|----------|---------------|
| **Gemini** | Set `GEMINI_API_KEY` in `src/lib/env.ts` |
| **OpenRouter** | Set `OPENROUTER_API_KEY` in `src/lib/env.ts` |

Auto-fallback: if one provider fails, CLIMA tries the other.

### Voice command examples

| Category | Examples |
|----------|----------|
| Sensor Readings | "soil moisture", "temperature", "full report" |
| Pump Control | "turn on pump", "run pump for 5 minutes" |
| System Modes | "auto mode", "manual mode" |
| Weather | "what's the weather?", "will it rain?" |
| Plant Advisory | "plant tips", "when to water", "pest control" |
| Alerts | "show alerts", "clear alerts" |
| Navigation | "go to analytics", "open settings" |
| Settings | "set moisture threshold to 30", "dark mode on" |

---

## Deployment

### Server (Render)

The `server/` directory includes a [`render.yaml`](server/render.yaml). Deploy on Render.com:

1. Create a new **Web Service** pointing to the `server/` directory
2. Set environment variables in the Render dashboard:
   - `CORS_ORIGIN` — your frontend URL(s), comma-separated
3. Render auto-detects the start command from `render.yaml`

### Frontend (Vercel)

```bash
npm run build  # produces .next/
```

Deploy the repo root to Vercel — it auto-detects Next.js.

---

## Building APK & EXE

Trigger the GitHub Actions workflow to build:

- **APK** — Android app via Capacitor
- **EXE** — Windows desktop installer via Electron

### Manual trigger

```bash
gh workflow run build-apk-exe.yml
```

Or push a version tag:

```bash
git tag v2.0.0 && git push origin v2.0.0
```

Artifacts are available in the workflow run page.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui |
| State | Zustand |
| Charts | Recharts |
| Backend | Express + Socket.IO |
| Database | SQLite (via sql.js) |
| Mobile | Capacitor (PWA + Android APK) |
| Desktop | Electron (Windows EXE) |
| AI | Google Gemini / OpenRouter |
| Weather | Open-Meteo (free, no key) |
| Voice | Web Speech API |
| Hardware | ESP32 + DHT22, DS18B20, soil moisture, pH, ultrasonic, MQ-135, flow sensor |

---

## Project Structure

### Frontend (`src/`)

| Path | Purpose |
|------|---------|
| `src/lib/env.ts` | Central config — server URL, AI keys |
| `src/lib/socket-client.ts` | Socket.IO client singleton |
| `src/lib/ai-client.ts` | AI provider (Gemini / OpenRouter) |
| `src/lib/voice-commands.ts` | 129+ voice command definitions |
| `src/context/AppContext.tsx` | Global state provider |
| `src/store/sensor-store.ts` | Zustand sensor state |
| `src/hooks/use-voice-control.ts` | Voice control hook |
| `src/components/` | Reusable UI components |
| `src/app/` | Pages and API routes |

### Server (`server/`)

| Path | Purpose |
|------|---------|
| `server/src/index.js` | Express + Socket.IO server |
| `server/src/config.js` | Config (reads env vars) |
| `server/src/socket-handlers.js` | All Socket.IO event logic |
| `server/src/database.js` | SQLite CRUD operations |
| `server/src/override.js` | Sensor override computation |
| `server/src/ai.js` | Server-side AI reasoning |

---

## License

MIT
