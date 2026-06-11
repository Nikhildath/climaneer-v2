"use client";

import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/env";

let socket: Socket | null = null;
let pendingCommands: Array<{ event: string; data?: any }> = [];
let isFlushing = false;

function flushPending() {
  if (isFlushing) return;
  isFlushing = true;
  while (pendingCommands.length > 0 && socket?.connected) {
    const cmd = pendingCommands.shift()!;
    console.log(`[Socket] Flushing queued command: ${cmd.event}`);
    socket.emit(cmd.event, cmd.data);
  }
  isFlushing = false;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected", socket?.id);
      socket?.emit("dashboard_join");
      flushPending();
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });
  }
  return socket;
}

export function onSocketEvent(event: string, handler: (...args: any[]) => void) {
  const s = getSocket();
  s.on(event, handler);
}

export function removeSocketEvent(event: string) {
  if (socket) {
    socket.off(event);
  }
}

export function emitSocket(event: string, data?: any): boolean {
  const s = getSocket();
  if (s.connected) {
    s.emit(event, data);
    return true;
  } else {
    console.log(`[Socket] Not connected, queuing command: ${event}`);
    pendingCommands.push({ event, data });
    return false;
  }
}
