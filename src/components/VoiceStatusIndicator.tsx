import { useEffect, useState } from "react";
import { Mic, Zap } from "lucide-react";

interface VoiceStatusIndicatorProps {
  listening: boolean;
  transcript?: string;
  aiMode?: boolean;
  voiceVersion?: "v1" | "v2";
}

export function VoiceStatusIndicator({ listening, transcript, aiMode, voiceVersion }: VoiceStatusIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (listening) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [listening]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 opacity-100 scale-100 w-[calc(100%-2rem)] sm:w-auto max-w-md">
      <div className="flex flex-col gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg backdrop-blur-md border bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/30">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {aiMode ? (
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 animate-pulse shrink-0" />
          ) : (
            <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 animate-pulse shrink-0" />
          )}
          <span className="font-semibold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 truncate">
            {aiMode ? "AI Active" : "Listening"}
          </span>
          <div className="flex gap-1 ml-auto sm:ml-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
        {transcript && (
          <div className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 pl-5 sm:pl-7 italic truncate">
            &ldquo;{transcript}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}