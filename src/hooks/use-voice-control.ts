"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { buildCommands, findMatchingCommand, type CommandContext, type VoiceCommand } from "@/lib/voice-commands";
import { parseWithAI, getAIConfig, type AIProvider } from "@/lib/ai-client";


interface VoiceControlOptions {
  onCommand?: (command: string) => void;
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
  onSettingsSave?: (key: string, value: any) => void;
  onAlertDismiss?: (id?: string) => void;
  onClearAlerts?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onStopListening?: () => void;
  aiProvider?: "auto" | "gemini" | "openrouter" | "none";
  geminiApiKey?: string;
  openrouterApiKey?: string;
  geminiModel?: string;
  openrouterModel?: string;
}

// STT phonetic correction map — maps common misrecognitions to intended words
const STT_CORRECTIONS: Record<string, string> = {
  // "Clima" / system name variations
  prima: "pump",
  crema: "pump",
  gleema: "pump",
  greema: "pump",
  breema: "pump",
  preema: "pump",
  klima: "clima",
  cleema: "clima",
  // Common pump/irrigation mishearings
  pumper: "pump",
  pumpling: "pump",
  bump: "pump",
  dumper: "pump",
  // Sensor name mishearings
  moister: "moisture",
  mosher: "moisture",
  mosha: "moisture",
  tempature: "temperature",
  temprature: "temperature",
  temper: "temperature",
  tamp: "temperature",
  humity: "humidity",
  humidy: "humidity",
  humid: "humidity",
  homily: "humidity",
  // pH / acidity
  "p h": "pH",
  "p aitch": "pH",
  peach: "pH",
  // Water level / tank
  wader: "water",
  whacker: "water",
  walker: "water",
  dank: "tank",
  // AQI / air quality
  akyou: "AQI",
  "a q i": "AQI",
  akey: "AQI",
  // Battery
  battry: "battery",
  batty: "battery",
  batter: "battery",
  paddie: "battery",
  // Flow
  flo: "flow",
  phlo: "flow",
  floe: "flow",
  // Control mode mishearings
  auto: "auto",
  autoic: "automatic",
  automatik: "automatic",
  manual: "manual",
  mania: "manual",
  mandate: "manual",
  schedule: "scheduled",
  sedule: "scheduled",
  // Alert mishearings
  allerts: "alerts",
  alert: "alerts",
  "a alert": "alerts",
  // Sensor / reading
  sensa: "sensor",
  censor: "sensor",
  senser: "sensor",
  // Navigation
  dash: "dashboard",
  board: "dashboard",
  anal: "analytics",
  analysis: "analytics",
  hysterical: "history",
  history: "history",
  storage: "history",
  // Settings
  setting: "settings",
  settling: "settings",
  thresh: "threshold",
  thresher: "threshold",
  // General
  da: "the",
  de: "the",
  ta: "the",
  tu: "to",
  tuu: "to",
  too: "to",
  fer: "for",
  fore: "for",
  fo: "for",
  ou: "on",
  awn: "on",
  off: "off",
  of: "off",
  uff: "off",
};

function correctSTT(text: string): string {
  let words = text.split(/\s+/);
  let corrected = words.map((w) => STT_CORRECTIONS[w] || w).join(" ");
  // Also try removing common filler words
  corrected = corrected.replace(/\b(please|can you|would you|could you|i want|i need|i like|just|maybe|perhaps)\b/gi, "").trim();
  return corrected.replace(/\s+/g, " ");
}

