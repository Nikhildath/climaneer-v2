"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { addNetworkStatusListener, getNetworkStatus } from "@/lib/capacitor-network";
import type {
  SensorReading,
  SystemStatus,
  Alert as AlertType,
  Settings,
  TrendData,
} from "@/shared/schema";

// ── Types ────────────────────────────────────────────────────────────────────
export type HistoryEntry = { id: string; timestamp: string; sensors: SensorReading };

interface AppContextValue {
  // Data
  sensorData: SensorReading | undefined;
  systemStatus: SystemStatus | undefined;
  aiRecommendation: string | undefined;
  sensorTrends: SensorReading[];
  alerts: AlertType[];
  settings: Omit<Settings, "id">;
  history: HistoryEntry[];
  trendData: TrendData;
  // UI state
  isLoading: boolean;
  isOnline: boolean;
  settingsOpen: boolean;
  exportOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  // Actions
  handleRefresh: () => Promise<void>;
  handleSettingsSave: (newSettings: Omit<Settings, "id">) => void;
  handleAlertDismiss: (id: string) => void;
  handleAlertMarkRead: (id: string) => void;
  handleClearAllAlerts: () => void;
  togglePump: (turnOn: boolean) => Promise<void>;
  switchToAutoMode: () => Promise<void>;
  switchToManualMode: () => Promise<void>;
  switchToScheduledMode: () => Promise<void>;
  unreadAlertCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

const FALLBACK_FIREBASE_URL =
  process.env.NEXT_PUBLIC_FIREBASE_URL ||
  "https://climaneer-1b461-default-rtdb.asia-southeast1.firebasedatabase.app";

function getFirebaseUrl(settings: Omit<Settings, "id">): string {
  return settings.firebaseUrl?.trim() || FALLBACK_FIREBASE_URL;
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const [sensorData, setSensorData] = useState<SensorReading | undefined>(undefined);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | undefined>(undefined);
  const [aiRecommendation, setAiRecommendation] = useState<string | undefined>(undefined);
  const [sensorTrends, setSensorTrends] = useState<SensorReading[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const alertTrackingRef = useRef<Map<string, number>>(new Map());

  const [alerts, setAlerts] = useState<AlertType[]>([
    {
      id: "1",
      type: "info",
      title: "System Started",
      message: "CLIMANEER dashboard is now online and monitoring sensors",
      timestamp: new Date().toISOString(),
      read: false,
    },
    {
      id: "2",
      type: "success",
      title: "Soil Moisture Optimal",
      message: "Soil moisture levels are within optimal range (65%)",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      read: true,
    },
  ]);

  const DEFAULT_SETTINGS: Omit<Settings, "id"> = {
    soundAlerts: true,
    pushNotifications: true,
    moistureThreshold: 30,
    batteryThreshold: 20,
    temperatureUnit: "celsius",
    pollInterval: 5000,
    darkMode: false,
    controlMode: "automatic",
    scheduledSettings: { enabled: false, startTime: "08:00", endTime: "18:00", durationMinutes: 30 },
    airQualityThreshold: 150,
    temperatureHighThreshold: 35,
    temperatureLowThreshold: 5,
    humidityHighThreshold: 80,
    humidityLowThreshold: 20,
    waterLevelLowThreshold: 20,
    aiProvider: "auto",
    geminiApiKey: "",
    openrouterApiKey: "",
    geminiModel: "gemini-2.0-flash-lite",
    openrouterModel: "openai/gpt-4o-mini",
    firebaseUrl: "",
  };

  const [settings, setSettings] = useState<Omit<Settings, "id">>(DEFAULT_SETTINGS);

  // Hydrate settings from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("climaSettings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, firebaseUrl: parsed.firebaseUrl || "" });
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [trendData] = useState<TrendData>({
    timestamps: ["12:00", "13:00", "14:00", "15:00", "16:00"],
    moisture: [60, 62, 65, 63, 65],
    humidity: [50, 52, 55, 54, 55],
    temperature: [22, 23, 24, 24, 24],
    ph: [6.5, 6.7, 6.8, 6.8, 6.8],
    waterLevel: [78, 77, 76, 75, 75],
    flow: [2.3, 2.5, 2.5, 2.4, 2.5],
  });

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sensorTrends");
      if (stored) setSensorTrends(JSON.parse(stored));
    } catch (e) { /* ignore */ }

    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // ── Online/Offline detection ────────────────────────────────────────────────
  useEffect(() => {
    let removeNetworkListener: (() => void) | null = null;
    let mounted = true;

    const initNetwork = async () => {
      const status = await getNetworkStatus();
      if (!mounted) return;
      setIsOnline(status.connected);
    };

    initNetwork();

    addNetworkStatusListener((status) => {
      setIsOnline(status.connected);
      if (status.connected) {
        toast({ title: "Back Online", description: "Connection restored. Syncing data..." });
      } else {
        toast({ title: "Offline", description: "You're viewing cached data", variant: "destructive" });
      }
    }).then((remove) => {
      removeNetworkListener = remove;
    });

    return () => {
      mounted = false;
      removeNetworkListener?.();
    };
  }, [toast]);

  // ── Firebase helpers ────────────────────────────────────────────────────────
  function mapFirebaseSensors(sensors: any): SensorReading | undefined {
    if (!sensors) return undefined;
    const now = new Date().toISOString();
    return {
      id: sensors.id ?? "firebase-sensor",
      timestamp: sensors.timestamp ?? now,
      soilMoisture: Number(sensors.soil_moisture ?? sensors.soilMoisture ?? 0),
      airHumidity: Number(sensors.air_humidity ?? sensors.airHumidity ?? 0),
      waterLevel: Number(sensors.water_level ?? sensors.waterLevel ?? 0),
      pH: Number(sensors.ph ?? sensors.pH ?? 0),
      airTemperature: Number(sensors.air_temp ?? sensors.airTemperature ?? 0),
      waterTemperature: Number(sensors.water_temp ?? sensors.waterTemperature ?? 0),
      airQuality: Number(sensors.air_quality ?? sensors.airQuality ?? 0),
      flowRate: Number(sensors.flow ?? sensors.flowRate ?? 0),
      battery: Number(sensors.battery ?? 0),
    };
  }

  function mapFirebaseControls(controls: any): SystemStatus | undefined {
    if (!controls) return undefined;
    const pumpOn = controls.pump === true || controls.pump === "on" || controls.pump === 1;
    const mode = controls.mode?.toString().toLowerCase() ?? (controls.manual_override ? "manual" : "automatic");
    return {
      uptime: Number(controls.uptime ?? 0),
      pumpStatus: pumpOn ? "running" : "stopped",
      pumpRuntime: Number(controls.pump_runtime ?? controls.pumpRuntime ?? 0),
      controlMode: mode === "manual" ? "manual" : "automatic",
      networkSignal: controls.firebase_online ? "strong" : "weak",
      dataUsage: Number(controls.dataUsage ?? 0),
    };
  }

  const fetchFirebaseOnce = useCallback(async () => {
    const url = `${getFirebaseUrl(settingsRef.current)}/.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    const data = await res.json();

    const firebaseSensors = mapFirebaseSensors(data?.sensors);
    const firebaseStatus = mapFirebaseControls(data?.controls);

    if (firebaseSensors) {
      setSensorData(firebaseSensors);

      setSensorTrends((prev) => {
        const updated = [...prev, firebaseSensors];
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = updated.filter((s) => new Date(s.timestamp).getTime() > cutoffTime);
        try { localStorage.setItem("sensorTrends", JSON.stringify(filtered)); } catch (e) { /* ignore */ }
        return filtered;
      });

      try {
        const newEntry: HistoryEntry = {
          id: firebaseSensors.id ?? String(Date.now()),
          timestamp: firebaseSensors.timestamp ?? new Date().toISOString(),
          sensors: firebaseSensors,
        };
        setHistory((prev) => [newEntry, ...prev].slice(0, 1000));
      } catch (e) { /* ignore */ }

      // Alert generation
      try {
        const ALERT_COOLDOWN = 60 * 60 * 1000;
        const now = Date.now();

        const maybeAddAlert = (type: AlertType["type"], title: string, message: string) => {
          const lastAlertTime = alertTrackingRef.current.get(title) ?? 0;
          if (now - lastAlertTime < ALERT_COOLDOWN) return;
          alertTrackingRef.current.set(title, now);
          const alert: AlertType = {
            id: `${type}-${now}`,
            type, title, message,
            timestamp: new Date().toISOString(),
            read: false,
          };
          setAlerts((prev) => [alert, ...prev].slice(0, 200));

          // Push notification
          if (settingsRef.current.pushNotifications && "Notification" in window && Notification.permission === "granted") {
            try { new Notification(title, { body: message, icon: "/icon-192.png" }); } catch {}
          }
          // Sound alert
          if (settingsRef.current.soundAlerts) {
            playAlertBeep();
          }
        };

        setSettings((currentSettings) => {
          const s = currentSettings;
          if (firebaseSensors.soilMoisture < (s.moistureThreshold ?? 30))
            maybeAddAlert("warning", "Low Soil Moisture", `Soil moisture is ${firebaseSensors.soilMoisture}%, below threshold ${s.moistureThreshold ?? 30}%`);
          if (typeof firebaseSensors.battery === "number" && firebaseSensors.battery < (s.batteryThreshold ?? 20))
            maybeAddAlert("warning", "Low Battery", `Sensor battery is ${firebaseSensors.battery}%, below ${s.batteryThreshold ?? 20}%`);
          if (typeof firebaseSensors.pH === "number" && (firebaseSensors.pH < 6.0 || firebaseSensors.pH > 8.0))
            maybeAddAlert("warning", "pH Out of Range", `pH level is ${firebaseSensors.pH.toFixed(1)} — expected between 6.0 and 8.0`);
          const aqiThreshold = (s as any).airQualityThreshold ?? 150;
          if (typeof firebaseSensors.airQuality === "number" && firebaseSensors.airQuality > aqiThreshold) {
            const aqi = firebaseSensors.airQuality;
            const quality = aqi > 300 ? "Hazardous" : aqi > 200 ? "Very Unhealthy" : aqi > 150 ? "Unhealthy" : "Unknown";
            maybeAddAlert("danger", "Poor Air Quality", `Air quality index is ${aqi} (${quality}) — threshold: ${aqiThreshold}`);
          }
          const tempHigh = (s as any).temperatureHighThreshold ?? 35;
          const tempLow = (s as any).temperatureLowThreshold ?? 5;
          if (typeof firebaseSensors.airTemperature === "number") {
            if (firebaseSensors.airTemperature > tempHigh)
              maybeAddAlert("danger", "High Temperature", `Air temperature is ${firebaseSensors.airTemperature}°C, exceeds max threshold ${tempHigh}°C`);
            else if (firebaseSensors.airTemperature < tempLow)
              maybeAddAlert("warning", "Low Temperature", `Air temperature is ${firebaseSensors.airTemperature}°C, below min threshold ${tempLow}°C`);
          }
          const humidityHigh = (s as any).humidityHighThreshold ?? 80;
          const humidityLow = (s as any).humidityLowThreshold ?? 20;
          if (typeof firebaseSensors.airHumidity === "number") {
            if (firebaseSensors.airHumidity > humidityHigh)
              maybeAddAlert("warning", "High Humidity", `Air humidity is ${firebaseSensors.airHumidity}%, exceeds max threshold ${humidityHigh}%`);
            else if (firebaseSensors.airHumidity < humidityLow)
              maybeAddAlert("warning", "Low Humidity", `Air humidity is ${firebaseSensors.airHumidity}%, below min threshold ${humidityLow}%`);
          }
          const waterLevelLow = (s as any).waterLevelLowThreshold ?? 20;
          if (typeof firebaseSensors.waterLevel === "number" && firebaseSensors.waterLevel < waterLevelLow)
            maybeAddAlert("warning", "Low Water Level", `Water level is ${firebaseSensors.waterLevel}%, below threshold ${waterLevelLow}%`);

          return currentSettings; // no actual change to settings
        });
      } catch (e) { console.error("[Alert Generation Error]", e); }
    }

    if (firebaseStatus) setSystemStatus(firebaseStatus);
    if (data?.ai?.recommendation) setAiRecommendation(String(data.ai.recommendation));

    return data;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await fetchFirebaseOnce();
      } catch (err: any) {
        toast({ title: "Failed to load data", description: String(err), variant: "destructive" });
      }
    })();

    const id = setInterval(() => {
      if (!mounted) return;
      fetchFirebaseOnce().catch(() => {});
    }, settings.pollInterval ?? 5000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [settings.pollInterval, fetchFirebaseOnce]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  useEffect(() => {
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const handleTouchEnd = (e: TouchEvent) => {
      const distance = e.changedTouches[0].clientY - touchStartY;
      if (distance > 100 && window.scrollY === 0) handleRefresh();
    };
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Settings persistence + dark mode + notifications ─────────────────────────
  useEffect(() => {
    try { localStorage.setItem("climaSettings", JSON.stringify(settings)); } catch {}
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", settings.darkMode ? "dark" : "light");
  }, [settings]);

  // Request notification permission once on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Play a short beep sound via AudioContext
  function playAlertBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  // ── Firebase upload ─────────────────────────────────────────────────────────
  async function uploadControlsToFirebase(controls: Record<string, unknown>) {
    const url = `${getFirebaseUrl(settingsRef.current)}/controls.json`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(controls),
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return await res.json();
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    toast({ title: "Refreshing", description: "Updating sensor data..." });
    try {
      await fetchFirebaseOnce();
      toast({ title: "Updated", description: "All sensor data refreshed" });
    } catch (err: any) {
      toast({ title: "Refresh failed", description: err.message ?? String(err), variant: "destructive" });
    }
  };

  const handleSettingsSave = (newSettings: Omit<Settings, "id">) => {
    setSettings(newSettings);
    try { localStorage.setItem("climaSettings", JSON.stringify(newSettings)); } catch {}
    toast({ title: "Settings Saved", description: "Your preferences have been updated" });
    (async () => {
      try {
        const mode = newSettings.controlMode ?? "automatic";
        const isManual = mode === "manual";
        const isScheduled = mode === "scheduled";
        const controls: Record<string, unknown> = {
          pump: systemStatus?.pumpStatus === "running",
          manual_override: isManual,
          mode: isManual ? "manual" : isScheduled ? "scheduled" : "FIREBASE",
          last_settings_saved_at: new Date().toISOString(),
        };
        if (isScheduled && newSettings.scheduledSettings) {
          controls.scheduled_start_time = newSettings.scheduledSettings.startTime;
          controls.scheduled_end_time = newSettings.scheduledSettings.endTime;
          controls.scheduled_duration_minutes = newSettings.scheduledSettings.durationMinutes;
          controls.scheduled_enabled = newSettings.scheduledSettings.enabled;
        }
        await uploadControlsToFirebase(controls);
        toast({ title: "Settings synced", description: "Settings uploaded to Firebase" });
      } catch (err: any) {
        toast({ title: "Sync failed", description: String(err), variant: "destructive" });
      }
    })();
  };

  const handleAlertDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Alert Dismissed", description: "Alert removed from list" });
  };

  const handleAlertMarkRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
    toast({ title: "Alerts Cleared", description: "All alerts have been removed" });
  };

  const togglePump = async (turnOn: boolean) => {
    setSystemStatus((prev) => (prev ? { ...prev, pumpStatus: turnOn ? "running" : "stopped" } : prev));
    try {
      await uploadControlsToFirebase({
        pump: turnOn,
        manual_override: true,
        mode: "manual",
        last_manual_pump_change: new Date().toISOString(),
      });
      toast({ title: `Pump ${turnOn ? "enabled" : "disabled"}`, description: "Control updated in Firebase" });
    } catch (err: any) {
      setSystemStatus((prev) => (prev ? { ...prev, pumpStatus: !turnOn ? "running" : "stopped" } : prev));
      toast({ title: "Failed to toggle pump", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  const switchToAutoMode = async () => {
    try {
      await uploadControlsToFirebase({ manual_override: false, mode: "FIREBASE", last_mode_change: new Date().toISOString() });
      setSettings((prev) => ({ ...prev, controlMode: "automatic" }));
      toast({ title: "Auto Mode Enabled", description: "System returned to automatic control" });
    } catch (err: any) {
      toast({ title: "Failed to switch to auto mode", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  const switchToManualMode = async () => {
    try {
      await uploadControlsToFirebase({ manual_override: true, mode: "MANUAL", last_mode_change: new Date().toISOString() });
      setSettings((prev) => ({ ...prev, controlMode: "manual" }));
      toast({ title: "Manual Mode Enabled", description: "System switched to manual control" });
    } catch (err: any) {
      toast({ title: "Failed to switch to manual mode", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  const switchToScheduledMode = async () => {
    try {
      await uploadControlsToFirebase({ manual_override: false, mode: "scheduled", last_mode_change: new Date().toISOString() });
      setSettings((prev) => ({ ...prev, controlMode: "scheduled" }));
      toast({ title: "Scheduled Mode Enabled", description: "System switched to scheduled control" });
    } catch (err: any) {
      toast({ title: "Failed to switch to scheduled mode", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  // ── Scheduled mode runner ──────────────────────────────────────────────────
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const parseToday = (hhmm?: string) => {
      if (!hhmm) return null;
      const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      return d;
    };
    const isNowInWindow = (start?: string, end?: string) => {
      const now = new Date();
      const s = parseToday(start);
      const e = parseToday(end);
      if (!s || !e) return false;
      if (e.getTime() <= s.getTime()) return now.getTime() >= s.getTime() || now.getTime() <= e.getTime();
      return now.getTime() >= s.getTime() && now.getTime() <= e.getTime();
    };

    if (scheduleTimerRef.current) { clearTimeout(scheduleTimerRef.current); scheduleTimerRef.current = null; }

    const runScheduleCheck = async () => {
      try {
        const mode = settings.controlMode ?? "automatic";
        const sched = settings.scheduledSettings;
        if (mode !== "scheduled" || !sched?.enabled) return;
        const within = isNowInWindow(sched.startTime, sched.endTime);
        if (within && systemStatus?.pumpStatus !== "running") {
          await togglePump(true);
          toast({ title: "Scheduled Pump Started", description: `Pump running until ${sched.endTime} (duration: ${sched.durationMinutes} min)` });
          const ms = (sched.durationMinutes ?? 0) * 60 * 1000;
          if (ms > 0) {
            scheduleTimerRef.current = setTimeout(async () => {
              try {
                await togglePump(false);
                toast({ title: "Scheduled Pump Stopped", description: "Scheduled cycle completed. Pump turned off." });
                await uploadControlsToFirebase({ manual_override: false, mode: "FIREBASE" });
              } catch (e) { /* ignore */ }
            }, ms);
          }
        }
      } catch (e) { /* ignore */ }
    };

    runScheduleCheck();
    const intervalId = setInterval(() => runScheduleCheck(), 30 * 1000);

    return () => {
      clearInterval(intervalId);
      if (scheduleTimerRef.current) { clearTimeout(scheduleTimerRef.current); scheduleTimerRef.current = null; }
    };
  }, [settings.controlMode, settings.scheduledSettings, systemStatus?.pumpStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const value: AppContextValue = {
    sensorData, systemStatus, aiRecommendation, sensorTrends,
    alerts, settings, history, trendData,
    isLoading, isOnline, settingsOpen, exportOpen,
    setSettingsOpen, setExportOpen,
    handleRefresh, handleSettingsSave,
    handleAlertDismiss, handleAlertMarkRead, handleClearAllAlerts,
    togglePump, switchToAutoMode, switchToManualMode, switchToScheduledMode,
    unreadAlertCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
