"use client";

import { WS_URL } from "@/lib/env";

type MessageHandler = (data: any) => void;

let ws: WebSocket | null = null;
let listeners: Map<string, Set<MessageHandler>> = new Map();
let pendingMessages: string[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let intentionalClose = false;

function processMessage(raw: string) {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  const type = msg.type;
  if (!type) return;

  // Strip 'type' and pass the rest as data
  const { type: _, ...data } = msg;

  emitToLocal(type, data);
}

function emitToLocal(type: string, data: any) {
  const handlers = listeners.get(type);
  if (handlers) {
    for (const h of handlers) {
      try { h(data); } catch (err) { console.error("[WS] Handler error:", err); }
    }
  }
}

function flushPending() {
  while (pendingMessages.length > 0 && ws?.readyState === WebSocket.OPEN) {
    const msg = pendingMessages.shift()!;
    ws.send(msg);
  }
}

function scheduleReconnect() {
  if (intentionalClose) return;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 1.5, 5000);
    connect();
  }, reconnectDelay);
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  intentionalClose = false;
  console.log("[WS] Connecting to", WS_URL);

  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    console.error("[WS] Failed to create:", err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log("[WS] Connected");
    reconnectDelay = 1000;
    // Register as dashboard
    send({ type: "register_dashboard" });
    flushPending();

    // Notify handlers
    emitToLocal("connect", {});
  };

  ws.onmessage = (event) => {
    processMessage(typeof event.data === "string" ? event.data : String(event.data));
  };

  ws.onclose = (event) => {
    console.log("[WS] Disconnected:", event.code, event.reason);
    ws = null;
    emitToLocal("disconnect", { reason: event.code });
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
    emitToLocal("connect_error", { message: "WebSocket error" });
  };
}

// ── Public API ───────────────────────────────────────────

export function getSocket(): WebSocket {
  connect();
  return ws!;
}

export function send(data: any) {
  const json = JSON.stringify(data);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(json);
    return true;
  } else {
    console.log("[WS] Not connected, queuing:", data.type);
    pendingMessages.push(json);
    connect();
    return false;
  }
}

export function onSocketEvent(type: string, handler: MessageHandler) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(handler);

  // Auto-connect when first listener is added
  if (listeners.size === 1) {
    connect();
  }
}

export function removeSocketEvent(type: string) {
  listeners.delete(type);
}

export function disconnectSocket() {
  intentionalClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function emitSocket(type: string, data?: any): boolean {
  return send({ type, ...data });
}
