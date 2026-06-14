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

export interface DeviceSensorState {
  sensors: SensorDataMap;
  effective: boolean;
  real_sensors: SensorDataMap | null;
  controls: { manual_override: boolean; pump: boolean; mode: string };
  aiRecommendation: string;
}

interface SensorState {
  connected: boolean;
  deviceId: string | null;
  selectedDeviceId: string | null;
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
  deviceSensors: Record<string, DeviceSensorState>;
  sensorTrends: SensorReading[];
  history: HistoryEntry[];
  trendData: TrendData;
  overrides: OverrideEntry[];
  isTestingMode: boolean;

  setConnected: (connected: boolean) => void;
  setDeviceId: (id: string) => void;
  setSelectedDevice: (id: string) => void;
  setSensorData: (data: { sensors: SensorDataMap; effective: boolean; real_sensors: SensorDataMap | null; device_id: string; device_name?: string }) => void;
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
  selectedDeviceId: null,
  realSensors: null,
  effectiveSensors: null,
  overrideActive: false,
  aiRecommendation: "",
  controls: { manual_override: false, pump: false, mode: "AUTO" },
  devices: [],
  deviceSensors: {},
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

  setDeviceId: (deviceId) => {
    const state = get();
    set({ deviceId });
    // Auto-select first device if none selected
    if (!state.selectedDeviceId) {
      set({ selectedDeviceId: deviceId });
    }
  },

  setSelectedDevice: (id) => {
    const state = get();
    const ds = state.deviceSensors[id];
    set({
      selectedDeviceId: id,
      effectiveSensors: ds?.sensors || null,
      realSensors: ds?.real_sensors || null,
      overrideActive: ds?.effective || false,
      controls: ds?.controls || { manual_override: false, pump: false, mode: "AUTO" },
      aiRecommendation: ds?.aiRecommendation || "",
    });
  },

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

    // Update controls from server payload if present
    const newControls = (data as any).pump !== undefined
      ? { pump: !!(data as any).pump, mode: (data as any).mode || "AUTO", manual_override: !!(data as any).manual_override }
      : (state.deviceSensors[data.device_id]?.controls || state.controls);

    // Store per-device sensor data
    const newDeviceSensors = { ...state.deviceSensors };
    newDeviceSensors[data.device_id] = {
      sensors,
      effective: data.effective,
      real_sensors: data.real_sensors,
      controls: newControls,
      aiRecommendation: newDeviceSensors[data.device_id]?.aiRecommendation || "",
    };

    // Ensure device is in the devices list
    const devExists = state.devices.some((d) => d.device_id === data.device_id);
    const newDevices = devExists
      ? state.devices.map((d) =>
          d.device_id === data.device_id
            ? { ...d, online_status: 1, last_seen: new Date().toISOString(), device_name: data.device_name || d.device_name }
            : d
        )
      : [...state.devices, {
          device_id: data.device_id,
          device_name: data.device_name || data.device_id,
          firmware_version: "",
          board_type: "ESP32",
          last_seen: new Date().toISOString(),
          online_status: 1,
        }];

    // Auto-select first device if none selected
    let selectedDeviceId = state.selectedDeviceId;
    if (!selectedDeviceId) {
      selectedDeviceId = data.device_id;
    }

    // If this update is for the selected device, update the global sensor state
    const isSelected = data.device_id === selectedDeviceId;

    set({
      deviceSensors: newDeviceSensors,
      devices: newDevices,
      selectedDeviceId,
      effectiveSensors: isSelected ? (data.effective ? sensors : null) : state.effectiveSensors,
      realSensors: isSelected ? (data.real_sensors || (data.effective ? null : sensors)) : state.realSensors,
      overrideActive: isSelected ? data.effective : state.overrideActive,
      deviceId: data.device_id,
      controls: isSelected ? newControls : state.controls,
      aiRecommendation: isSelected ? (newDeviceSensors[data.device_id]?.aiRecommendation || "") : state.aiRecommendation,
      history: [{ id: reading.id, timestamp: reading.timestamp, sensors: reading }, ...state.history].slice(0, 1000),
      sensorTrends: [...state.sensorTrends, reading].slice(-200),
    });
  },

  setAIRecommendation: (recommendation) => {
    const state = get();
    const selectedId = state.selectedDeviceId || state.deviceId;
    if (selectedId) {
      const newDeviceSensors = { ...state.deviceSensors };
      if (newDeviceSensors[selectedId]) {
        newDeviceSensors[selectedId] = { ...newDeviceSensors[selectedId], aiRecommendation: recommendation };
      }
      set({ aiRecommendation: recommendation, deviceSensors: newDeviceSensors });
    } else {
      set({ aiRecommendation: recommendation });
    }
  },

  setControls: (controls) => set({ controls }),

  setDevices: (devices) => set({ devices }),

  setDeviceOnline: ({ device_id, online }) => {
    set((state) => {
      const exists = state.devices.some((d) => d.device_id === device_id);
      if (exists) {
        return {
          devices: state.devices.map((d) =>
            d.device_id === device_id ? { ...d, online_status: online ? 1 : 0 } : d
          ),
        };
      }
      return {
        devices: [...state.devices, {
          device_id,
          device_name: device_id,
          firmware_version: "",
          board_type: "ESP32",
          last_seen: new Date().toISOString(),
          online_status: online ? 1 : 0,
        }],
      };
    });
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
