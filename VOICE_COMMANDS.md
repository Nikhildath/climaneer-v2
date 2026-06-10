# Clima AI Voice Commands - Complete Guide

> **📖 Full 129-command reference available in [`COMMANDS.md`](./COMMANDS.md)**

## 🎙️ How to Use

1. Click the **microphone button** (left side of screen - green on desktop, bottom-left on mobile)
2. Speak your command clearly
3. Wait for Clima to respond

---

## 👋 Greetings & General Commands

| Command | Response | Example |
|---------|----------|---------|
| "Hello" / "Hi" / "Hey" / "Good morning" / "Good afternoon" / "Good evening" | Clima greets you back | "Hey, Clima!" |
| "Bye" / "Goodbye" / "See you" / "Good night" / "Take care" | Farewell response | "Goodbye, Clima" |
| "Clima" / "Cli..." | Confirms availability | "Clima" |
| "Test voice" | Tests voice system | "Test voice" |

---

## 📊 Sensor Readings - Individual Sensors

### Soil & Water
| Command | Response | Data Retrieved |
|---------|----------|-----------------|
| "Soil moisture" / "Soil" | Reads soil moisture % | Soil moisture level |
| "Water level" | Reads water tank level % | Water tank percentage |
| "Flow rate" / "Water flow" / "Flow sensor" | Reads water flow rate | L/min |

### Air & Environment
| Command | Response | Data Retrieved |
|---------|----------|-----------------|
| "Humidity" / "Air humidity" | Reads air humidity % | Humidity percentage |
| "Temperature" / "Air temperature" | Reads air temperature | Temperature in °C |
| "pH" / "PH" / "Ph level" | Reads water pH | pH value (0-14) |
| "Air quality" / "AQI" | Reads air quality index | AQI value |

### System Status
| Command | Response | Data Retrieved |
|---------|----------|-----------------|
| "Battery" / "Battery level" | Reads battery % | Battery percentage |

---

## 📋 Full Report

| Command | Response | Data Retrieved |
|---------|----------|-----------------|
| "All sensors" / "All readings" / "Full report" / "Read all" | Reads all sensors | All sensor data in one response |

**Example Response:**
> "Here's the full report: Soil moisture is 65%. Air humidity 72%. Air temperature 22°C. pH level 6.8. Water level 85%. Air quality 45 AQI. Battery 92%."

---

## 🚰 Pump Control

| Command | Response | Action |
|---------|----------|--------|
| "Turn on pump" / "Start pump" / "Pump on" | "Turning the pump on now." | Pump activates |
| "Turn off pump" / "Stop pump" / "Pump off" | "Stopping the pump now." | Pump deactivates |

---

## ⚙️ System Modes

| Command | Response | Action |
|---------|----------|--------|
| "Auto mode" / "Automatic" / "Auto" | "Switching to automatic mode." | System enters AUTO mode (Firebase controlled) |

---

## 🔧 Voice Control System Commands

| Command | Response | Action |
|---------|----------|--------|
| "Restart mic" / "Restart listening" | "Restarting my microphone system now." | Restarts voice recognition |
| "Stop listening" / "Stop voice" | "Stopping listening as requested." | Pauses voice recognition |
| "Start listening" / "Resume listening" | "Starting voice recognition again." | Resumes voice recognition |

---

## ❓ What to Say When Unsure

If you say something Clima doesn't recognize:

**Response:** "Sorry, I didn't quite get that. Try asking for a sensor reading or say 'turn on pump'."

### Tips for Better Recognition:
- ✅ Speak clearly and at a normal pace
- ✅ Use simple, natural language
- ✅ Include the sensor name (e.g., "what's the soil moisture?")
- ✅ On mobile, hold the mic close to your mouth
- ❌ Avoid background noise
- ❌ Don't shout

---

## 📱 Mobile vs Desktop

### Desktop
- Microphone button on **left edge**, vertically centered
- Larger button (16x16 icon)
- Side-mounted for easy access

### Mobile
- Microphone button on **bottom-left corner**
- Smaller button (14x14 icon) to avoid blocking UI
- Optimized for thumb tapping

---

## 🎯 Common Use Cases

### Quick Status Check
"All readings" → Get complete system status

### Monitor Specific Value
"Soil" → Check soil moisture
"Battery" → Check power level
"Flow rate" → Check water consumption

### Pump Control
"Turn on pump" → Activate pump
"Turn off pump" → Deactivate pump

### System Control
"Auto mode" → Switch to automatic control
"Stop listening" → Disable voice for now
"Start listening" → Re-enable voice

---

## 🔊 Voice Features

### Haptic Feedback (Mobile)
- 🔴 Three vibrations when listening starts
- 🟢 One vibration when command received
- 🔴 Three vibrations when listening stops

### Audio Feedback
- Text-to-Speech responses with natural pronunciation
- Confirmation messages for all actions
- Error messages if something goes wrong

### Network Handling
- Auto-retries on weak connection
- Graceful fallback on no-speech detection
- Continuous listening on Chrome mobile via auto-restart loop

---

## 🛠️ Technical Details

### Supported Browsers
- **Chrome/Edge**: Full support (desktop & mobile)
- **Firefox**: Full support
- **Safari**: Full support (iOS & macOS)
- **Samsung Internet**: Full support

### Language Support
- English (US)

### Response Time
- Desktop: ~0.5-1.5 seconds
- Mobile: ~1-2 seconds (depends on network)

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| Mic button not responding | Refresh page, check permissions |
| No microphone permission | Check browser settings → Microphone → Allow |
| "No speech detected" | Speak louder, clearer, or closer to mic |
| Continuous restarting on mobile | This is normal - Chrome auto-restarts for continuous listening |
| Voice responses not playing | Check browser volume and speech synthesis settings |

---

## 🎓 Example Conversations

### Getting Full System Status
**User:** "Hey Clima"
**Clima:** "Hello! I'm Clima — ready when you are. Ask me to read sensors, control the pump, or get the AI recommendation."

**User:** "All sensors"
**Clima:** "Here's the full report: Soil moisture is 65%. Air humidity 72%. Air temperature 22°C. pH level 6.8. Water level 85%. Air quality 45 AQI. Battery 92%."

### Checking and Controlling Pump
**User:** "Flow rate"
**Clima:** "The current water flow rate is 2.5 L/min."

**User:** "Turn on pump"
**Clima:** "Turning the pump on now."

### System Mode Management
**User:** "Auto mode"
**Clima:** "Switching to automatic mode."

---

## 🚀 Quick Reference Card

```
GREETINGS:        Hi, Hey, Hello, Goodbye
SENSORS:          Soil, Humidity, Temperature, pH, Water level, Battery, Air quality, Flow rate
FULL REPORT:      All sensors, All readings, Full report
PUMP:             Turn on pump, Turn off pump
MODES:            Auto mode
SYSTEM:           Restart mic, Stop listening, Start listening
```

---

**Last Updated:** November 12, 2025
**Version:** 1.0
**Status:** ✅ Production Ready
