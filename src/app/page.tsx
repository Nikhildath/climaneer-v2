"use client";
import { SensorCard } from "@/components/SensorCard";
import { StatusCard } from "@/components/StatusCard";
import { WeatherCard } from "@/components/WeatherCard";
import { useState, useEffect } from "react";
import {
  Droplets, Cloud, Thermometer, Activity, Wind,
  Gauge as GaugeIcon, Beaker, Waves, Cpu, Zap, Battery, Wifi,
  Leaf, Timer, Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { tempUnitLabel } from "@/lib/format-temp";
import { motion } from "framer-motion";

const statusForValue = (value: number, goodRange: [number, number], warnRange: [number, number]): "good" | "warning" | "danger" => {
  if (value >= goodRange[0] && value <= goodRange[1]) return "good";
  if (value >= warnRange[0] && value <= warnRange[1]) return "warning";
  return "danger";
};

const sensorConfigs = [
  { id: "sensor-soil-moisture", title: "Soil Moisture", icon: Droplets, unit: "%", range: [0, 100] as [number, number], good: [30, 70] as [number, number], warn: [20, 80] as [number, number] },
  { id: "sensor-air-humidity", title: "Air Humidity", icon: Cloud, unit: "%", range: [0, 100] as [number, number], good: [40, 70] as [number, number], warn: [30, 80] as [number, number] },
  { id: "sensor-water-level", title: "Water Level", icon: Waves, unit: "%", range: [0, 100] as [number, number], good: [50, 100] as [number, number], warn: [25, 50] as [number, number] },
  { id: "sensor-ph", title: "pH Level", icon: Beaker, unit: "", range: [0, 14] as [number, number], good: [6, 7.5] as [number, number], warn: [5, 8.5] as [number, number] },
  { id: "sensor-air-temp", title: "Air Temp", icon: Thermometer, unit: "°C", range: [0, 50] as [number, number], good: [15, 30] as [number, number], warn: [10, 40] as [number, number] },
  { id: "sensor-water-temp", title: "Water Temp", icon: Thermometer, unit: "°C", range: [0, 40] as [number, number], good: [20, 30] as [number, number], warn: [15, 35] as [number, number] },
  { id: "sensor-air-quality", title: "Air Quality", icon: Wind, unit: "AQI", range: [0, 300] as [number, number], good: [0, 50] as [number, number], warn: [50, 100] as [number, number] },
  { id: "sensor-flow-rate", title: "Flow Rate", icon: GaugeIcon, unit: "L/min", range: [0, 30] as [number, number], good: [5, 15] as [number, number], warn: [0, 25] as [number, number] },
];

const statusTexts: Record<string, { good: string; warning: string; danger: string }> = {
  "sensor-soil-moisture": { good: "Optimal", warning: "Low", danger: "Critical" },
  "sensor-air-humidity": { good: "Optimal", warning: "Monitor", danger: "Extreme" },
  "sensor-water-level": { good: "Sufficient", warning: "Low", danger: "Critical" },
  "sensor-ph": { good: "Optimal", warning: "Adjust", danger: "Extreme" },
  "sensor-air-temp": { good: "Optimal", warning: "Monitor", danger: "Extreme" },
  "sensor-water-temp": { good: "Optimal", warning: "Monitor", danger: "Extreme" },
  "sensor-air-quality": { good: "Good", warning: "Moderate", danger: "Poor" },
  "sensor-flow-rate": { good: "Active", warning: "Low", danger: "Idle" },
};

const trendFor = (id: string, value: number, baseline: number): "up" | "down" | "stable" => {
  if (id === "sensor-air-quality") return value > baseline ? "up" : "down";
  if (id === "sensor-flow-rate") return value > 2 ? "up" : "stable";
  return value > baseline ? "up" : "down";
};

export default function DashboardPage() {
  const { sensorData, systemStatus, aiRecommendation, settings } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const sensor = sensorData ?? {
    id: "default", timestamp: new Date().toISOString(),
    soilMoisture: 65.4, airHumidity: 72.3, waterLevel: 81.2, pH: 7.1,
    airTemperature: 29.8, waterTemperature: 27.5, airQuality: 145,
    flowRate: 12.7, battery: 90,
  };

  const status = systemStatus ?? {
    uptime: 0, pumpStatus: "stopped" as const, pumpRuntime: 0,
    controlMode: "automatic" as const, networkSignal: "weak" as const, dataUsage: 0,
  };

  const values: Record<string, number> = {
    "sensor-soil-moisture": sensor.soilMoisture,
    "sensor-air-humidity": sensor.airHumidity,
    "sensor-water-level": sensor.waterLevel,
    "sensor-ph": sensor.pH,
    "sensor-air-temp": sensor.airTemperature,
    "sensor-water-temp": sensor.waterTemperature,
    "sensor-air-quality": sensor.airQuality,
    "sensor-flow-rate": sensor.flowRate,
  };

  const [waterUsedToday, setWaterUsedToday] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  useEffect(() => {
    const now = Date.now();
    const diff = (now - lastUpdateTime) / (1000 * 60);
    if (diff > 0 && sensor.flowRate > 0) {
      setWaterUsedToday((prev) => prev + sensor.flowRate * diff);
    }
    setLastUpdateTime(now);
  }, [sensor.flowRate]);

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-4 sm:space-y-5 pb-20 sm:pb-8">
      {aiRecommendation && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel rounded-lg px-4 py-3 border-l-[3px] border-l-emerald-500"
        >
          <div className="flex gap-2.5 items-start">
            <Sparkles className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold gradient-text mb-0.5">AI Recommendation</p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{aiRecommendation}</p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
        <WeatherCard />
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: "System", value: "All Operational", sub: `Uptime: ${status.uptime.toFixed(1)}%`, icon: Activity, st: "active" as const, id: "status-system" },
          { title: "Pump", value: status.pumpStatus === "running" ? "Running" : "Stopped", sub: `${Math.floor(status.pumpRuntime / 60)}h ${status.pumpRuntime % 60}m`, icon: Waves, st: (status.pumpStatus === "running" ? "active" : "inactive") as "active" | "inactive", id: "status-pump" },
          { title: "Battery", value: `${sensor.battery}%`, sub: `~${Math.floor((sensor.battery / 100) * 24)}h left`, icon: Battery, st: (sensor.battery > 50 ? "active" : sensor.battery > 20 ? "warning" : "danger") as "active" | "warning" | "danger", id: "status-battery" },
          { title: "Network", value: status.networkSignal.charAt(0).toUpperCase() + status.networkSignal.slice(1), sub: `${status.dataUsage.toFixed(1)} MB`, icon: Wifi, st: (status.networkSignal === "strong" ? "active" : "warning") as "active" | "warning", id: "status-network" },
        ].map((s) => (
          <StatusCard key={s.id} title={s.title} value={s.value} subtitle={s.sub} icon={s.icon} status={s.st} testId={s.id} />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sensorConfigs.map((cfg) => {
          const v = values[cfg.id];
          const st = statusForValue(v, cfg.good, cfg.warn);
          const txts = statusTexts[cfg.id];
          const stxt = txts ? txts[st] : st;
          const tr = trendFor(cfg.id, v, cfg.range[0] + (cfg.range[1] - cfg.range[0]) * 0.5);
          const displayVal = cfg.id === "sensor-ph" ? v.toFixed(1) : cfg.id === "sensor-flow-rate" ? v.toFixed(1) : Math.round(v);
          return (
            <SensorCard
              key={cfg.id}
              title={cfg.title}
              value={displayVal}
              unit={cfg.id === "sensor-air-temp" || cfg.id === "sensor-water-temp" ? tempUnitLabel(settings.temperatureUnit) : cfg.unit}
              icon={cfg.icon}
              status={st}
              statusText={stxt}
              trend={tr}
              min={cfg.range[0]}
              max={cfg.range[1]}
              testId={cfg.id}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Droplets, label: "Today's Water", value: waterUsedToday.toFixed(1), subLabel: "L", sub: `Flow: ${sensor.flowRate.toFixed(1)} L/min` },
          { icon: Leaf, label: "Efficiency", value: "95", subLabel: "%", sub: "Performance: Excellent" },
          { icon: Zap, label: "Control Mode", value: status.controlMode === "automatic" ? "Auto" : status.controlMode === "manual" ? "Manual" : "Scheduled", sub: status.controlMode === "automatic" ? "AI-driven" : status.controlMode === "manual" ? "Operator" : "Time-based" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.3 }}
            className="panel rounded-lg px-4 py-3.5"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="stat-label text-muted-foreground">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight">{stat.value}</span>
              {stat.subLabel && <span className="text-xs font-medium text-muted-foreground">{stat.subLabel}</span>}
            </div>
            <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
