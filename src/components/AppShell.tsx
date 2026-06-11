"use client";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { NavigationTabs } from "@/components/NavigationTabs";
import { QuickActions } from "@/components/QuickActions";
import { VoiceStatusIndicator } from "@/components/VoiceStatusIndicator";
import { SettingsModal } from "@/components/SettingsModal";
import { ExportModal } from "@/components/ExportModal";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { usePathname, useRouter } from "next/navigation";
import { useVoiceControl } from "@/hooks/use-voice-control";
import { Toaster } from "@/components/ui/toaster";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { formatTemp } from "@/lib/format-temp";
import { emitSocket } from "@/lib/socket-client";
import { useSensorStore } from "@/store/sensor-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    sensorData, systemStatus, isLoading, isOnline,
    settingsOpen, exportOpen, setSettingsOpen, setExportOpen,
    handleRefresh, togglePump, switchToAutoMode, switchToManualMode, switchToScheduledMode,
    settings, handleAlertDismiss, alerts, handleAlertMarkRead,
    handleClearAllAlerts, unreadAlertCount, aiRecommendation,
    handleSettingsSave, history,
  } = useApp();

  const pathname = usePathname();
  const router = useRouter();

  const activeTab = pathname === "/" ? "dashboard" : pathname.substring(1);

  const handleTabChange = (tab: string) => {
    router.push(tab === "dashboard" ? "/" : `/${tab}`);
  };

  const statusForUI = systemStatus ?? {
    uptime: 0,
    pumpStatus: "stopped" as const,
    pumpRuntime: 0,
    controlMode: "automatic" as const,
    networkSignal: "weak" as const,
    dataUsage: 0,
  };

  const getSystemStatusText = () => {
    if (!systemStatus) return "unknown";
    return `pump is ${systemStatus.pumpStatus}, ${systemStatus.controlMode} mode, signal ${systemStatus.networkSignal}`;
  };

  const getActiveAlertsText = () => {
    const active = alerts.filter((a) => !a.read);
    if (active.length === 0) return "";
    return active.map((a) => `${a.title}: ${a.message}`).join(". ");
  };

  const getControlModeText = () => {
    return settings.controlMode || "automatic";
  };

  const store = useSensorStore();
  const { listening, transcript, aiMode, voiceVersion } = useVoiceControl({
    aiMode: (settings as any).aiMode ?? true,
    aiProvider: (settings as any).aiProvider ?? "auto",
    geminiApiKey: (settings as any).geminiApiKey,
    openrouterApiKey: (settings as any).openrouterApiKey,
    geminiModel: (settings as any).geminiModel,
    openrouterModel: (settings as any).openrouterModel,
    onCommand: (command) => {
      console.log("[Voice] Processing command:", command);
    },
    getSensorValue: (key: string) => {
      if (!sensorData) return "not available";
      const mapping: Record<string, string> = {
        soilMoisture: `${sensorData.soilMoisture?.toFixed(0) || 0}%`,
        airHumidity: `${sensorData.airHumidity?.toFixed(0) || 0}%`,
        airTemperature: formatTemp(sensorData.airTemperature ?? 0, settings.temperatureUnit),
        phValue: `${sensorData.pH?.toFixed(1) || 0}`,
        waterLevel: `${sensorData.waterLevel?.toFixed(0) || 0}%`,
        airQuality: `${sensorData.airQuality?.toFixed(0) || 0} AQI`,
        batteryLevel: `${sensorData.battery?.toFixed(0) || 0}%`,
        flowRate: `${sensorData.flowRate?.toFixed(1) || 0} L/min`,
        waterTemperature: formatTemp(sensorData.waterTemperature ?? 0, settings.temperatureUnit),
      };
      return mapping[key] || "not available";
    },
    onPumpToggle: async (on) => await togglePump(on),
    onAutoMode: async () => await switchToAutoMode(),
    onManualMode: async () => await switchToManualMode(),
    onScheduledMode: async () => await switchToScheduledMode(),
    navigate: (path) => router.push(path),
    getSystemStatus: getSystemStatusText,
    getAIRecommendation: () => aiRecommendation || "",
    getActiveAlerts: getActiveAlertsText,
    getControlMode: getControlModeText,
    emitSocket: (event, data) => emitSocket(event, data),
    getSettings: () => ({ ...settings }),
    onSensorOverride: (sensorKey, value, enabled) => {
      const deviceId = store.deviceId;
      if (deviceId) {
        emitSocket("override_sensor", { device_id: deviceId, sensor_key: sensorKey, value, enabled });
      }
    },
    onSettingsSave: (key, value) => {
      if (key === "_openSettings") { setSettingsOpen(true); return; }
      if (key.startsWith("scheduledSettings.")) {
        const subKey = key.split(".")[1];
        handleSettingsSave({
          ...settings,
          scheduledSettings: { ...(settings.scheduledSettings || { enabled: false, startTime: "08:00", endTime: "18:00", durationMinutes: 30 }), [subKey]: value },
        });
        return;
      }
      handleSettingsSave({ ...settings, [key]: value });
    },
    onSettingsSaveAll: (newSettings) => {
      handleSettingsSave({ ...settings, ...newSettings });
    },
    onAlertDismiss: (id) => {
      if (id) { handleAlertDismiss(id); return; }
      const last = alerts.filter((a) => !a.read).pop();
      if (last) handleAlertDismiss(last.id);
    },
    onClearAlerts: () => handleClearAllAlerts(),
    onExport: () => setExportOpen(true),
    onRefresh: () => handleRefresh(),
    onStopListening: () => {
      window.location.reload();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSettingsClick={() => {}} onRefresh={() => {}} isOnline={isOnline} />
        <NavigationTabs activeTab="dashboard" onTabChange={() => {}} alertCount={0} />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isOnline && <OfflineIndicator />}
      <Header onSettingsClick={() => setSettingsOpen(true)} onRefresh={handleRefresh} isOnline={isOnline} />
      <NavigationTabs activeTab={activeTab} onTabChange={handleTabChange} alertCount={unreadAlertCount} />
      <main className="min-h-[calc(100vh-8rem)] pb-16 sm:pb-0 animate-fade-in" key={pathname}>
        {children}
      </main>
      {pathname === "/" && (
        <QuickActions
          onExport={() => setExportOpen(true)}
          onRefresh={handleRefresh}
          onSettings={() => setSettingsOpen(true)}
          pumpOn={statusForUI.pumpStatus === "running"}
          onTogglePump={async (turnOn) => await togglePump(turnOn)}
          onAutoMode={async () => await switchToAutoMode()}
          onManualMode={async () => await switchToManualMode()}
          currentMode={settings.controlMode as "automatic" | "manual" | "scheduled"}
        />
      )}
      <VoiceStatusIndicator listening={listening} transcript={transcript} aiMode={aiMode} voiceVersion={voiceVersion} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onSave={handleSettingsSave} />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} history={history} />
      <Toaster />
    </div>
  );
}
