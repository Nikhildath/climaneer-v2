import { cn } from "@/lib/utils";

interface TemperatureGaugeProps {
  temperature: number;
  max?: number;
  className?: string;
}

export function TemperatureGauge({ temperature, max = 50, className }: TemperatureGaugeProps) {
  const percentage = Math.min(100, Math.max(0, (temperature / max) * 100));
  
  const getColor = () => {
    if (temperature < 10) return "bg-blue-500";
    if (temperature < 20) return "bg-cyan-500";
    if (temperature < 30) return "bg-emerald-500";
    if (temperature < 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Gauge Bar */}
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
      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
        <span>0°C</span>
        <span>{max}°C</span>
      </div>
    </div>
  );
}
