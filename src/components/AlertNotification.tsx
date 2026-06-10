import { Alert as AlertType } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useRef, useCallback } from "react";

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

const alertColors = {
  info: "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  success: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
};

export function AlertNotification({ alert, onDismiss, onMarkRead }: AlertNotificationProps) {
  const Icon = alertIcons[alert.type as keyof typeof alertIcons] ?? AlertCircle;
  const cardRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef(0);
  const swipeDeltaX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeDeltaX.current = 0;
    if (cardRef.current) {
      cardRef.current.style.transition = "none";
    }
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
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    }
    if (swipeDeltaX.current < -SWIPE_THRESHOLD) {
      if (cardRef.current) {
        cardRef.current.style.transform = "translateX(-120%)";
        cardRef.current.style.opacity = "0";
      }
      setTimeout(() => onDismiss?.(alert.id), 200);
    } else {
      swipeDeltaX.current = 0;
      if (cardRef.current) {
        cardRef.current.style.transform = "";
        cardRef.current.style.opacity = "";
      }
    }
  }, [alert.id, onDismiss]);

  return (
    <Card
      ref={cardRef}
      className={cn(
        "p-4 border-l-4 transition-all duration-300",
        alertColors[alert.type as keyof typeof alertColors] ?? alertColors.danger,
        !alert.read && "shadow-md",
        "touch-pan-y"
      )}
      data-testid={`alert-${alert.id}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm">{alert.title}</h4>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => onDismiss(alert.id)}
                data-testid={`button-dismiss-${alert.id}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <p className="text-sm opacity-90">{alert.message}</p>
          
          <div className="flex items-center gap-3 text-xs opacity-75">
            <span>{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
            {!alert.read && onMarkRead && (
              <button
                onClick={() => onMarkRead(alert.id)}
                className="hover:underline"
                data-testid={`button-mark-read-${alert.id}`}
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
