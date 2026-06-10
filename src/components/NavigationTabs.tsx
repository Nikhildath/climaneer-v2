import { Activity, Bell, Clock, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  alertCount: number;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "alerts", label: "Alerts", icon: Bell, showBadge: true },
  { id: "history", label: "History", icon: Clock },
];

function TabButton({
  tab,
  isActive,
  alertCount,
  onClick,
  layout,
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
        "transition-all touch-target hover:text-primary",
        isActive ? "text-primary" : "text-muted-foreground",
        layout === "mobile"
          ? "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold relative"
          : "flex items-center gap-2 px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold relative"
      )}
    >
      <div className="relative">
        <Icon className={cn(layout === "mobile" ? "h-5 w-5" : "h-4 w-4")} />
        {tab.showBadge && alertCount > 0 && (
          <span
            className={cn(
              "absolute rounded-full bg-destructive font-bold text-destructive-foreground flex items-center justify-center",
              layout === "mobile"
                ? "-top-1.5 -right-2 h-4 min-w-4 px-0.5 text-[9px]"
                : "-top-1 -right-2 h-4 w-4 text-[9px] sm:static sm:h-5 sm:min-w-5 sm:px-1.5 sm:text-xs sm:ml-1"
            )}
            data-testid="alert-count"
          >
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </div>
      <span className={layout === "desktop" ? "whitespace-nowrap" : ""}>{tab.label}</span>
      {isActive && layout === "desktop" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-t-full" />
      )}
      {isActive && layout === "mobile" && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-b-full" />
      )}
    </button>
  );
}

export function NavigationTabs({ activeTab, onTabChange, alertCount }: NavigationTabsProps) {
  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-bottom shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch">
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

      {/* Desktop top nav */}
      <nav className="sticky top-14 sm:top-16 z-40 hidden sm:block w-full border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-3 sm:px-6">
          <div className="flex gap-1">
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
