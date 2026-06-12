import { isCapacitorAvailable } from "@/lib/capacitor-platform";

type PermissionGroup = 
  | "microphone" 
  | "location" 
  | "notifications" 
  | "storage" 
  | "camera" 
  | "push_notifications" 
  | "keyboard" 
  | "haptics" 
  | "motion" 
  | "clipboard" 
  | "share" 
  | "browser" 
  | "dialog" 
  | "action_sheet" 
  | "toast" 
  | "privacy_screen" 
  | "screen_reader" 
  | "text_zoom";

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
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

export async function requestCameraPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    if (!("MediaDevices" in navigator) || !("getUserMedia" in navigator.mediaDevices)) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  try {
    const { Camera } = await import("@capacitor/camera");
    const perm = await Camera.checkPermissions();
    if (perm.camera === "denied") return false;
    if (perm.camera !== "granted") {
      const result = await Camera.requestPermissions();
      return result.camera === "granted";
    }
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Camera error:", e);
    return false;
  }
}

export async function requestPushNotificationPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    if (perm.display === "denied") return false;
    if (perm.display !== "granted") {
      const result = await PushNotifications.requestPermissions();
      return result.display === "granted";
    }
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Push Notifications error:", e);
    return false;
  }
}

export async function requestKeyboardPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    const perm = await Keyboard.isKeyboardOpen();
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Keyboard error:", e);
    return false;
  }
}

export async function requestHapticsPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { Haptics } = await import("@capacitor/haptics");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Haptics error:", e);
    return false;
  }
}

export async function requestMotionPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { Motion } = await import("@capacitor/motion");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Motion error:", e);
    return false;
  }
}

export async function requestClipboardPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { Clipboard } = await import("@capacitor/clipboard");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Clipboard error:", e);
    return false;
  }
}

export async function requestSharePermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { Share } = await import("@capacitor/share");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Share error:", e);
    return false;
  }
}

export async function requestBrowserPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { Browser } = await import("@capacitor/browser");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Browser error:", e);
    return false;
  }
}

export async function requestDialogPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { Dialog } = await import("@capacitor/dialog");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Dialog error:", e);
    return false;
  }
}

export async function requestActionSheetPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { ActionSheet } = await import("@capacitor/action-sheet");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Action Sheet error:", e);
    return false;
  }
}

export async function requestToastPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { Toast } = await import("@capacitor/toast");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Toast error:", e);
    return false;
  }
}

export async function requestPrivacyScreenPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { PrivacyScreen } = await import("@capacitor/privacy-screen");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Privacy Screen error:", e);
    return false;
  }
}

export async function requestScreenReaderPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { ScreenReader } = await import("@capacitor/screen-reader");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Screen Reader error:", e);
    return false;
  }
}

export async function requestTextZoomPermission(): Promise<boolean> {
  if (!isCapacitorAvailable()) {
    return true;
  }

  try {
    const { TextZoom } = await import("@capacitor/text-zoom");
    return true;
  } catch (e) {
    console.warn("[CapacitorPermissions] Text Zoom error:", e);
    return false;
  }
}

export async function requestAllPermissions(): Promise<Record<PermissionGroup, boolean>> {
  const [mic, loc, notif, cam, push, keyboard, haptics, motion, clipboard, share, browser, dialog, actionSheet, toast, privacyScreen, screenReader, textZoom] = await Promise.all([
    requestMicrophonePermission().catch(() => false),
    (async () => {
      try {
        const { requestLocationPermission } = await import("./capacitor-geolocation");
        return await requestLocationPermission();
      } catch { return false; }
    })(),
    requestNotificationPermission().catch(() => false),
    requestCameraPermission().catch(() => false),
    requestPushNotificationPermission().catch(() => false),
    requestKeyboardPermission().catch(() => false),
    requestHapticsPermission().catch(() => false),
    requestMotionPermission().catch(() => false),
    requestClipboardPermission().catch(() => false),
    requestSharePermission().catch(() => false),
    requestBrowserPermission().catch(() => false),
    requestDialogPermission().catch(() => false),
    requestActionSheetPermission().catch(() => false),
    requestToastPermission().catch(() => false),
    requestPrivacyScreenPermission().catch(() => false),
    requestScreenReaderPermission().catch(() => false),
    requestTextZoomPermission().catch(() => false),
  ]);

  return {
    microphone: mic,
    location: loc,
    notifications: notif,
    storage: true,
    camera: cam,
    push_notifications: push,
    keyboard: keyboard,
    haptics: haptics,
    motion: motion,
    clipboard: clipboard,
    share: share,
    browser: browser,
    dialog: dialog,
    action_sheet: actionSheet,
    toast: toast,
    privacy_screen: privacyScreen,
    screen_reader: screenReader,
    text_zoom: textZoom,
  };
}
