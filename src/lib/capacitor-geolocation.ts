import { isCapacitorAvailable } from "@/lib/capacitor-platform";

export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

async function browserGetCurrentPosition(): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return reject(new Error("Geolocation unavailable"));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  });
}

export async function requestLocationPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return !!(typeof window !== "undefined" && navigator.geolocation);
  }

  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const permission = await Geolocation.checkPermissions();
    if (permission.location === "denied") {
      return false;
    }

    if (permission.location !== "granted") {
      const request = await Geolocation.requestPermissions();
      return request.location === "granted";
    }

    return true;
  } catch (error) {
    console.warn("[CapacitorGeolocation] permission request failed:", error);
    return !!(typeof window !== "undefined" && navigator.geolocation);
  }
}

export async function getDeviceLocation(): Promise<DevicePosition> {
  if (isCapacitorAvailable()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      if (perm.location === "denied") {
        const granted = await requestLocationPermission();
        if (!granted) {
          throw new Error("Location permission denied");
        }
      }

      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (error) {
      console.warn("[CapacitorGeolocation] plugin failed, falling back to browser geolocation:", error);
    }
  }

  return browserGetCurrentPosition();
}
