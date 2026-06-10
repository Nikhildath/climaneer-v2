import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, isValidElement } from "react";

interface StatusCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon | ReactNode;
  status?: "active" | "warning" | "danger" | "inactive";
  className?: string;
  testId?: string;
}

const statusColors = {
  active: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  inactive: "bg-muted-foreground",
};

export function StatusCard({
  title,
  value,
  subtitle,
  icon,
  status = "inactive",
  className,
  testId,
}: StatusCardProps) {
  // Determine if icon is already a rendered element or needs to be rendered
  const renderIcon = () => {
    if (isValidElement(icon)) {
      // Already a rendered React element
      return icon;
    } else if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
      // It's a component (function or ForwardRef) - render it as JSX
      const Icon = icon as LucideIcon;
      return <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />;
    }
    return null;
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden p-4 sm:p-6 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10",
        className
      )}
      data-testid={testId}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", statusColors[status], status === "active" && "animate-pulse-glow")} />
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>

          {/* Value */}
          <div>
            <div className="text-xl sm:text-2xl font-bold" data-testid={`${testId}-value`}>
              {value}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Icon */}
        <div className="flex-shrink-0 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg bg-muted/50">
          {renderIcon()}
        </div>
      </div>
    </Card>
  );
}
