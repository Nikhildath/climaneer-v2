"use client";
import { Activity, Bell, Clock, LayoutDashboard, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  alertCount: number;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "devices", label: "Devices", icon: Cpu },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "alerts", label: "Alerts", icon: Bell, showBadge: true },
  { id: "history", label: "History", icon: Clock },
];

function TabButton({
  tab, isActive, alertCount, onClick, layout,
}: {
  tab: (typeof tabs)[0];
  isActive: boolean;
  alertCount: number;
  onClick: () => void;
  layout: "mobile" | "desktop";
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      data-testid={`tab-${tab.id}`}
      className={cn(
        "relative transition-all touch-target",
        isActive
          ? "text-foreground"
          : "text-muted-foreground/60 hover:text-muted-foreground",
        layout === "mobile"
          ? "flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[9px] font-semibold"
          : "flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
      )}
    >
      <div className="relative flex items-center justify-center">
        <Icon className={cn(layout === "mobile" ? "h-5 w-5" : "h-4 w-4")} />
        {tab.showBadge && alertCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "absolute rounded-full bg-accent font-bold text-accent-foreground flex items-center justify-center",
              layout === "mobile"
                ? "-top-1 -right-2 h-3.5 min-w-[14px] px-0.5 text-[7px] leading-none"
                : "-top-1 -right-2 h-3.5 min-w-[14px] px-0.5 text-[8px] sm:static sm:h-4 sm:min-w-4 sm:px-1 sm:text-[9px] sm:ml-1 sm:top-0 sm:right-0"
            )}
            data-testid="alert-count"
          >
            {alertCount > 99 ? "99+" : alertCount}
          </motion.span>
        )}
      </div>
      <span>{tab.label}</span>
      {isActive && (
        <motion.div
          layoutId={`active-pill-${layout}`}
          className={cn(
            "absolute bg-foreground/10 rounded-full",
            layout === "mobile"
              ? "inset-1"
              : "inset-0.5"
          )}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );
}

export function NavigationTabs({ activeTab, onTabChange, alertCount }: NavigationTabsProps) {
  return (
    <>
      {/* Mobile: floating pill bar */}
      <nav className="fixed bottom-3 left-3 right-3 z-50 sm:hidden">
        <div className="flex items-stretch rounded-xl bg-card/80 backdrop-blur-2xl border border-border/40 shadow-lg px-1 py-0.5">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              alertCount={tab.showBadge ? alertCount : 0}
              onClick={() => onTabChange(tab.id)}
              layout="mobile"
            />
          ))}
        </div>
      </nav>

      {/* Desktop: inline pill bar */}
      <nav className="sticky top-14 sm:top-16 z-40 hidden sm:block bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 py-2">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                alertCount={tab.showBadge ? alertCount : 0}
                onClick={() => onTabChange(tab.id)}
                layout="desktop"
              />
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
