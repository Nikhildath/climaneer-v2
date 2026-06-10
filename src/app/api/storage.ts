import { randomUUID } from "crypto";
import type {
  SensorReading, InsertSensorReading, Alert, InsertAlert,
  Settings, Statistics, TrendData, SystemStatus,
} from "@/shared/schema";

class MemStorage {
  private sensorReadings: SensorReading[] = [];
  private alerts: Map<string, Alert> = new Map();
  private settings: Omit<Settings, "id"> = {
    soundAlerts: true,
    pushNotifications: true,
    moistureThreshold: 30,
    batteryThreshold: 20,
    temperatureUnit: "celsius",
    pollInterval: 5000,
    darkMode: false,
  };
  private maxReadingsHistory = 1000;

  async createSensorReading(reading: InsertSensorReading): Promise<SensorReading> {
    const id = randomUUID();
    const timestamp = reading.timestamp || new Date().toISOString();
    const sensorReading: SensorReading = { ...reading, id, timestamp };
    this.sensorReadings.push(sensorReading);
    if (this.sensorReadings.length > this.maxReadingsHistory) {
      this.sensorReadings = this.sensorReadings.slice(-this.maxReadingsHistory);
    }
    return sensorReading;
  }

  async getLatestSensorReading(): Promise<SensorReading | undefined> {
    if (this.sensorReadings.length === 0) return undefined;
    return this.sensorReadings[this.sensorReadings.length - 1];
  }

  async getSensorReadingHistory(limit = 100): Promise<SensorReading[]> {
    return this.sensorReadings.slice(-limit).reverse();
  }

  async getTrendData(hours = 24): Promise<TrendData> {
    const now = Date.now();
    const cutoffTime = now - hours * 60 * 60 * 1000;
    const recentReadings = this.sensorReadings.filter((r) => new Date(r.timestamp).getTime() > cutoffTime);
    if (recentReadings.length === 0) {
      return { timestamps: [], moisture: [], humidity: [], temperature: [], ph: [], waterLevel: [], flow: [] };
    }
    return {
      timestamps: recentReadings.map((r) => r.timestamp),
      moisture: recentReadings.map((r) => r.soilMoisture),
      humidity: recentReadings.map((r) => r.airHumidity),
      temperature: recentReadings.map((r) => r.airTemperature),
      ph: recentReadings.map((r) => r.pH),
      waterLevel: recentReadings.map((r) => r.waterLevel),
      flow: recentReadings.map((r) => r.flowRate),
    };
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = { ...insertAlert, id, timestamp: insertAlert.timestamp || new Date().toISOString(), read: insertAlert.read ?? false };
    this.alerts.set(id, alert);
    return alert;
  }

  async markAlertAsRead(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    const updated = { ...alert, read: true };
    this.alerts.set(id, updated);
    return updated;
  }

  async deleteAlert(id: string): Promise<boolean> {
    return this.alerts.delete(id);
  }

  async getSettings(): Promise<Omit<Settings, "id">> {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<Omit<Settings, "id">>): Promise<Omit<Settings, "id">> {
    this.settings = { ...this.settings, ...updates };
    return { ...this.settings };
  }

  async getStatistics(): Promise<Statistics> {
    if (this.sensorReadings.length === 0) {
      return { waterUsed: 0, pumpRuntime: 0, efficiency: 0, averageMoisture: 0, averageTemperature: 0 };
    }
    const recent = this.sensorReadings.slice(-100);
    const avgMoisture = recent.reduce((s, r) => s + r.soilMoisture, 0) / recent.length;
    const avgTemp = recent.reduce((s, r) => s + r.airTemperature, 0) / recent.length;
    const totalFlow = recent.reduce((s, r) => s + r.flowRate, 0);
    return {
      waterUsed: totalFlow,
      pumpRuntime: 125.5,
      efficiency: Math.min(95, Math.round(avgMoisture * 1.2)),
      averageMoisture: Math.round(avgMoisture * 10) / 10,
      averageTemperature: Math.round(avgTemp * 10) / 10,
    };
  }

  async getSystemStatus(): Promise<SystemStatus> {
    return { uptime: 99.9, pumpStatus: "running", pumpRuntime: 125.5, controlMode: "automatic", networkSignal: "strong", dataUsage: 2.3 };
  }
}

export const storage = new MemStorage();
