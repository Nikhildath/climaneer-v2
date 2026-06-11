import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, isValidElement } from "react";
import { motion } from "framer-motion";

interface StatusCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon | ReactNode;
  status?: "active" | "warning" | "danger" | "inactive";
  className?: string;
  testId?: string;
}

const ringStyles: Record<string, { color: string; bg: string; dot: string }> = {
  active: { color: "#10b981", bg: "from-emerald-500/5 to-emerald-500/0", dot: "bg-emerald-500" },
  warning: { color: "#f59e0b", bg: "from-amber-500/5 to-amber-500/0", dot: "bg-amber-500" },
  danger: { color: "#ef4444", bg: "from-red-500/5 to-red-500/0", dot: "bg-red-500" },
  inactive: { color: "#6b7280", bg: "from-gray-500/3 to-gray-500/0", dot: "bg-muted-foreground" },
};

export function StatusCard({
  title, value, subtitle, icon, status = "inactive", className, testId,
}: StatusCardProps) {
  const renderIcon = () => {
    if (isValidElement(icon)) return icon;
    if (typeof icon === "function") {
      const Icon = icon as LucideIcon;
      return <Icon className="h-4 w-4" />;
    }
    return null;
  };

  const s = ringStyles[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={cn("panel rounded-lg overflow-hidden", className)}
      data-testid={testId}
    >
      <div className={cn("bg-gradient-to-br", s.bg)}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{ background: `${s.color}12` }}
            >
              {renderIcon()}
            </div>
            <motion.div
              className="absolute -inset-0.5 rounded-lg"
              style={{ border: `1.5px solid ${s.color}30` }}
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <motion.div
                className={cn("w-1.5 h-1.5 rounded-full", s.dot)}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
            </div>
            <motion.div
              className="text-lg sm:text-xl font-bold tracking-tight"
              data-testid={`${testId}-value`}
              key={value}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {value}
            </motion.div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
