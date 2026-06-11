// ===================================================
//  ClimaAI.js — TensorFlow.js Mic Integration Template
// ===================================================

// Load TensorFlow.js from CDN in index.html before this file:
// <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.16.0/dist/tf.min.js"></script>

console.log("🧠 ClimaAI TensorFlow.js integration loaded");

let audioContext, analyser, micStream;
let model; // placeholder for your future TensorFlow model
let processing = false;

// ========== Initialize Microphone ==========
async function initMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micStream = audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    micStream.connect(analyser);

    console.log("🎤 Microphone ready");
    listenLoop();
  } catch (err) {
    console.error("Mic access error:", err);
  }
}

// ========== Optional: Load Your TensorFlow Model ==========
async function loadClimaModel() {
  try {
    model = await tf.loadLayersModel("model/model.json"); // <-- put your model path here
    console.log("✅ TensorFlow model loaded");
  } catch (err) {
    console.warn("⚠️ Model not found yet:", err.message);
  }
}

// ========== Audio → Tensor Conversion ==========
function getAudioTensor() {
  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(dataArray);

  // Normalize amplitude between -1 and 1
  const tensor = tf.tensor(dataArray).reshape([1, bufferLength]);
  return tensor;
}

// ========== Listening Loop ==========
async function listenLoop() {
  if (processing) return;
  processing = true;

  while (true) {
    await tf.nextFrame(); // lets TF.js yield to the browser
    const audioTensor = getAudioTensor();

    // ---- If model loaded, get prediction ----
    if (model) {
      const prediction = model.predict(audioTensor);
      const score = (await prediction.data())[0];
      prediction.dispose();
      audioTensor.dispose();

      if (score > 0.85) {
        triggerClimaWake();
        await tf.nextFrame();
      }
    } else {
      // If no model yet, just visualize RMS loudness
      const rms = tf.tidy(() => audioTensor.square().mean().sqrt().dataSync()[0]);
      if (rms > 0.25) console.log("🎧 Detected sound level:", rms.toFixed(3));
      audioTensor.dispose();
    }
  }
}

// ========== Wake Trigger ==========
function triggerClimaWake() {
  console.log("✅ TensorFlow detected: 'Clima' wake word");
  speak("Yes, I'm here!");
  // You can call any control here, e.g.:
  // togglePumpWithManualOverride(true);
  // resetAutoMode();
}

// ========== Text-to-Speech ==========
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-US";
  msg.rate = 0.95;
  msg.pitch = 1;
  speechSynthesis.speak(msg);
}

// ========== Public Start Function ==========
async function startClimaAI() {
  await loadClimaModel(); // optional
  await initMic();
  console.log("🚀 ClimaAI listening started");
}

// Start automatically once page is ready
window.addEventListener("load", startClimaAI);
