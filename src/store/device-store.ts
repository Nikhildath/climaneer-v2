import { create } from "zustand";
import type { DeviceInfo, OverrideEntry } from "./sensor-store";

export type { DeviceInfo, OverrideEntry };

interface DeviceState {
  selectedDeviceId: string | null;
  deviceFilter: string;
  searchQuery: string;
  showOffline: boolean;

  setSelectedDeviceId: (id: string | null) => void;
  setDeviceFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  setShowOffline: (show: boolean) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  selectedDeviceId: null,
  deviceFilter: "all",
  searchQuery: "",
  showOffline: true,

  setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),
  setDeviceFilter: (filter) => set({ deviceFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowOffline: (show) => set({ showOffline: show }),
}));
