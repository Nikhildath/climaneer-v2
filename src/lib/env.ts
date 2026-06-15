// ── WebSocket Server ─────────────────────────────────────
// Set NEXT_PUBLIC_WS_URL env var at build time to override.
// Default: localhost:3001 (dev), climaneer-v2.onrender.com (prod)
const isElectron = typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");
const isDev = process.env.NODE_ENV === "development";
const defaultProdUrl = "https://climaneer-v2.onrender.com";

const baseUrl = (() => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (isElectron || isDev) return "http://localhost:3001";
  return defaultProdUrl;
})();

export const WS_URL = baseUrl.replace(/^http/, "ws") + "/ws";

// ── AI Voice Command Parser (Optional) ────────────────────
export const AI_PROVIDER = "";
export const GEMINI_API_KEY = "";
export const OPENROUTER_API_KEY = "";
export const AI_MODEL = "";
export const hasAIKeys = !!(GEMINI_API_KEY || OPENROUTER_API_KEY);
