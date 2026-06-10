// ===================================================
//   Clima Voice Control (Robust + Debug Friendly)
// ===================================================

console.log("🌿 Clima Voice Control (robust) initializing...");

let recognition = null;
let listening = false;
let glowInterval = null;
let climaVoice = null;
let lastRestartAttempt = 0;
const RESTART_MIN_DELAY = 1500; // ms - avoid floods

// Small on-screen debug / status overlay
function ensureStatusOverlay() {
  if (document.getElementById("clima-status-overlay")) return;
  const o = document.createElement("div");
  o.id = "clima-status-overlay";
  Object.assign(o.style, {
    position: "fixed",
    right: "14px",
    bottom: "88px",
    background: "rgba(0,0,0,0.6)",
    color: "white",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    zIndex: 999999,
    maxWidth: "320px",
    lineHeight: "1.2",
  });
  o.innerHTML = `<strong>Clima</strong><div id="clima-status-msg" style="opacity:0.9; margin-top:6px;">starting...</div>
  <div id="clima-heard" style="margin-top:6px; font-size:12px; color:#d1e8ff;"></div>`;
  document.body.appendChild(o);
}
function setStatus(msg) {
  ensureStatusOverlay();
  const el = document.getElementById("clima-status-msg");
  if (el) el.textContent = msg;
  console.log("Clima status:", msg);
}
function setHeard(msg) {
  ensureStatusOverlay();
  const el = document.getElementById("clima-heard");
  if (el) el.textContent = msg;
}

// ---------- Create / attach mic button ----------
window.addEventListener("DOMContentLoaded", () => {
  // don't duplicate
  if (!document.getElementById("clima-mic")) {
    const micButton = document.createElement("button");
    micButton.id = "clima-mic";
    micButton.title = "Click to toggle Clima voice control";
    micButton.textContent = "🎙️";
    Object.assign(micButton.style, {
      position: "fixed",
      left: "20px",
      bottom: "20px",
      background: "linear-gradient(135deg, #059669, #06b6d4)",
      color: "white",
      border: "none",
      borderRadius: "50%",
      width: "60px",
      height: "60px",
      fontSize: "1.6rem",
      boxShadow: "0 0 20px rgba(0,0,0,0.3)",
      cursor: "pointer",
      zIndex: "99999",
      transition: "all 0.3s ease",
    });
    document.body.appendChild(micButton);
    micButton.addEventListener("click", () => {
      if (!listening) startRecognition();
      else stopRecognition();
    });
  } else {
    console.log("Mic button already present - not recreating.");
  }

  loadClimaVoice();
  setStatus("Ready. Click mic to start listening.");
});

// ---------- Load best available voice ----------
function loadClimaVoice() {
  function pickVoice() {
    const voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      console.log("No voices loaded yet.");
      return;
    }
    climaVoice =
      voices.find((v) => /en-(IN|US)/i.test(v.lang) && /natural|google|amy|samantha|zira|alloy/i.test(v.name.toLowerCase())) ||
      voices.find((v) => /en-(IN|US)/i.test(v.lang)) ||
      voices[0];
    console.log("Selected voice:", climaVoice && (climaVoice.name + " [" + climaVoice.lang + "]"));
  }
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

// ---------- Helper: speak safely ----------
function speak(text) {
  try {
    const msg = new SpeechSynthesisUtterance(String(text));
    if (climaVoice) msg.voice = climaVoice;
    msg.lang = climaVoice?.lang || "en-IN";
    msg.rate = 0.92;
    msg.pitch = 1.03;
    speechSynthesis.cancel(); // stop any current speak to avoid overlap
    speechSynthesis.speak(msg);
    setStatus("Speaking: " + text.slice(0, 60) + (text.length > 60 ? "…" : ""));
  } catch (err) {
    console.error("Speak failed:", err);
  }
}

// ---------- Safe DOM text getter ----------
function getSensorValue(id) {
  try {
    const el = document.getElementById(id);
    if (!el) return "not available";
    // trim inner text, remove newlines
    return el.textContent.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.warn("Error reading element", id, err);
    return "not available";
  }
}

// ---------- Start / Stop glow ----------
function startGlow(btn) {
  let grow = true;
  clearInterval(glowInterval);
  glowInterval = setInterval(() => {
    btn.style.boxShadow = grow ? "0 0 25px #00f2ff, 0 0 50px #00f2ff" : "0 0 8px rgba(0,0,0,0.25)";
    grow = !grow;
  }, 450);
}
function stopGlow(btn) {
  clearInterval(glowInterval);
  btn.style.boxShadow = "0 0 15px rgba(0,0,0,0.3)";
}

