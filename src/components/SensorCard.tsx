import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SensorCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: "good" | "warning" | "danger" | "info";
  statusText?: string;
  trend?: "up" | "down" | "stable";
  icon: LucideIcon;
  min?: number;
  max?: number;
  className?: string;
  testId?: string;
}

const statusColors: Record<string, { fill: string; text: string; glow: string; wave: string }> = {
  good: { fill: "#10b981", text: "text-emerald-600 dark:text-emerald-400", glow: "shadow-emerald-500/15", wave: "#10b981" },
  warning: { fill: "#f59e0b", text: "text-amber-600 dark:text-amber-400", glow: "shadow-amber-500/15", wave: "#f59e0b" },
  danger: { fill: "#ef4444", text: "text-red-600 dark:text-red-400", glow: "shadow-red-500/15", wave: "#ef4444" },
  info: { fill: "#0ea5e9", text: "text-sky-600 dark:text-sky-400", glow: "shadow-sky-500/15", wave: "#0ea5e9" },
};

const trendIcons = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColors = { up: "text-emerald-500", down: "text-red-500", stable: "text-muted-foreground" };

function WaveSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 8" className="w-full h-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`wave-${color.replace("#", "")}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,4 Q15,0 30,4 T60,4 T90,4 T120,4"
        fill="none"
        stroke={`url(#wave-${color.replace("#", "")})`}
        strokeWidth="2"
        className="animate-float"
      />
    </svg>
  );
}

export function SensorCard({
  title, value, unit, status = "info", statusText, trend, icon: Icon,
  min = 0, max = 100, className, testId,
}: SensorCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const pct = Math.max(0, Math.min(100, ((numValue - min) / (max - min)) * 100));
  const colors = statusColors[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={cn("panel rounded-lg overflow-hidden relative", colors.glow, className)}
      data-testid={testId}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-muted/20" />

      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
        style={{
          height: `${Math.max(pct, 8)}%`,
          background: `linear-gradient(to top, ${colors.fill}22, ${colors.fill}11)`,
        }}
      >
        <div className="absolute -top-1 left-0 right-0">
          <WaveSVG color={colors.fill} />
        </div>
      </div>

      <div className="relative z-10 px-4 pt-3.5 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: `${colors.fill}15` }}
            >
              <Icon className="h-3 w-3" style={{ color: colors.fill }} />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">{title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {statusText && (
              <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border", colors.text)}
                style={{ background: `${colors.fill}10`, borderColor: `${colors.fill}20` }}>
                {statusText}
              </span>
            )}
            {TrendIcon && <TrendIcon className={cn("h-3 w-3", trendColors[trend!])} />}
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid={`${testId}-value`}>
            {value}
          </span>
          {unit && <span className="text-[11px] font-medium text-muted-foreground">{unit}</span>}
        </div>

        <div className="mt-3 h-1 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            className="h-full rounded-full transition-all duration-700 ease-out"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            style={{ background: colors.fill }}
          />
        </div>
      </div>
    </motion.div>
  );
}
