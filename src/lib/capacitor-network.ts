import { isCapacitorAvailable } from "@/lib/capacitor-platform";

export interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (isCapacitorAvailable()) {
    try {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType || "unknown",
      };
    } catch (error) {
      console.warn("[CapacitorNetwork] getStatus failed:", error);
    }
  }

  const connected = typeof navigator !== "undefined" ? navigator.onLine : true;
  return { connected, connectionType: connected ? "online" : "offline" };
}

export async function addNetworkStatusListener(
  callback: (status: NetworkStatus) => void
): Promise<() => void> {
  if (isCapacitorAvailable()) {
    try {
      const { Network } = await import("@capacitor/network");
      const listener = await Network.addListener("networkStatusChange", (status) => {
        callback({ connected: status.connected, connectionType: status.connectionType || "unknown" });
      });
      return () => listener.remove();
    } catch (error) {
      console.warn("[CapacitorNetwork] addListener failed:", error);
    }
  }

  const onlineHandler = () => callback({ connected: true, connectionType: "online" });
  const offlineHandler = () => callback({ connected: false, connectionType: "offline" });
  if (typeof window !== "undefined") {
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    }
  };
}
