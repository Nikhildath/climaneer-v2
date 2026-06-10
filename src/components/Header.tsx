import { Moon, Sun, Wifi, WifiOff, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface HeaderProps {
  onSettingsClick: () => void;
  onRefresh: () => void;
  isOnline: boolean;
}

export function Header({ onSettingsClick, onRefresh, isOnline }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check if user has a theme preference
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    
    setIsDark(theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newTheme);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-3 sm:px-6">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-3" data-testid="brand-logo">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-glow-emerald">
              <i className="fas fa-seedling text-white text-sm sm:text-lg"></i>
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight gradient-text leading-tight">
                CLIMANEER
              </h1>
              <p className="hidden sm:block text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight">
                Smart Agriculture
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Online dot (mobile) / full status (desktop) */}
            <div className="flex sm:hidden h-2 w-2 rounded-full" data-testid="connection-status-mobile">
              <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse-glow" : "bg-destructive"}`} />
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50" data-testid="connection-status">
              {isOnline ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Online</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <WifiOff className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Offline</span>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 sm:h-10 sm:w-10"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>

            {/* Refresh Button */}
            <Button
              variant="secondary"
              size="icon"
              onClick={handleRefresh}
              className="h-9 w-9 sm:h-10 sm:w-10 hidden sm:inline-flex"
              data-testid="button-refresh"
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>

            {/* Settings Button */}
            <Button
              onClick={onSettingsClick}
              className="h-9 sm:h-10 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-glow-emerald px-2 sm:px-4"
              size="icon"
              data-testid="button-settings"
            >
              <SettingsIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