// ---------- Initialize SpeechRecognition ----------
function initRecognitionIfNeeded() {
  if (recognition) return recognition;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Speech Recognition not supported in this browser.");
    setStatus("SpeechRecognition not supported");
    return null;
  }

  recognition = new SR();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false; // safer: use short sessions and restart
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    setStatus("Listening...");
    const btn = document.getElementById("clima-mic");
    if (btn) {
      btn.style.background = "linear-gradient(135deg,#0ea5e9,#14b8a6)";
      startGlow(btn);
    }
    console.log("Recognition started.");
  };

  recognition.onresult = (ev) => {
    try {
      const r = ev.results[0][0];
      const transcript = (r.transcript || "").toLowerCase().trim();
      const conf = r.confidence != null ? r.confidence.toFixed(2) : "n/a";
      console.log("Recognition result:", transcript, "conf:", conf);
      setHeard(`Heard: "${transcript}"`);
      handleVoiceCommand(transcript);
    } catch (err) {
      console.error("Error processing result:", err);
    }
  };

  recognition.onerror = (e) => {
    console.warn("Recognition error:", e && e.error);
    setStatus("Error: " + (e && e.error));
    // do not auto-restart on these specific errors - user action required
    if (e && (e.error === "not-allowed" || e.error === "service-not-allowed")) {
      speak("Microphone access blocked. Please allow microphone permissions in your browser.");
      return;
    }
  };

  recognition.onend = () => {
    listening = false;
    const btn = document.getElementById("clima-mic");
    if (btn) {
      btn.style.background = "linear-gradient(135deg,#059669,#06b6d4)";
      stopGlow(btn);
    }
    setStatus("Stopped listening. Click mic to start.");
    // smart restart: only restart if we didn't recently try
    const now = Date.now();
    if (now - lastRestartAttempt > RESTART_MIN_DELAY) {
      lastRestartAttempt = now;
      // wait a bit before restarting so browser isn't flooded
      setTimeout(() => {
        // Only auto-restart if page still visible and mic wasn't manually stopped
        if (document.visibilityState === "visible") {
          try {
            initRecognitionIfNeeded();
            recognition.start();
            console.log("Auto-restarted recognition.");
          } catch (err) {
            console.warn("Auto-restart failed:", err);
          }
        } else {
          console.log("Page not visible - skipping auto-restart.");
        }
      }, 1200 + Math.random() * 800);
    } else {
      console.log("Skipping immediate restart to avoid flood.");
    }
  };

  return recognition;
}

// ---------- Start / Stop ----------
function startRecognition() {
  const btn = document.getElementById("clima-mic");
  try {
    const r = initRecognitionIfNeeded();
    if (!r) return;
    r.start();
    setStatus("Starting recognition...");
  } catch (err) {
    console.error("startRecognition failed:", err);
    setStatus("Failed to start recognition: " + (err && err.message));
  }
}
function stopRecognition() {
  try {
    if (recognition) recognition.stop();
    setStatus("Recognition stopped by user.");
  } catch (err) {
    console.warn("stopRecognition failed:", err);
  }
}

