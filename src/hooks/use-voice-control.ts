"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { buildCommands, findMatchingCommand, type CommandContext, type VoiceCommand } from "@/lib/voice-commands";
import { parseWithAI, getAIConfig, type AIProvider, type AIResponse } from "@/lib/ai-client";
import { GEMINI_API_KEY, OPENROUTER_API_KEY } from "@/lib/env";
import { nativeSpeak } from "@/lib/capacitor-tts";
import { speakNatural, pickBestVoice, resetVoiceCache } from "@/lib/tts";


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
  onSettingsSaveAll?: (settings: Record<string, any>) => void;
  onAlertDismiss?: (id?: string) => void;
  onClearAlerts?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onStopListening?: () => void;
  emitSocket?: (event: string, data?: any) => boolean;
  getSettings?: () => Record<string, any>;
  onSensorOverride?: (sensorKey: string, value: number, enabled: boolean) => void;
  aiMode?: boolean;
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
    onSettingsSave, onSettingsSaveAll, onAlertDismiss, onClearAlerts, onExport, onRefresh, onStopListening,
    emitSocket, getSettings, onSensorOverride,
    aiMode: aiModeOption = true,
    aiProvider: aiProviderOption,
    geminiApiKey: geminiApiKeyOption, openrouterApiKey: openrouterApiKeyOption,
    geminiModel: geminiModelOption, openrouterModel: openrouterModelOption,
  } = options;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [aiMode, setAiMode] = useState(aiModeOption);
  const [voiceVersion, setVoiceVersion] = useState<"v1" | "v2">("v1");
  const { toast } = useToast();
  const envAIConfig = useRef(getAIConfig());
  const aiConfigRef = useRef(envAIConfig.current);

  // Compute effective AI config whenever aiProviderOption or key/model options change
  useEffect(() => {
    if (!aiModeOption) {
      aiConfigRef.current = { provider: null, apiKey: "" };
      setAiMode(false);
      console.log("[Clima v2] AI mode disabled via settings toggle");
      return;
    }

    if (aiProviderOption === "none") {
      aiConfigRef.current = { provider: null, apiKey: "" };
      setAiMode(false);
      console.log("[Clima v2] AI mode disabled via provider setting");
      return;
    }

    const env = envAIConfig.current;
    let provider: AIProvider = null;
    let apiKey = "";
    let model: string | undefined;

    if (aiProviderOption === "gemini") {
      provider = "gemini";
      apiKey = geminiApiKeyOption || GEMINI_API_KEY;
      model = geminiModelOption || env.model;
    } else if (aiProviderOption === "openrouter") {
      provider = "openrouter";
      apiKey = openrouterApiKeyOption || OPENROUTER_API_KEY;
      model = openrouterModelOption || env.model;
    } else if (aiProviderOption === "auto") {
      // Auto: prefer user's saved keys from settings, then fall back to env vars
      const userGeminiKey = geminiApiKeyOption || GEMINI_API_KEY;
      const userOpenrouterKey = openrouterApiKeyOption || OPENROUTER_API_KEY;
      if (userGeminiKey) {
        provider = "gemini";
        apiKey = userGeminiKey;
        model = geminiModelOption || env.model;
      } else if (userOpenrouterKey) {
        provider = "openrouter";
        apiKey = userOpenrouterKey;
        model = openrouterModelOption || env.model;
      } else if (env.provider) {
        provider = env.provider;
        apiKey = env.apiKey;
        model = env.model;
      }
    }

    if (provider && apiKey) {
      aiConfigRef.current = { provider, apiKey, model };
      setAiMode(true);
      console.log("[Clima v2] AI mode:", provider, "model:", model);
    } else {
      aiConfigRef.current = { provider: null, apiKey: "" };
      setAiMode(false);
      console.log("[Clima v2] AI disabled — no provider/key available. Provider setting:", aiProviderOption);
    }
  }, [aiModeOption, aiProviderOption, geminiApiKeyOption, openrouterApiKeyOption, geminiModelOption, openrouterModelOption]);

  // Heartbeat — detect if Chrome silently killed recognition without firing any event
  useEffect(() => {
    const interval = setInterval(() => {
      if (!listeningLoopRef.current) return;
      // Chrome can silently kill SpeechRecognition without firing onerror/onend.
      // If we haven't seen any activity for 60 seconds, force restart.
      if (Date.now() - lastActivityRef.current > 60000) {
        console.log("[Clima v2] Heartbeat: no activity detected, forcing restart...");
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }
        doRestartRef.current?.(0);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const voiceIndexRef = useRef(0);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const listVoices = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    voicesRef.current = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
    resetVoiceCache();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    listVoices();
    window.speechSynthesis.onvoiceschanged = listVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [listVoices]);

  const speak = useCallback(async (text: string, voiceName?: string) => {
    if (!text) return;

    // Try Capacitor TTS first (native apps)
    const nativeResult = await nativeSpeak(text, { lang: "en-US", rate: 0.92, pitch: 1.02, volume: 1.0 });
    if (nativeResult) return;

    // Fall back to Web Speech API with natural pacing (browsers)
    let voice: SpeechSynthesisVoice | undefined;
    if (voiceName) {
      const found = voicesRef.current.find((v) => v.name.includes(voiceName));
      if (found) voice = found;
    }
    await speakNatural(text, { voice });
  }, []);

  const commandContext = useMemo<CommandContext>(() => ({
    getSensorValue, onPumpToggle, onAutoMode, onManualMode, onScheduledMode,
    navigate, getSystemStatus, getAIRecommendation, getActiveAlerts, getControlMode,
    speak, onSettingsSave, onSettingsSaveAll, onAlertDismiss, onClearAlerts,
    onExport, onRefresh, onStopListening,
    emitSocket, getSettings, onSensorOverride,
  }), [
    getSensorValue, onPumpToggle, onAutoMode, onManualMode, onScheduledMode,
    navigate, getSystemStatus, getAIRecommendation, getActiveAlerts, getControlMode,
    speak, onSettingsSave, onSettingsSaveAll, onAlertDismiss, onClearAlerts,
    onExport, onRefresh, onStopListening,
    emitSocket, getSettings, onSensorOverride,
  ]);

  const commandsRef = useRef<VoiceCommand[]>([]);
  const listeningLoopRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const firstActivationRef = useRef(true);
  const restartingRef = useRef(false);
  const restartInProgressRef = useRef(false);
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
      const aiResult = await parseWithAI(text, aiConfigRef.current);
      if (aiResult && aiResult.intent && aiResult.intent !== "unknown") {
        const cmd = commandsRef.current.find((c) => c.id === aiResult.intent);
        if (cmd) {
          console.log("[Clima v2] AI matched:", aiResult.intent);
          if (aiResult.response) {
            await ctx.speak(aiResult.response);
          }
          const silentCtx = { ...ctx, speak: async () => {} };
          await cmd.execute(silentCtx, text);
          return;
        }
      }
      if (aiResult?.response) {
        await ctx.speak(aiResult.response);
      } else {
        await ctx.speak("Hmm, I'm not sure what you're asking. Try saying 'help' to see what I can do!");
      }
      return;
    }

    const cmd = findMatchingCommand(text, commandsRef.current);
    if (cmd) {
      console.log("[Clima v2] Regex matched:", cmd.id);
      await cmd.execute(ctx, text);
    } else {
      ctx.speak("Sorry, I didn't quite understand that. Try saying 'help' to see what I can do.");
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
      lastActivityRef.current = Date.now();
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        listeningLoopRef.current = false;
        setListening(false);
        return;
      }
      if (listeningLoopRef.current && !restartInProgressRef.current) {
        restartingRef.current = true;
        doRestartRef.current?.(0);
      }
    };

    doRestartRef.current = (attempt: number) => {
      if (!listeningLoopRef.current || restartInProgressRef.current) return;
      restartInProgressRef.current = true;
      const r = startRecognition();
      if (!r) {
        restartInProgressRef.current = false;
        return;
      }
      recognitionRef.current = r;
      try {
        r.start();
        restartInProgressRef.current = false;
      } catch (err) {
        restartInProgressRef.current = false;
        if (attempt < 3) {
          setTimeout(() => doRestartRef.current?.(attempt + 1), 50 * (attempt + 1));
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

    // Announce ready — Web Speech API is available immediately
    setVoiceVersion("v2");
    speak("I'm ready for action!");
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