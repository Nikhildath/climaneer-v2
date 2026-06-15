"use client";
import { Alert as AlertType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

const SWIPE_THRESHOLD = 80;

interface AlertNotificationProps {
  alert: AlertType;
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

const alertIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
};

const alertAccents = {
  info: "border-l-sky-500",
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
  danger: "border-l-red-500",
};

const iconColors = {
  info: "text-sky-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
};

export function AlertNotification({ alert, onDismiss, onMarkRead }: AlertNotificationProps) {
  const Icon = alertIcons[alert.type as keyof typeof alertIcons] ?? AlertCircle;
  const cardRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef(0);
  const swipeDeltaX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeDeltaX.current = 0;
    if (cardRef.current) cardRef.current.style.transition = "none";
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - swipeStartX.current;
    if (delta < 0) {
      swipeDeltaX.current = delta;
      if (cardRef.current) {
        cardRef.current.style.transform = `translateX(${delta}px)`;
        cardRef.current.style.opacity = `${1 + delta / SWIPE_THRESHOLD}`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (cardRef.current) cardRef.current.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    if (swipeDeltaX.current < -SWIPE_THRESHOLD) {
      if (cardRef.current) {
        cardRef.current.style.transform = "translateX(-120%)";
        cardRef.current.style.opacity = "0";
      }
      setTimeout(() => onDismiss?.(alert.id), 200);
    } else {
      swipeDeltaX.current = 0;
      if (cardRef.current) { cardRef.current.style.transform = ""; cardRef.current.style.opacity = ""; }
    }
  }, [alert.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      <div
        ref={cardRef}
        className={cn(
          "panel rounded-lg border-l-[3px] px-4 py-3.5 transition-all duration-200",
          !alert.read && "shadow-md",
          alertAccents[alert.type as keyof typeof alertAccents] ?? alertAccents.danger,
          "touch-pan-y"
        )}
        data-testid={`alert-${alert.id}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-3">
          <motion.div
            className="flex-shrink-0 mt-0.5"
            animate={alert.type === "danger" ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon className={cn("h-4 w-4", iconColors[alert.type as keyof typeof iconColors] ?? "text-red-500")} />
          </motion.div>

          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm">{alert.title}</h4>
              {onDismiss && (
                <motion.div whileHover={{ rotate: 90 }} transition={{ duration: 0.15 }}>
                  <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => onDismiss(alert.id)} data-testid={`button-dismiss-${alert.id}`}>
                    <X className="h-3 w-3" />
                  </Button>
                </motion.div>
              )}
            </div>

            <p className="text-xs opacity-90">{alert.message}</p>

            <div className="flex items-center gap-3 text-[11px] opacity-75">
              <span>{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
              {!alert.read && onMarkRead && (
                <button onClick={() => onMarkRead(alert.id)} className="hover:underline text-primary" data-testid={`button-mark-read-${alert.id}`}>
                  Mark as read
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