export function useVoiceControl(options: VoiceControlOptions) {
  const {
    onCommand, getSensorValue, onPumpToggle, onAutoMode, onManualMode, onScheduledMode,
    navigate, getSystemStatus, getAIRecommendation, getActiveAlerts, getControlMode,
    onSettingsSave, onAlertDismiss, onClearAlerts, onExport, onRefresh, onStopListening,
    aiProvider: aiProviderOption,
    geminiApiKey: geminiApiKeyOption, openrouterApiKey: openrouterApiKeyOption,
    geminiModel: geminiModelOption, openrouterModel: openrouterModelOption,
  } = options;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [aiMode, setAiMode] = useState(false);
  const [voiceVersion, setVoiceVersion] = useState<"v1" | "v2">("v1");
  const { toast } = useToast();
  const envAIConfig = useRef(getAIConfig());
  const aiConfigRef = useRef(envAIConfig.current);

  // Compute effective AI config whenever aiProviderOption or key/model options change
  useEffect(() => {
    if (aiProviderOption === "none") {
      aiConfigRef.current = { provider: null, apiKey: "" };
      setAiMode(false);
      console.log("[Clima v2] AI mode disabled via settings");
      return;
    }

    const env = envAIConfig.current;
    let provider: AIProvider = null;
    if (aiProviderOption === "gemini" || aiProviderOption === "openrouter") {
      provider = aiProviderOption;
    } else if (env.provider) {
      provider = env.provider;
    }

    // API key: settings first, then env var
    const geminiKey = geminiApiKeyOption || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    const openrouterKey = openrouterApiKeyOption || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";
    let apiKey = "";
    let model: string | undefined;

    if (provider === "gemini") {
      apiKey = geminiKey || env.apiKey;
      model = geminiModelOption || env.model || "gemini-2.0-flash-lite";
    } else if (provider === "openrouter") {
      apiKey = openrouterKey || env.apiKey;
      model = openrouterModelOption || env.model || "openai/gpt-4o-mini";
    }

    if (provider && apiKey) {
      aiConfigRef.current = { provider, apiKey, model };
      setAiMode(true);
      console.log("[Clima v2] AI mode:", provider, "model:", model);
    } else {
      aiConfigRef.current = { provider: null, apiKey: "" };
      setAiMode(false);
    }
  }, [aiProviderOption, geminiApiKeyOption, openrouterApiKeyOption, geminiModelOption, openrouterModelOption]);

  // Heartbeat — detect if Chrome silently killed recognition without firing any event
  useEffect(() => {
    const interval = setInterval(() => {
      if (!listeningLoopRef.current) return;
      // Chrome can silently kill SpeechRecognition without firing onerror/onend.
      // If we haven't seen any activity for 90 seconds, force restart.
      if (Date.now() - lastActivityRef.current > 90000) {
        console.log("[Clima v2] Heartbeat: no activity detected, forcing restart...");
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }
        doRestartRef.current?.(0);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text) return;
    const puter = (window as any).puter;
    if (!puter?.ai?.txt2speech) return;
    try {
      const audio = await puter.ai.txt2speech(text, { voice: "Joanna", engine: "neural", language: "en-US" });
      if (!audio || typeof audio.play !== "function") return;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        const played = audio.play();
        if (played?.catch) played.catch(() => resolve());
        setTimeout(resolve, 10000);
      });
    } catch {}
  }, []);

  const commandContext = useMemo<CommandContext>(() => ({
    getSensorValue, onPumpToggle, onAutoMode, onManualMode, onScheduledMode,
    navigate, getSystemStatus, getAIRecommendation, getActiveAlerts, getControlMode,
    speak, onSettingsSave, onAlertDismiss, onClearAlerts, onExport, onRefresh, onStopListening,
  }), [
    getSensorValue, onPumpToggle, onAutoMode, onManualMode, onScheduledMode,
    navigate, getSystemStatus, getAIRecommendation, getActiveAlerts, getControlMode,
    speak, onSettingsSave, onAlertDismiss, onClearAlerts, onExport, onRefresh, onStopListening,
  ]);

  const commandsRef = useRef<VoiceCommand[]>([]);
  const listeningLoopRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const firstActivationRef = useRef(true);
  const restartingRef = useRef(false);
  const doRestartRef = useRef<(attempt: number) => void>();
  const lastActivityRef = useRef(Date.now());
  const commandContextRef = useRef(commandContext);
  commandContextRef.current = commandContext;

  useEffect(() => {
    commandsRef.current = buildCommands(commandContext);
  }, [commandContext]);

  const processCommandRef = useRef(async (text: string) => {
    onCommand?.(text);
    const ctx = commandContextRef.current;

    if (aiMode && aiConfigRef.current.provider) {
      const intent = await parseWithAI(text, aiConfigRef.current);
      if (intent && intent !== "unknown") {
        const cmd = commandsRef.current.find((c) => c.id === intent);
        if (cmd) {
          console.log("[Clima v2] AI matched:", intent);
          await cmd.execute(ctx, text);
          return;
        }
      }
    }

    const cmd = findMatchingCommand(text, commandsRef.current);
    if (cmd) {
      console.log("[Clima v2] Regex matched:", cmd.id);
      await cmd.execute(ctx, text);
    } else {
      if (aiMode && aiConfigRef.current.provider) {
        ctx.speak("I heard you but I'm not sure what to do. Try saying help to see all commands.");
      } else {
        ctx.speak("Sorry, I didn't quite understand that. Try saying 'help' to see what I can do.");
      }
    }
  });

  // Pick the best alternative by testing each against known commands
  const pickBestAlternative = useCallback((alternatives: string[]): string => {
    if (alternatives.length <= 1) return alternatives[0] || "";

    const commands = commandsRef.current;
    if (commands.length === 0) return alternatives[0];

    // Score each alternative: how many command patterns does it match?
    let best = alternatives[0];
    let bestScore = -1;

    for (const alt of alternatives) {
      const corrected = correctSTT(alt.toLowerCase().trim());
      let score = 0;
      for (const cmd of commands) {
        for (const pattern of cmd.patterns) {
          if (pattern.test(corrected)) {
            score += cmd.priority;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = alt;
      }
    }
    return best;
  }, []);

  const handleSpeechResultRef = useRef(async (transcriptText: string) => {
    const trimmed = transcriptText.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) return;
    console.log("[Clima v2] Raw heard:", trimmed);

    // Apply STT phonetic correction
    const corrected = correctSTT(trimmed);
    if (corrected !== trimmed) {
      console.log("[Clima v2] Corrected:", corrected);
    }

    processCommandRef.current(corrected);
  });

  const startRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({ title: "Speech not supported", description: "Try Chrome on desktop or Android.", variant: "destructive" });
      return null;
    }

    let recognition: any;
    try {
      recognition = new SpeechRecognition();
    } catch (e) {
      console.error("[Clima v2] Failed to create SpeechRecognition:", e);
      return null;
    }

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log("[Clima v2] Recognition started");
      lastActivityRef.current = Date.now();
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.results.length - 1; i >= 0; i--) {
        if (event.results[i].isFinal) {
          const alts = event.results[i];
          const numAlts = Math.min(alts.length, 3);

          // Collect all alternatives (up to 3)
          const alternatives: string[] = [];
          for (let a = 0; a < numAlts; a++) {
            const text = (alts[a].transcript || "").toLowerCase().trim();
            if (text) alternatives.push(text);
          }

          if (alternatives.length === 0) break;

          // Pick the best alternative by matching against known commands
          const best = pickBestAlternative(alternatives);
          console.log("[Clima v2] Picked:", best, "from:", alternatives);
          lastActivityRef.current = Date.now();

          setTranscript(best);
          setTimeout(() => setTranscript(""), 4000);
          handleSpeechResultRef.current(best);
          break;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[Clima v2] Error:", event.error, event.message || "");
      // Don't restart on permission errors (will just fail again)
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        listeningLoopRef.current = false;
        setListening(false);
        return;
      }
      // Restart on ALL other errors (no-speech, aborted, audio-capture, network, etc.)
      if (listeningLoopRef.current && !restartingRef.current) {
        restartingRef.current = true;
        doRestartRef.current?.(0);
      }
    };

    doRestartRef.current = (attempt: number) => {
      if (!listeningLoopRef.current) return;
      const r = startRecognition();
      if (!r) return;
      recognitionRef.current = r;
      try {
        r.start();
      } catch (err) {
        if (attempt < 3) {
          setTimeout(() => doRestartRef.current?.(attempt + 1), 30 * (attempt + 1));
        }
      }
    };

    recognition.onend = () => {
      console.log("[Clima v2] Recognition ended, restarting...");
      if (restartingRef.current) {
        restartingRef.current = false;
        return;
      }
      doRestartRef.current?.(0);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [toast, pickBestAlternative]);

  const activateOnInteraction = useCallback(() => {
    if (listeningLoopRef.current) return;
    console.log("[Clima v2] User interaction, activating...");
    listeningLoopRef.current = true;
    const recognition = startRecognition();
    if (recognition) {
      try { recognition.start(); } catch (err) {
        console.warn("[Clima v2] Start failed:", err);
      }
    }

    // Poll for Puter.js in background and announce v2 when ready
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      if (attempts > 120) { clearInterval(poll); return; } // 30s max
      if (!(window as any).puter?.ai?.txt2speech) return;
      clearInterval(poll);
      setVoiceVersion("v2");
      speak("Sorry for the wait, I'm Clima v2 and I'm ready for action!");
    }, 250);
  }, [startRecognition, setVoiceVersion, speak]);

  useEffect(() => {
    const handler = () => activateOnInteraction();
    document.addEventListener("pointerdown", handler, { once: true });
    document.addEventListener("keydown", handler, { once: true });
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("keydown", handler);
      listeningLoopRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [activateOnInteraction]);

  return { listening, transcript, aiMode, speak, voiceVersion };
}