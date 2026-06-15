import { cn } from "@/lib/utils";

interface AQIBarProps {
  aqi: number;
  className?: string;
}

export function AQIBar({ aqi, className }: AQIBarProps) {
  const percentage = Math.min(100, (aqi / 200) * 100);
  
  const getColor = () => {
    if (aqi < 50) return "bg-emerald-500";
    if (aqi < 100) return "bg-cyan-500";
    if (aqi < 150) return "bg-amber-500";
    return "bg-red-500";
  };

  const getLabel = () => {
    if (aqi < 50) return "Good";
    if (aqi < 100) return "Moderate";
    if (aqi < 150) return "Unhealthy";
    return "Hazardous";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* AQI Bar */}
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-500 ease-out",
            getColor()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between gap-2 text-xs">
        <span className={cn("font-medium", 
          aqi < 50 ? "text-emerald-500" :
          aqi < 100 ? "text-cyan-500" :
          aqi < 150 ? "text-amber-500" :
          "text-red-500"
        )}>
          {getLabel()}
        </span>
        <span className="text-muted-foreground">0 - 200+ AQI</span>
      </div>
    </div>
  );
}