// ---------- Command Handling (friendly) ----------
function handleVoiceCommand(text) {
  const normalized = String(text || "").toLowerCase();
  console.log("handleVoiceCommand:", normalized);

  // quick UI feedback
  setHeard(`Heard: "${normalized}"`);

  // Greetings
  if (/(^| )((hey|hi|hello|good morning|good afternoon|good evening))( |$)/.test(normalized)) {
    speak("Hello! I'm Clima — ready when you are. Ask me to read sensors, control the pump, or give the AI recommendation.");
    return;
  }

  // Farewell
  if (/(bye|goodbye|see you|good night|take care)/.test(normalized)) {
    speak("Goodbye! Take care and stay green!");
    return;
  }

  // Wake word (short response)
  if (/^cli[a-z]*/.test(normalized)) {
    speak("Yes, I'm here. What would you like me to do?");
    return;
  }

  // All sensors / full report
  if (/(all sensors|all readings|full report|give me all readings|read all)/.test(normalized)) {
    const soil = getSensorValue("soilMoisture");
    const airHum = getSensorValue("airHumidity");
    const airTemp = getSensorValue("airData");
    const ph = getSensorValue("phValue");
    const water = getSensorValue("waterLevel");
    const airQ = getSensorValue("airQuality");
    const battery = getSensorValue("battery-text");
    const msg = `Here's the full report: Soil moisture is ${soil}. Air humidity ${airHum}. Air temperature ${airTemp}. pH level ${ph}. Water level ${water}. Air quality ${airQ}. Battery ${battery}.`;
    speak(msg);
    return;
  }

  // Individual sensors
  if (normalized.includes("soil")) {
    speak(`Soil moisture is ${getSensorValue("soilMoisture")}.`);
    return;
  }
  if (normalized.includes("humidity")) {
    speak(`Air humidity is ${getSensorValue("airHumidity")}.`);
    return;
  }
  if (/(air )?temperature/.test(normalized) && !/water/.test(normalized)) {
    speak(`Air temperature is ${getSensorValue("airData")}.`);
    return;
  }
  if (normalized.includes("p h") || normalized.includes("ph ")) {
    speak(`pH level is ${getSensorValue("phValue")}.`);
    return;
  }
  if (/water level/.test(normalized) || (normalized.includes("water") && normalized.includes("level"))) {
    speak(`Water level is ${getSensorValue("waterLevel")}.`);
    return;
  }
  if (normalized.includes("air quality") || normalized.includes("aqi")) {
    speak(`Air quality is ${getSensorValue("airQuality")}.`);
    return;
  }
  if (normalized.includes("battery")) {
    speak(`Battery level is ${getSensorValue("battery-text")}.`);
    return;
  }

  // AI recommendation
  if (normalized.includes("recommendation") || normalized.includes("ai recommendation") || normalized.includes("ai")) {
    const rec = getSensorValue("aiRecommendation");
    speak(rec && rec !== "not available" ? `AI recommendation: ${rec}` : "No AI recommendation available right now.");
    return;
  }

  // Pump status (reads element or fetch if available)
  if (normalized.includes("pump status") || (normalized.includes("pump") && normalized.includes("status"))) {
    const statusText = getSensorValue("pump-status-text");
    speak(`Pump status: ${statusText}.`);
    return;
  }

  // Pump control (call existing function if available)
  if (/(turn on|start pump|pump on)/.test(normalized)) {
    speak("Turning the pump on now.");
    if (typeof togglePumpWithManualOverride === "function") {
      try { togglePumpWithManualOverride(true); } catch (e) { console.warn(e); }
    } else {
      console.warn("togglePumpWithManualOverride not found.");
      speak("Pump control function not found in the page.");
    }
    return;
  }
  if (/(turn off|stop pump|pump off)/.test(normalized)) {
    speak("Stopping the pump now.");
    if (typeof togglePumpWithManualOverride === "function") {
      try { togglePumpWithManualOverride(false); } catch (e) { console.warn(e); }
    } else {
      console.warn("togglePumpWithManualOverride not found.");
      speak("Pump control function not found in the page.");
    }
    return;
  }

  // Auto mode
  if (/(auto mode|automatic)/.test(normalized)) {
    speak("Switching to automatic mode.");
    if (typeof resetAutoMode === "function") {
      try { resetAutoMode(); } catch (e) { console.warn(e); }
    } else {
      console.warn("resetAutoMode not found.");
      speak("Auto mode function not found in the page.");
    }
    return;
  }
    // 🌊 Flow Sensor
  if (normalized.includes("flow rate") || normalized.includes("flow sensor") || normalized.includes("water flow")) {
    const flow = getSensorValue("flowRate") || getSensorValue("flowSensor") || "not available";
    speak(`The current water flow rate is ${flow}.`);
    return;
  }

  // 🧩 Debug / hidden developer commands
  if (normalized.includes("restart mic") || normalized.includes("restart listening")) {
    speak("Restarting my microphone system now.");
    stopRecognition();
    setTimeout(() => startRecognition(), 1200);
    return;
  }

  if (normalized.includes("stop listening") || normalized.includes("stop voice")) {
    speak("Stopping listening as requested.");
    stopRecognition();
    return;
  }

  if (normalized.includes("start listening") || normalized.includes("resume listening")) {
    speak("Starting voice recognition again.");
    startRecognition();
    return;
  }

  if (normalized.includes("clima test voice") || normalized.includes("test voice")) {
    const lines = [
      "This is Clima speaking, test successful!",
      "All systems are running perfectly.",
      "Voice system operational and ready.",
      "Hello human, your AI assistant is active."
    ];
    speak(lines[Math.floor(Math.random() * lines.length)]);
    return;
  }


  // Fallback
  speak("Sorry, I didn't quite get that. Try asking for a sensor reading or say 'turn on pump'.");
}

// ---------- Expose a manual start function (useful for dev) ----------
window.climaStartVoice = () => {
  startRecognition();
  setStatus("Manual start requested.");
};

// ---------- Done ----------
console.log("🌿 Clima Voice Control (robust) loaded.");
setStatus("Loaded. Click mic to begin.");
