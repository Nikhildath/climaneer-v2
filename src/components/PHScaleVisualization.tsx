import { cn } from "@/lib/utils";

interface PHScaleVisualizationProps {
  value: number; // 0-14
  className?: string;
}

export function PHScaleVisualization({ value, className }: PHScaleVisualizationProps) {
  const percentage = (value / 14) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      {/* pH Scale Bar */}
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-red-500 via-emerald-500 to-blue-500 overflow-hidden">
        {/* Indicator */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-1 bg-foreground shadow-lg transition-all duration-300"
          style={{ left: `${Math.min(Math.max(percentage, 2), 98)}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between gap-1 text-xs text-muted-foreground">
        <span>0 (Acidic)</span>
        <span>7 (Neutral)</span>
        <span>14 (Alkaline)</span>
      </div>
    </div>
  );
}
