import { isCapacitorAvailable } from "@/lib/capacitor-platform";

export async function nativeSpeak(
  text: string,
  options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }
): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return false;
  }

  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.speak({
      text,
      lang: options?.lang || "en-US",
      rate: options?.rate ?? 0.92,
      pitch: options?.pitch ?? 1.02,
      volume: options?.volume ?? 1.0,
    });
    return true;
  } catch (error) {
    console.error("[CapacitorTTS] nativeSpeak failed:", error);
    return false;
  }
}

export async function nativeStop(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return false;
  }

  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.stop();
    return true;
  } catch (error) {
    console.error("[CapacitorTTS] nativeStop failed:", error);
    return false;
  }
}
