"use client";
import { Moon, Sun, Wifi, WifiOff, RefreshCw, Settings as SettingsIcon, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface HeaderProps {
  onSettingsClick: () => void;
  onRefresh: () => void;
  isOnline: boolean;
}

export function Header({ onSettingsClick, onRefresh, isOnline }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    setIsDark(theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "glass border-b border-border/40" : ""
      }`}
    >
      <div className="pl-4 pr-4 sm:pr-6 lg:pr-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          <motion.div
            className="flex items-center gap-3 min-w-0"
            data-testid="brand-logo"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div className="leading-none">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold tracking-tight">
                  <span className="gradient-text">climaneer</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">v2</span>
              </div>
              <span className="text-[11px] text-muted-foreground/60 tracking-wide">future of farming</span>
            </div>
          </motion.div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
              {isOnline ? (
                <>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <Wifi className="h-3 w-3 text-emerald-500 hidden sm:block" />
                  <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  <WifiOff className="h-3 w-3 text-destructive hidden sm:block" />
                  <span className="text-[11px] font-medium text-destructive hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              <motion.div
                key={isDark ? "sun" : "moon"}
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </motion.div>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 hidden sm:inline-flex"
              data-testid="button-refresh"
              disabled={isRefreshing}
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>

            <Button
              onClick={onSettingsClick}
              className="h-8 sm:h-9 bg-foreground hover:bg-foreground/90 text-background px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium"
              size="icon"
              data-testid="button-settings"
            >
              <SettingsIcon className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
