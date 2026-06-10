import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  onExport: () => void;
  onRefresh: () => void;
  onSettings: () => void;
  pumpOn?: boolean;
  onTogglePump?: (turnOn: boolean) => Promise<void>;
  onAutoMode?: () => Promise<void>;
  onManualMode?: () => Promise<void>;
  currentMode?: "automatic" | "manual" | "scheduled";
  className?: string;
}

export function QuickActions({ onExport, onRefresh, onSettings, pumpOn = false, onTogglePump, onAutoMode, onManualMode, currentMode = "automatic", className }: QuickActionsProps) {
  return (
    <div className={cn("fixed right-4 sm:right-8 lg:right-12 bottom-20 sm:bottom-6 z-40 flex flex-col gap-2 sm:gap-3 safe-bottom", className)}>
      <Button
        size="icon"
        variant="outline"
        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-card border-2"
        onClick={onExport}
        data-testid="quick-action-export"
        title="Export Data"
      >
        <Download className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      
      <Button
        size="icon"
        variant="outline"
        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-card border-2"
        onClick={onRefresh}
        data-testid="quick-action-refresh"
        title="Refresh Data"
      >
        <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      
      <Button
        size="icon"
        variant="outline"
        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-card border-2"
        onClick={onSettings}
        data-testid="quick-action-settings"
        title="Settings"
      >
        <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      
      <div className="h-px w-full bg-border my-0.5 sm:my-1" />
      
      {/* Auto Mode Toggle */}
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-lg transition-all hover:-translate-y-1 text-white",
          currentMode === "automatic" 
            ? "bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-glow-emerald hover:shadow-glow-lg" 
            : "bg-card border-2 hover:border-emerald-500/50"
        )}
        onClick={async () => { 
          console.log("[Auto Mode Button] Clicked, currentMode:", currentMode, "onAutoMode:", typeof onAutoMode);
          if (onAutoMode) {
            try {
              await onAutoMode();
              console.log("[Auto Mode Button] Success!");
            } catch (err) {
              console.error("[Auto Mode Button] Error:", err);
            }
          }
        }}
        data-testid="quick-action-auto-mode"
        title={currentMode === "automatic" ? "Auto Mode Active" : "Switch to Auto Mode"}
      >
        <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Manual Mode Toggle */}
      {typeof onManualMode === "function" && (
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-lg transition-all hover:-translate-y-1 text-white",
            currentMode === "manual" 
              ? "bg-gradient-to-br from-blue-500 to-purple-500 shadow-glow-blue hover:shadow-glow-lg" 
              : "bg-card border-2 hover:border-blue-500/50"
          )}
          onClick={async () => { 
            console.log("[Manual Mode Button] Clicked, currentMode:", currentMode, "onManualMode:", typeof onManualMode);
            if (onManualMode) {
              try {
                await onManualMode();
                console.log("[Manual Mode Button] Success!");
              } catch (err) {
                console.error("[Manual Mode Button] Error:", err);
              }
            }
          }}
          data-testid="quick-action-manual-mode"
          title={currentMode === "manual" ? "Manual Mode Active" : "Switch to Manual Mode"}
        >
          <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      )}

      {/* Pump Toggle Button */}
      {typeof onTogglePump === "function" && (
        <Button
          size="icon"
          variant={pumpOn ? undefined : "secondary"}
          onClick={async () => { if (onTogglePump) await onTogglePump(!pumpOn); }}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-lg transition-all hover:-translate-y-1 bg-card border-2"
          data-testid="quick-action-pump-toggle"
          title={pumpOn ? "Turn pump off" : "Turn pump on"}
        >
          <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      )}
    </div>
  );
}
