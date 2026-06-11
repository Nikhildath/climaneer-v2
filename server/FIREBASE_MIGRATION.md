# Firebase to Socket.IO Migration Guide

## Overview

This guide explains how to migrate from Firebase Realtime Database to the new Socket.IO architecture.

## Migration Steps

### 1. Deploy the Socket.IO Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your settings
npm start
```

### 2. Update ESP32 Firmware

Replace the existing Firebase ESP32 sketch with `ESP32_SocketIO.ino`:
- Update WiFi credentials
- Set the server IP/domain and port
- Set a unique DEVICE_ID
- Flash to ESP32

### 3. Update Next.js Environment

```bash
# In project root
cp .env.local.example .env.local
# Set NEXT_PUBLIC_SOCKET_URL to your server URL
```

### 4. Start the Dashboard

```bash
npm run dev
```

## Data Migration

### Export from Firebase
1. Go to Firebase Console > Realtime Database
2. Export JSON (3-dot menu > Export JSON)

### Import to SQLite
The server automatically creates the database on first run.
Historical sensor data can be imported via the API:
```bash
curl -X POST http://localhost:3001/api/import \
  -H "Content-Type: application/json" \
  -d @firebase-export.json
```

## What Changes

### ESP32 Side
| Before (Firebase) | After (Socket.IO) |
|---|---|
| HTTP REST calls | Persistent WebSocket |
| Firebase REST API | Socket.IO events |
| Polling-based | Real-time push |
| 30s reconnect timer | Automatic reconnect |
| `firebaseGET/PUT/PATCH` | `webSocket.sendTXT()` |

### Dashboard Side
| Before (Firebase) | After (Socket.IO) |
|---|---|
| REST polling every 5s | Real-time push updates |
| `fetch() to Firebase URL` | `socket.on("sensor_update")` |
| Manual refresh | Instant updates |
| Firebase URL in settings | Socket URL in .env |

## Testing the Migration

1. Start the server: `cd server && npm start`
2. Start the dashboard: `npm run dev`
3. Flash ESP32 with new firmware
4. Verify ESP32 connects (check server logs)
5. Verify dashboard shows live data
6. Test pump controls from dashboard
7. Test override system from Developer Tools page

## Rollback Plan

If issues occur:
1. Keep Firebase running alongside Socket.IO
2. Re-flash ESP32 with old Firebase firmware
3. Restore `.env.local` with `NEXT_PUBLIC_FIREBASE_URL`
4. Switch back to old dashboard build

## Socket.IO vs Firebase Comparison

| Feature | Firebase RTDB | Socket.IO |
|---|---|---|
| Real-time | Yes | Yes |
| Self-hosted | No (Google Cloud) | Yes |
| Latency | ~200-500ms | ~10-50ms |
| Offline support | Limited | Built-in |
| Custom server logic | Limited | Full control |
| Data persistence | Firebase-managed | SQLite (local) |
| Cost | Pay per usage | Server cost only |
| Multi-device | Yes | Yes |
