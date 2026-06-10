import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SensorCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: "good" | "warning" | "danger" | "info";
  statusText?: string;
  trend?: "up" | "down" | "stable";
  icon: LucideIcon;
  visualization?: ReactNode;
  className?: string;
  testId?: string;
}

const statusColors = {
  good: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
  info: "text-cyan-500",
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors = {
  up: "text-emerald-500",
  down: "text-red-500",
  stable: "text-muted-foreground",
};

export function SensorCard({
  title,
  value,
  unit,
  status = "info",
  statusText,
  trend,
  icon: Icon,
  visualization,
  className,
  testId,
}: SensorCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden p-4 sm:p-6 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10",
        "border-card-border bg-card",
        className
      )}
      data-testid={testId}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm truncate">{title}</h3>
            </div>
          </div>
          {TrendIcon && (
            <div className="flex-shrink-0">
              <TrendIcon className={cn("h-4 w-4", trendColors[trend!])} />
            </div>
          )}
        </div>

        {/* Value */}
        <div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text" data-testid={`${testId}-value`}>
            {value}
            {unit && <span className="text-2xl sm:text-3xl ml-1">{unit}</span>}
          </div>
          {statusText && (
            <div className={cn("text-sm font-medium mt-1", statusColors[status])} data-testid={`${testId}-status`}>
              {statusText}
            </div>
          )}
        </div>

        {/* Visualization */}
        {visualization && (
          <div className="mt-4">
            {visualization}
          </div>
        )}
      </div>
    </Card>
  );
}
