"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { addNetworkStatusListener, getNetworkStatus } from "@/lib/capacitor-network";
import { getSocket, onSocketEvent, removeSocketEvent, emitSocket } from "@/lib/socket-client";
import { useSensorStore } from "@/store/sensor-store";
import type { SensorReading, SystemStatus, Alert as AlertType, Settings, TrendData } from "@/shared/schema";

export type HistoryEntry = { id: string; timestamp: string; sensors: SensorReading };

interface AppContextValue {
  sensorData: SensorReading | undefined;
  systemStatus: SystemStatus | undefined;
  aiRecommendation: string | undefined;
  sensorTrends: SensorReading[];
  alerts: AlertType[];
  settings: Omit<Settings, "id">;
  history: HistoryEntry[];
  trendData: TrendData;
  isLoading: boolean;
  isOnline: boolean;
  settingsOpen: boolean;
  exportOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
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

function getSensorReading(store: ReturnType<typeof useSensorStore.getState>): SensorReading | undefined {
  const sensors = store.effectiveSensors || store.realSensors;
  if (!sensors) return undefined;
  return {
    id: `${store.deviceId || "default"}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    soilMoisture: sensors.soil_moisture ?? 0,
    airHumidity: sensors.air_humidity ?? 0,
    waterLevel: sensors.water_level ?? 0,
    pH: sensors.ph ?? 7.0,
    airTemperature: sensors.air_temp ?? 0,
    waterTemperature: sensors.water_temp ?? 0,
    airQuality: sensors.air_quality ?? 0,
    flowRate: sensors.flow ?? 0,
    battery: sensors.battery ?? 100,
  };
}

function mapStoreToSystemStatus(store: ReturnType<typeof useSensorStore.getState>): SystemStatus {
  const mode = (store.controls.mode || "AUTO").toUpperCase();
  return {
    uptime: 99.5,
    pumpStatus: store.controls.pump ? "running" : "stopped",
    pumpRuntime: 0,
    controlMode: mode === "MANUAL" ? "manual" : mode === "SCHEDULED" ? "scheduled" : "automatic",
    networkSignal: "strong",
    dataUsage: 0,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const store = useSensorStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const alertTrackingRef = useRef<Map<string, number>>(new Map());
  const initializedRef = useRef(false);

  // Fallback: show dashboard even if socket never connects
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const [alerts, setAlerts] = useState<AlertType[]>([
    { id: "1", type: "info", title: "System Started", message: "climaneer v2 dashboard is now online and monitoring sensors", timestamp: new Date().toISOString(), read: false },
    { id: "2", type: "success", title: "Server Connected", message: "Socket.IO connection established", timestamp: new Date(Date.now() - 1800000).toISOString(), read: true },
  ]);

  const DEFAULT_SETTINGS: Omit<Settings, "id"> = {
    soundAlerts: true, pushNotifications: true, moistureThreshold: 30, batteryThreshold: 20,
    temperatureUnit: "celsius", pollInterval: 5000, darkMode: false, controlMode: "automatic",
    scheduledSettings: { enabled: false, startTime: "08:00", endTime: "18:00", durationMinutes: 30 },
    airQualityThreshold: 150, temperatureHighThreshold: 35, temperatureLowThreshold: 5,
    humidityHighThreshold: 80, humidityLowThreshold: 20, waterLevelLowThreshold: 20,
    aiMode: true, aiProvider: "auto", geminiApiKey: "", openrouterApiKey: "",
    geminiModel: "gemini-2.0-flash-lite", openrouterModel: "openai/gpt-4o-mini",
  };

  const [settings, setSettings] = useState<Omit<Settings, "id">>(DEFAULT_SETTINGS);
  const mountedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("climaSettings");
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("[Settings] Loaded from localStorage:", Object.keys(parsed));
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        console.log("[Settings] No saved settings found, using defaults");
      }
    } catch (e) {
      console.warn("[Settings] Failed to load from localStorage:", e);
    }
    mountedRef.current = true;
  }, []);

  const sensorTrends = store.sensorTrends;
  const history = store.history;
  const trendData = store.trendData;

  const sensorData: SensorReading | undefined = getSensorReading(store);
  const systemStatus: SystemStatus = mapStoreToSystemStatus(store);
  const aiRecommendation = store.aiRecommendation || "";

  // Socket.IO connection
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    getSocket(); // triggers auto-connect

    onSocketEvent("sensor_update", (data: any) => {
      console.log("[Socket] sensor_update received:", data?.device_id, data?.sensors?.soil_moisture);
      store.setSensorData(data);
    });

    onSocketEvent("ai_recommendation", (data: any) => {
      store.setAIRecommendation(data.recommendation);
    });

    onSocketEvent("device_list", (devices: any[]) => {
      store.setDevices(devices);
    });

    onSocketEvent("device_status", (data: any) => {
      store.setDeviceOnline({ device_id: data.device_id, online: data.online });
    });

    onSocketEvent("device_disconnected", (data: any) => {
      store.setDeviceOnline({ device_id: data.device_id, online: false });
      toast({
        title: "Device Disconnected",
        description: `${data.device_id} went offline`,
        variant: "destructive",
      });
    });

    onSocketEvent("device_registered", (data: any) => {
      toast({
        title: "New Device",
        description: `${data.device_id} registered`,
      });
      store.setDeviceId(data.device_id);
    });

    onSocketEvent("register", (data: any) => {
      console.log("[AppContext] Device registered via server HTML:", data);
      store.setDeviceId(data.device_id);
    });

    onSocketEvent("overrides_update", (data: any) => {
      store.setOverrides(data.overrides || []);
      store.setTestingMode(data.override_active || false);
    });

    onSocketEvent("controls_update", (data: any) => {
      store.setControls({
        pump: !!data.pump,
        mode: data.mode || "AUTO",
        manual_override: !!data.manual_override,
      });
    });

    onSocketEvent("command_status", (data: any) => {
      const { device_id, command, status } = data;
      const label = command === "pump" ? "Pump" : command === "mode" ? "Mode" : command;
      if (status === "sent") {
        toast({ title: `${label} Command Sent`, description: `Command delivered to ${device_id}` });
      } else if (status === "applied_simulation") {
        toast({ title: `${label} Updated`, description: `${label} state updated on server (simulation)` });
      } else {
        toast({ title: `${label} Status`, description: `${label}: ${status}` });
      }
    });

    onSocketEvent("connect", () => {
      store.setConnected(true);
      setIsLoading(false);
      toast({ title: "Connected", description: "Socket.IO connection established" });
    });

    onSocketEvent("disconnect", () => {
      store.setConnected(false);
      toast({ title: "Disconnected", description: "Socket.IO connection lost", variant: "destructive" });
    });

    onSocketEvent("connect_error", (err: any) => {
      console.error("[Socket] Error:", err?.message || err);
      setIsLoading(false);
    });

    onSocketEvent("error", (data: any) => {
      toast({ title: "Server Error", description: data.message, variant: "destructive" });
    });

    return () => {
      // Don't disconnect — socket is a module singleton managed by socket-client.ts
    };
  }, []);

  // Network status
  useEffect(() => {
    let removeNetworkListener: (() => void) | null = null;
    let mounted = true;
    getNetworkStatus().then((status) => { if (mounted) setIsOnline(status.connected); });
    addNetworkStatusListener((status) => {
      setIsOnline(status.connected);
      if (status.connected) {
        toast({ title: "Back Online", description: "Connection restored. Reconnecting Socket.IO..." });
        getSocket().connect();
      } else {
        toast({ title: "Offline", description: "Network connection lost", variant: "destructive" });
      }
    }).then((remove) => { removeNetworkListener = remove; });
    return () => { mounted = false; removeNetworkListener?.(); };
  }, [toast]);

  // Alert generation
  useEffect(() => {
    if (!sensorData) return;
    const now = Date.now();
    const cooldown = 300000;

    if (sensorData.soilMoisture < settings.moistureThreshold) {
      const key = "soil_low";
      const last = alertTrackingRef.current.get(key) || 0;
      if (now - last > cooldown) {
        alertTrackingRef.current.set(key, now);
        const alert: AlertType = { id: `alert-${now}`, type: "warning", title: "Low Soil Moisture", message: `Soil moisture at ${sensorData.soilMoisture}%, below threshold`, timestamp: new Date().toISOString(), read: false };
        setAlerts((prev) => [alert, ...prev].slice(0, 50));
        if (settings.pushNotifications && "Notification" in window && Notification.permission === "granted") {
          new Notification("climaneer v2 Alert", { body: alert.message, icon: "/icon.png" });
        }
        if (settings.soundAlerts) playAlertBeep();
      }
    }

    if (sensorData.battery < settings.batteryThreshold) {
      const key = "battery_low";
      const last = alertTrackingRef.current.get(key) || 0;
      if (now - last > cooldown) {
        alertTrackingRef.current.set(key, now);
        const alert: AlertType = { id: `alert-${now}`, type: "danger", title: "Low Battery", message: `Battery at ${sensorData.battery}%`, timestamp: new Date().toISOString(), read: false };
        setAlerts((prev) => [alert, ...prev].slice(0, 50));
        if (settings.pushNotifications && "Notification" in window && Notification.permission === "granted") {
          new Notification("climaneer v2 Alert", { body: alert.message, icon: "/icon.png" });
        }
      }
    }

    if ((sensorData.pH < 5.5 || sensorData.pH > 8.0)) {
      const key = "ph_extreme";
      const last = alertTrackingRef.current.get(key) || 0;
      if (now - last > cooldown) {
        alertTrackingRef.current.set(key, now);
        const alert: AlertType = { id: `alert-${now}`, type: "warning", title: "pH Level Alert", message: `pH at ${sensorData.pH.toFixed(1)}`, timestamp: new Date().toISOString(), read: false };
        setAlerts((prev) => [alert, ...prev].slice(0, 50));
      }
    }
  }, [sensorData, settings.moistureThreshold, settings.batteryThreshold, settings.pushNotifications, settings.soundAlerts]);

  // Settings persistence and dark mode
  useEffect(() => {
    if (mountedRef.current) {
      try {
        localStorage.setItem("climaSettings", JSON.stringify(settings));
      } catch (e) {
        console.warn("[Settings] Failed to save to localStorage:", e);
      }
    }
    if (settings.darkMode) { document.documentElement.classList.add("dark"); } else { document.documentElement.classList.remove("dark"); }
  }, [settings]);

  useEffect(() => {
    (async () => {
      try {
        const { isCapacitorAvailable } = await import("@/lib/capacitor-platform");
        const { requestAllPermissions } = await import("@/lib/capacitor-permissions");
        await requestAllPermissions();
      } catch { /* ignore */ }
    })();
  }, []);

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

  const handleRefresh = useCallback(async () => {
    emitSocket("get_overrides", { device_id: store.deviceId });
    toast({ title: "Refreshed", description: "Data synced from server" });
  }, [store.deviceId]);

  const handleSettingsSave = useCallback((newSettings: Omit<Settings, "id">) => {
    setSettings(newSettings);
    toast({ title: "Settings Saved", description: "Your preferences have been updated" });
  }, [toast]);

  const handleAlertDismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleAlertMarkRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  }, []);

  const handleClearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const togglePump = useCallback(async (turnOn: boolean) => {
    const deviceId = store.deviceId;
    if (!deviceId) {
      toast({ title: "Error", description: "No device connected", variant: "destructive" });
      return;
    }
    // Update store immediately so UI reflects the change
    store.setControls({ ...store.controls, pump: turnOn });
    const sent = emitSocket("command", { device_id: deviceId, command: "pump", params: { state: turnOn } });
    if (sent) {
      toast({ title: turnOn ? "Pump On" : "Pump Off", description: `Command sent to ${deviceId}` });
    } else {
      toast({ title: "Command Queued", description: "Socket disconnected — command will send when reconnected", variant: "default" });
    }
  }, [store.deviceId, store.controls, toast]);

  const switchToAutoMode = useCallback(async () => {
    const deviceId = store.deviceId;
    if (!deviceId) { toast({ title: "Error", description: "No device connected", variant: "destructive" }); return; }
    const sent = emitSocket("command", { device_id: deviceId, command: "mode", params: { mode: "AUTO" } });
    store.setControls({ ...store.controls, mode: "AUTO" });
    setSettings((prev) => ({ ...prev, controlMode: "automatic" }));
    toast({ title: "Auto Mode", description: sent ? "System switched to automatic mode" : "Command queued — will apply when reconnected" });
  }, [store.deviceId, toast]);

  const switchToManualMode = useCallback(async () => {
    const deviceId = store.deviceId;
    if (!deviceId) { toast({ title: "Error", description: "No device connected", variant: "destructive" }); return; }
    const sent = emitSocket("command", { device_id: deviceId, command: "mode", params: { mode: "MANUAL" } });
    store.setControls({ ...store.controls, mode: "MANUAL" });
    setSettings((prev) => ({ ...prev, controlMode: "manual" }));
    toast({ title: "Manual Mode", description: sent ? "System switched to manual mode" : "Command queued — will apply when reconnected" });
  }, [store.deviceId, toast]);

  const switchToScheduledMode = useCallback(async () => {
    const deviceId = store.deviceId;
    if (!deviceId) { toast({ title: "Error", description: "No device connected", variant: "destructive" }); return; }
    const sent = emitSocket("command", { device_id: deviceId, command: "mode", params: { mode: "SCHEDULED" } });
    store.setControls({ ...store.controls, mode: "SCHEDULED" });
    setSettings((prev) => ({ ...prev, controlMode: "scheduled" }));
    toast({ title: "Scheduled Mode", description: sent ? "System switched to scheduled mode" : "Command queued — will apply when reconnected" });
  }, [store.deviceId, toast]);

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const value: AppContextValue = {
    sensorData,
    systemStatus,
    aiRecommendation,
    sensorTrends,
    alerts,
    settings,
    history,
    trendData,
    isLoading,
    isOnline,
    settingsOpen,
    exportOpen,
    setSettingsOpen,
    setExportOpen,
    handleRefresh,
    handleSettingsSave,
    handleAlertDismiss,
    handleAlertMarkRead,
    handleClearAllAlerts,
    togglePump,
    switchToAutoMode,
    switchToManualMode,
    switchToScheduledMode,
    unreadAlertCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
