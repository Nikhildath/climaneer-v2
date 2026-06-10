"use client";
import { SensorCard } from "@/components/SensorCard";
import { StatusCard } from "@/components/StatusCard";
import { ProgressRing } from "@/components/ProgressRing";
import { WaterTankVisualization } from "@/components/WaterTankVisualization";
import { PHScaleVisualization } from "@/components/PHScaleVisualization";
import { TemperatureGauge } from "@/components/TemperatureGauge";
import { AQIBar } from "@/components/AQIBar";
import { WeatherCard } from "@/components/WeatherCard";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import {
  Droplets, Cloud, Thermometer, Activity, Wind,
  Gauge, Beaker, Waves, Cpu, Zap, Battery, Wifi, Lightbulb,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatTemp, tempUnitLabel } from "@/lib/format-temp";

export default function DashboardPage() {
  const { sensorData, systemStatus, aiRecommendation, settings } = useApp();

  const sensorForUI = sensorData ?? {
    id: "default",
    timestamp: new Date().toISOString(),
    soilMoisture: 0,
    airHumidity: 0,
    waterLevel: 0,
    pH: 7,
    airTemperature: 0,
    waterTemperature: 0,
    airQuality: 0,
    flowRate: 0,
    battery: 100,
  };

  const statusForUI = systemStatus ?? {
    uptime: 0,
    pumpStatus: "stopped" as const,
    pumpRuntime: 0,
    controlMode: "automatic" as const,
    networkSignal: "weak" as const,
    dataUsage: 0,
  };

  const [waterUsedToday, setWaterUsedToday] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeDiffMinutes = (now - lastUpdateTime) / (1000 * 60);
    if (timeDiffMinutes > 0 && sensorForUI.flowRate > 0) {
      const litersUsed = sensorForUI.flowRate * timeDiffMinutes;
      setWaterUsedToday((prev) => prev + litersUsed);
    }
    setLastUpdateTime(now);
  }, [sensorForUI.flowRate]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {aiRecommendation && (
        <Card className="p-4 sm:p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-200 dark:border-emerald-800">
          <div className="flex gap-3 sm:gap-4">
            <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-emerald-900 dark:text-emerald-100">AI Recommendation</h3>
              <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 mt-1">{aiRecommendation}</p>
            </div>
          </div>
        </Card>
      )}

      <section data-testid="weather-section">
        <WeatherCard />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="status-overview">
        <StatusCard title="System Status" value="All Operational" subtitle={`Uptime: ${statusForUI.uptime.toFixed(1)}%`} icon={Cpu} status="active" testId="status-system" />
        <StatusCard
          title="Pump Status"
          value={statusForUI.pumpStatus === "running" ? "Running" : statusForUI.pumpStatus === "stopped" ? "Stopped" : "Error"}
          subtitle={`Runtime: ${Math.floor(statusForUI.pumpRuntime / 60)}h ${statusForUI.pumpRuntime % 60}m`}
          icon={Waves}
          status={statusForUI.pumpStatus === "running" ? "active" : statusForUI.pumpStatus === "error" ? "danger" : "inactive"}
          testId="status-pump"
        />
        <StatusCard
          title="Battery Level"
          value={`${sensorForUI.battery}%`}
          subtitle={`Est. ${Math.floor((sensorForUI.battery / 100) * 24)}h remaining`}
          icon={Battery}
          status={sensorForUI.battery > 50 ? "active" : sensorForUI.battery > 20 ? "warning" : "danger"}
          testId="status-battery"
        />
        <StatusCard
          title="Network"
          value={statusForUI.networkSignal.charAt(0).toUpperCase() + statusForUI.networkSignal.slice(1)}
          subtitle={`Data: ${statusForUI.dataUsage.toFixed(1)} MB`}
          icon={Wifi}
          status={statusForUI.networkSignal === "strong" ? "active" : statusForUI.networkSignal === "medium" ? "warning" : "danger"}
          testId="status-network"
        />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="sensor-grid">
        <SensorCard title="Soil Moisture" value={sensorForUI.soilMoisture} unit="%" icon={Droplets}
          status={sensorForUI.soilMoisture > 60 ? "good" : sensorForUI.soilMoisture > 30 ? "warning" : "danger"}
          statusText={sensorForUI.soilMoisture > 60 ? "Optimal" : sensorForUI.soilMoisture > 30 ? "Low" : "Critical"}
          trend={sensorForUI.soilMoisture > 50 ? "up" : "down"} testId="sensor-soil-moisture"
          visualization={<ProgressRing progress={sensorForUI.soilMoisture} icon={Droplets}
            color={sensorForUI.soilMoisture > 60 ? "hsl(var(--chart-1))" : sensorForUI.soilMoisture > 30 ? "hsl(var(--chart-4))" : "hsl(var(--destructive))"} />}
        />
        <SensorCard title="Air Humidity" value={sensorForUI.airHumidity} unit="%" icon={Cloud}
          status={sensorForUI.airHumidity > 40 && sensorForUI.airHumidity < 70 ? "good" : "warning"}
          statusText={sensorForUI.airHumidity > 40 && sensorForUI.airHumidity < 70 ? "Optimal" : "Monitor"}
          trend="stable" testId="sensor-air-humidity"
          visualization={<ProgressRing progress={sensorForUI.airHumidity} icon={Cloud} color="hsl(var(--chart-2))" />}
        />
        <SensorCard title="Water Level" value={sensorForUI.waterLevel} unit="%" icon={Waves}
          status={sensorForUI.waterLevel > 50 ? "good" : sensorForUI.waterLevel > 25 ? "warning" : "danger"}
          statusText={sensorForUI.waterLevel > 50 ? "Sufficient" : sensorForUI.waterLevel > 25 ? "Low" : "Critical"}
          trend={sensorForUI.waterLevel > 50 ? "stable" : "down"} testId="sensor-water-level"
          visualization={<WaterTankVisualization level={sensorForUI.waterLevel} />}
        />
        <SensorCard title="pH Level" value={sensorForUI.pH.toFixed(1)} icon={Beaker}
          status={sensorForUI.pH >= 6 && sensorForUI.pH <= 7.5 ? "good" : "warning"}
          statusText={sensorForUI.pH >= 6 && sensorForUI.pH <= 7.5 ? "Optimal" : "Adjust"}
          trend={sensorForUI.pH > 7 ? "up" : "down"} testId="sensor-ph"
          visualization={<PHScaleVisualization value={sensorForUI.pH} />}
        />
        <SensorCard title="Air Temperature" value={sensorForUI.airTemperature} unit={tempUnitLabel(settings.temperatureUnit)} icon={Thermometer}
          status={sensorForUI.airTemperature > 15 && sensorForUI.airTemperature < 30 ? "good" : "warning"}
          statusText="Current conditions" trend={sensorForUI.airTemperature > 25 ? "up" : "stable"} testId="sensor-air-temp"
          visualization={<TemperatureGauge temperature={sensorForUI.airTemperature} />}
        />
        <SensorCard title="Water Temperature" value={sensorForUI.waterTemperature} unit={tempUnitLabel(settings.temperatureUnit)} icon={Thermometer}
          status={sensorForUI.waterTemperature > 15 && sensorForUI.waterTemperature < 25 ? "good" : "warning"}
          statusText={sensorForUI.waterTemperature > 15 && sensorForUI.waterTemperature < 25 ? "Optimal" : "Monitor"}
          trend="stable" testId="sensor-water-temp"
        />
        <SensorCard title="Air Quality" value={sensorForUI.airQuality} unit="AQI" icon={Wind}
          status={sensorForUI.airQuality < 50 ? "good" : sensorForUI.airQuality < 100 ? "warning" : "danger"}
          statusText={sensorForUI.airQuality < 50 ? "Good" : sensorForUI.airQuality < 100 ? "Moderate" : "Poor"}
          trend={sensorForUI.airQuality < 50 ? "down" : "up"} testId="sensor-air-quality"
          visualization={<AQIBar aqi={sensorForUI.airQuality} />}
        />
        <SensorCard title="Water Flow" value={sensorForUI.flowRate.toFixed(1)} unit="L/min" icon={Gauge}
          status={sensorForUI.flowRate > 0 ? "good" : "info"} statusText={sensorForUI.flowRate > 0 ? "Active" : "Idle"}
          trend={sensorForUI.flowRate > 2 ? "up" : "stable"} testId="sensor-flow-rate"
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4" data-testid="statistics-section">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Today&apos;s Water Usage</p>
              <p className="text-lg sm:text-2xl font-bold truncate">{waterUsedToday.toFixed(1)} L</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Current flow: {sensorForUI.flowRate.toFixed(1)} L/min</div>
        </div>
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">System Efficiency</p>
              <p className="text-lg sm:text-2xl font-bold">95%</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Performance: Excellent</div>
        </div>
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Control Mode</p>
              <p className="text-lg sm:text-2xl font-bold truncate">{statusForUI.controlMode === "automatic" ? "Auto" : "Manual"}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Operating mode</div>
        </div>
      </section>
    </div>
  );
}
