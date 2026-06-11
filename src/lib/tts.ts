// ── Free TTS Engine — Human-like voice using Web Speech API ──────────────────
// No paid APIs. Uses the browser's built-in speech synthesis with smart voice
// selection, natural pacing, and text chunking for realistic output.

const RATE = 0.92;
const PITCH = 1.02;
const CHUNK_PAUSE_MS = 120;

// Voice quality ranking — higher = more natural sounding. These are well-known
// voices shipped with Chrome, Edge, Safari, and Android. The list is checked in
// order; the first match that exists in the browser wins.
const VOICE_RANK: RegExp[] = [
  // Google's neural / high-quality voices (Chrome on desktop + Android)
  /google.*uk.*male/i,
  /google.*us.*male/i,
  /google.*uk.*female/i,
  /google.*us.*female/i,
  /google.*english/i,
  /google/i,
  // Microsoft Edge / Windows premium voices
  /microsoft.*zira/i,
  /microsoft.*david/i,
  /microsoft.*mark/i,
  /microsoft.*hazel/i,
  /microsoft.*aria/i,
  /microsoft/i,
  // Apple Safari
  /samantha/i,
  /karen/i,
  /daniel/i,
  /moira/i,
  // Amazon Polly-based (some browsers)
  /joanna/i,
  /ivy/i,
  /matthew/i,
  // Any "natural" or "enhanced" labelled voice
  /natural/i,
  /enhanced/i,
  /premium/i,
  // Fallback — any English voice
  /english/i,
];

let bestVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
}

function rankVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name || "";
  const lang = voice.lang || "";
  for (let i = 0; i < VOICE_RANK.length; i++) {
    if (VOICE_RANK[i].test(name) || VOICE_RANK[i].test(lang)) {
      return VOICE_RANK.length - i; // higher score for earlier matches
    }
  }
  return 0;
}

/** Find and cache the best available English voice. */
export function pickBestVoice(): SpeechSynthesisVoice | null {
  if (bestVoice) return bestVoice;

  const voices = loadVoices();
  if (voices.length === 0) return null;

  let top: SpeechSynthesisVoice | null = null;
  let topScore = -1;

  for (const v of voices) {
    const score = rankVoice(v);
    if (score > topScore) {
      topScore = score;
      top = v;
    }
  }

  if (top) {
    bestVoice = top;
    voicesLoaded = true;
  }
  return top;
}

/** Reset cached voice (e.g. when voices list changes). */
export function resetVoiceCache(): void {
  bestVoice = null;
  voicesLoaded = false;
}

/**
 * Split text into natural chunks at sentence / clause boundaries so the synth
 * engine can breathe between them — sounds much more human than one long string.
 */
export function chunkText(text: string): string[] {
  // Split on sentence endings followed by a space or end-of-string.
  // Keeps the delimiter attached to the preceding sentence.
  const raw = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (raw.length <= 1) return raw;

  // Merge very short fragments into the previous chunk to avoid choppy speech.
  const chunks: string[] = [];
  for (const piece of raw) {
    if (chunks.length > 0 && piece.length < 20) {
      chunks[chunks.length - 1] += " " + piece;
    } else {
      chunks.push(piece);
    }
  }
  return chunks;
}

/**
 * Speak a single chunk with the best voice and natural prosody.
 * Returns a promise that resolves when the chunk finishes or times out.
 */
function speakChunk(chunk: string, voice?: SpeechSynthesisVoice | null): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }

    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = "en-US";
    u.rate = RATE;
    u.pitch = PITCH;
    u.volume = 1.0;
    u.voice = voice ?? pickBestVoice() ?? null;

    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);

    // Safety timeout — don't hang forever
    setTimeout(resolve, chunk.length * 80 + 2000);
  });
}

/**
 * Speak text with natural pacing.
 *
 * 1. Picks the best available voice (cached after first call).
 * 2. Breaks the text at sentence boundaries.
 * 3. Speaks each chunk sequentially with a short pause between them.
 *
 * No paid APIs — purely browser built-in speech synthesis.
 */
export async function speakNatural(
  text: string,
  options?: { voice?: SpeechSynthesisVoice }
): Promise<void> {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const voice = options?.voice || pickBestVoice();
  const chunks = chunkText(text);

  for (const chunk of chunks) {
    await speakChunk(chunk, voice);
    if (chunks.length > 1) {
      await new Promise((r) => setTimeout(r, CHUNK_PAUSE_MS));
    }
  }
}
