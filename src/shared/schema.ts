import { z } from "zod";

// ── Sensor Reading ──────────────────────────────────────────────────────────
export type SensorReading = {
  id: string;
  timestamp: string;
  soilMoisture: number;
  airHumidity: number;
  waterLevel: number;
  pH: number;
  airTemperature: number;
  waterTemperature: number;
  airQuality: number;
  flowRate: number;
  battery: number;
};

export const insertSensorReadingSchema = z.object({
  timestamp: z.string().optional(),
  soilMoisture: z.number().min(0).max(100),
  airHumidity: z.number().min(0).max(100),
  waterLevel: z.number().min(0).max(100),
  pH: z.number().min(0).max(14),
  airTemperature: z.number(),
  waterTemperature: z.number(),
  airQuality: z.number().min(0),
  flowRate: z.number().min(0),
  battery: z.number().min(0).max(100),
});

export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;

// ── System Status ────────────────────────────────────────────────────────────
export const systemStatusSchema = z.object({
  uptime: z.number(),
  pumpStatus: z.enum(["running", "stopped", "error"]),
  pumpRuntime: z.number(),
  controlMode: z.enum(["automatic", "manual", "scheduled"]),
  networkSignal: z.enum(["strong", "medium", "weak"]),
  dataUsage: z.number(),
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;

// ── Alert ───────────────────────────────────────────────────────────────────
export type Alert = {
  id: string;
  type: "info" | "warning" | "danger" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
};

export const insertAlertSchema = z.object({
  type: z.enum(["info", "warning", "danger", "success"]),
  title: z.string(),
  message: z.string(),
  timestamp: z.string().optional(),
  read: z.boolean().optional(),
});

export type InsertAlert = z.infer<typeof insertAlertSchema>;

// ── Settings ─────────────────────────────────────────────────────────────────
export type Settings = {
  id?: string;
  soundAlerts: boolean;
  pushNotifications: boolean;
  moistureThreshold: number;
  batteryThreshold: number;
  temperatureUnit: "celsius" | "fahrenheit";
  pollInterval: number;
  darkMode: boolean;
  controlMode?: "automatic" | "manual" | "scheduled";
  scheduledSettings?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  };
  airQualityThreshold?: number;
  temperatureHighThreshold?: number;
  temperatureLowThreshold?: number;
  humidityHighThreshold?: number;
  humidityLowThreshold?: number;
  waterLevelLowThreshold?: number;
  aiMode?: boolean;
  aiProvider?: "auto" | "gemini" | "openrouter" | "none";
  geminiApiKey?: string;
  openrouterApiKey?: string;
  geminiModel?: string;
  openrouterModel?: string;
};

export const insertSettingsSchema = z.object({
  soundAlerts: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  moistureThreshold: z.number().min(0).max(100).optional(),
  batteryThreshold: z.number().min(0).max(100).optional(),
  temperatureUnit: z.enum(["celsius", "fahrenheit"]).optional(),
  pollInterval: z.number().min(1000).max(60000).optional(),
  darkMode: z.boolean().optional(),
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// ── Export Format ─────────────────────────────────────────────────────────────
export const exportFormatSchema = z.enum(["csv", "json"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

// ── Statistics ────────────────────────────────────────────────────────────────
export const statisticsSchema = z.object({
  waterUsed: z.number(),
  pumpRuntime: z.number(),
  efficiency: z.number(),
  averageMoisture: z.number(),
  averageTemperature: z.number(),
});
export type Statistics = z.infer<typeof statisticsSchema>;

// ── Trend Data ────────────────────────────────────────────────────────────────
export const trendDataSchema = z.object({
  timestamps: z.array(z.string()),
  moisture: z.array(z.number()),
  humidity: z.array(z.number()),
  temperature: z.array(z.number()),
  ph: z.array(z.number()),
  waterLevel: z.array(z.number()),
  flow: z.array(z.number()),
});
export type TrendData = z.infer<typeof trendDataSchema>;

// ── User ──────────────────────────────────────────────────────────────────────
export type User = {
  id: string;
  username: string;
  password: string;
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
