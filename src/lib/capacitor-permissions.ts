import { isCapacitorAvailable } from "@/lib/capacitor-platform";

type PermissionGroup = "microphone" | "location" | "notifications" | "storage";

export async function requestMicrophonePermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { Microphone } = await import("@capacitor/microphone");
    const perm = await Microphone.checkPermissions();
    if (perm.microphone === "denied") return false;
    if (perm.microphone !== "granted") {
      const result = await Microphone.requestPermissions();
      return result.microphone === "granted";
    }
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Microphone error:", e);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === "denied") return false;
    if (perm.display !== "granted") {
      const result = await LocalNotifications.requestPermissions();
      return result.display === "granted";
    }
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Notifications error:", e);
    return false;
  }
}

export async function requestAllPermissions(): Promise<Record<PermissionGroup, boolean>> {
  const [mic, loc, notif] = await Promise.all([
    requestMicrophonePermission().catch(() => false),
    (async () => {
      try {
        const { requestLocationPermission } = await import("./capacitor-geolocation");
        return await requestLocationPermission();
      } catch { return false; }
    })(),
    requestNotificationPermission().catch(() => false),
  ]);

  return { microphone: mic, location: loc, notifications: notif, storage: true };
}
