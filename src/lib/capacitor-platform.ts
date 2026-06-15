import { Capacitor } from "@capacitor/core";

export function isCapacitorAvailable(): boolean {
  return typeof window !== "undefined" && typeof Capacitor !== "undefined" && typeof Capacitor.getPlatform === "function";
}

export function getCapacitorPlatform(): string {
  if (typeof window === "undefined" || typeof Capacitor === "undefined" || typeof Capacitor.getPlatform !== "function") {
    return "web";
  }

  return Capacitor.getPlatform() || "web";
}

export function isCapacitorNative(): boolean {
  return getCapacitorPlatform() !== "web";
}

export function isCapacitorWeb(): boolean {
  return getCapacitorPlatform() === "web";
}
