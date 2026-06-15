"use client";
import { Download, RefreshCw, Settings, Zap, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

export function QuickActions({
  onExport, onRefresh, onSettings, pumpOn = false, onTogglePump,
  onAutoMode, onManualMode, currentMode = "automatic", className,
}: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className={cn(
        "fixed right-4 sm:right-6 bottom-20 sm:bottom-6 z-40 safe-bottom",
        className
      )}
    >
      <div className="flex flex-col gap-1.5 p-1.5 rounded-xl bg-card/80 backdrop-blur-2xl border border-border/40 shadow-lg">
        <ActionButton icon={Download} onClick={onExport} title="Export" />
        <ActionButton icon={RefreshCw} onClick={onRefresh} title="Refresh" />
        <ActionButton icon={Settings} onClick={onSettings} title="Settings" />
        <div className="h-px bg-border/40 mx-1" />
        <ActionButton
          icon={Zap}
          onClick={async () => { if (onAutoMode) await onAutoMode(); }}
          title="Auto"
          active={currentMode === "automatic"}
        />
        {typeof onManualMode === "function" && (
          <ActionButton
            icon={Droplets}
            onClick={async () => { if (onManualMode) await onManualMode(); }}
            title="Manual"
            active={currentMode === "manual"}
          />
        )}
        {typeof onTogglePump === "function" && (
          <ActionButton
            icon={Zap}
            onClick={async () => { if (onTogglePump) await onTogglePump(!pumpOn); }}
            title={pumpOn ? "Pump ON" : "Pump OFF"}
            active={pumpOn}
          />
        )}
      </div>
    </motion.div>
  );
}

function ActionButton({
  icon: Icon, onClick, title, active,
}: {
  icon: any;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        "h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center transition-all duration-150",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
      title={title}
    >
      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
    </motion.button>
  );
}
