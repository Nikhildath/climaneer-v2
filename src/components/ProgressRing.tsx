import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  icon?: LucideIcon;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 4,
  color = "hsl(var(--primary))",
  icon: Icon,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
        />
      </svg>
      {Icon && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      )}
    </div>
  );
}
