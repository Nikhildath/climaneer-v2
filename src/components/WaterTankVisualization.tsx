import { cn } from "@/lib/utils";

interface WaterTankVisualizationProps {
  level: number; // 0-100
  className?: string;
}

export function WaterTankVisualization({ level, className }: WaterTankVisualizationProps) {
  const getColor = () => {
    if (level > 60) return "bg-emerald-500";
    if (level > 30) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className={cn("relative h-32 w-full max-w-24 mx-auto", className)}>
      {/* Tank Container */}
      <div className="relative h-full w-full rounded-lg border-2 border-muted bg-muted/20 overflow-hidden">
        {/* Level Markers */}
        <div className="absolute inset-0 flex flex-col justify-between gap-2 py-2 px-1">
          <div className="h-px w-full bg-muted-foreground/20" />
          <div className="h-px w-full bg-muted-foreground/30" />
          <div className="h-px w-full bg-muted-foreground/20" />
        </div>

        {/* Water Fill */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out",
            getColor(),
            "opacity-80"
          )}
          style={{ height: `${Math.max(2, level)}%` }}
        >
          {/* Wave Animation */}
          <div className="absolute inset-x-0 top-0 h-1 bg-white/20 animate-float" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute -right-8 top-0 text-xs text-muted-foreground">100%</div>
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">50%</div>
      <div className="absolute -right-8 bottom-0 text-xs text-muted-foreground">0%</div>
    </div>
  );
}
