import { create } from "zustand";
import type { SensorReading, SystemStatus, TrendData } from "@/shared/schema";

export interface OverrideEntry {
  id?: number;
  device_id: string;
  sensor_key: string;
  override_value: number;
  enabled: number;
  updated_at?: string;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  firmware_version: string;
  board_type: string;
  last_seen: string;
  online_status: number;
  created_at?: string;
  updated_at?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  sensors: SensorReading;
}

export type SensorDataMap = {
  soil_moisture: number;
  ph: number;
  air_humidity: number;
  air_temp: number;
  water_temp: number;
  water_level: number;
  air_quality: number;
  flow: number;
  battery: number;
};

interface SensorState {
  connected: boolean;
  deviceId: string | null;
  realSensors: SensorDataMap | null;
  effectiveSensors: SensorDataMap | null;
  overrideActive: boolean;
  aiRecommendation: string;
  controls: {
    manual_override: boolean;
    pump: boolean;
    mode: string;
  };
  devices: DeviceInfo[];
  sensorTrends: SensorReading[];
  history: HistoryEntry[];
  trendData: TrendData;
  overrides: OverrideEntry[];
  isTestingMode: boolean;

  setConnected: (connected: boolean) => void;
  setDeviceId: (id: string) => void;
  setSensorData: (data: { sensors: SensorDataMap; effective: boolean; real_sensors: SensorDataMap | null; device_id: string }) => void;
  setAIRecommendation: (rec: string) => void;
  setControls: (controls: { manual_override: boolean; pump: boolean; mode: string }) => void;
  setDevices: (devices: DeviceInfo[]) => void;
  setDeviceOnline: (device: { device_id: string; online: boolean }) => void;
  addSensorTrend: (reading: SensorReading) => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  setOverrides: (overrides: OverrideEntry[]) => void;
  setTestingMode: (mode: boolean) => void;
}

export const useSensorStore = create<SensorState>((set, get) => ({
  connected: false,
  deviceId: null,
  realSensors: null,
  effectiveSensors: null,
  overrideActive: false,
  aiRecommendation: "",
  controls: { manual_override: false, pump: false, mode: "AUTO" },
  devices: [],
  sensorTrends: [],
  history: [],
  trendData: {
    timestamps: [],
    moisture: [],
    humidity: [],
    temperature: [],
    ph: [],
    waterLevel: [],
    flow: [],
  },
  overrides: [],
  isTestingMode: false,

  setConnected: (connected) => set({ connected }),

  setDeviceId: (deviceId) => set({ deviceId }),

  setSensorData: (data) => {
    const state = get();
    const sensors = data.sensors;
    const reading: SensorReading = {
      id: `${data.device_id}-${Date.now()}`,
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

    const trendData = state.trendData;
    const newTimestamps = [...trendData.timestamps, new Date().toLocaleTimeString()].slice(-50);
    const newMoisture = [...trendData.moisture, reading.soilMoisture].slice(-50);
    const newHumidity = [...trendData.humidity, reading.airHumidity].slice(-50);
    const newTemperature = [...trendData.temperature, reading.airTemperature].slice(-50);
    const newPh = [...trendData.ph, reading.pH].slice(-50);
    const newWaterLevel = [...trendData.waterLevel, reading.waterLevel].slice(-50);
    const newFlow = [...trendData.flow, reading.flowRate].slice(-50);

    const newTrends = [...state.sensorTrends, reading].slice(-200);
    const newHistory: HistoryEntry = {
      id: reading.id,
      timestamp: reading.timestamp,
      sensors: reading,
    };

    try {
      localStorage.setItem("sensorTrends", JSON.stringify(newTrends));
    } catch {}

    // Update controls from server payload if present
    const newControls = (data as any).pump !== undefined
      ? { pump: !!(data as any).pump, mode: (data as any).mode || "AUTO", manual_override: !!(data as any).manual_override }
      : state.controls;

    set({
      effectiveSensors: data.effective ? sensors : null,
      realSensors: data.real_sensors || (data.effective ? null : sensors),
      overrideActive: data.effective,
      sensorTrends: newTrends,
      deviceId: data.device_id,
      controls: newControls,
      history: [newHistory, ...state.history].slice(0, 1000),
      trendData: {
        timestamps: newTimestamps,
        moisture: newMoisture,
        humidity: newHumidity,
        temperature: newTemperature,
        ph: newPh,
        waterLevel: newWaterLevel,
        flow: newFlow,
      },
    });
  },

  setAIRecommendation: (recommendation) => set({ aiRecommendation: recommendation }),

  setControls: (controls) => set({ controls }),

  setDevices: (devices) => set({ devices }),

  setDeviceOnline: ({ device_id, online }) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.device_id === device_id ? { ...d, online_status: online ? 1 : 0 } : d
      ),
    }));
  },

  addSensorTrend: (reading) => {
    set((state) => ({
      sensorTrends: [...state.sensorTrends, reading].slice(-200),
    }));
  },

  addHistoryEntry: (entry) => {
    set((state) => ({
      history: [entry, ...state.history].slice(0, 1000),
    }));
  },

  setOverrides: (overrides) => set({ overrides }),

  setTestingMode: (mode) => set({ isTestingMode: mode }),
}));
