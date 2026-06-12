// ── Socket.IO Server ──────────────────────────────────────────
// Set NEXT_PUBLIC_SOCKET_URL env var at build time to override.
// Default: localhost:3001 (dev), climaneer-v2.onrender.com (prod)
// Electron: bundled server runs on localhost:3001
const isElectron = typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");
const isDev = process.env.NODE_ENV === "development";
const defaultProdUrl = "https://climaneer-v2.onrender.com";

export const SOCKET_URL = (() => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (isElectron || isDev) return "http://localhost:3001";
  return defaultProdUrl;
})();

// ── AI Voice Command Parser (Optional) ────────────────────────
// Provider: "gemini" | "openrouter" | ""
export const AI_PROVIDER = "";

// Your API key for the chosen provider:
export const GEMINI_API_KEY = "";
export const OPENROUTER_API_KEY = "";

// Optional model override (leave empty for default):
export const AI_MODEL = "";

export const hasAIKeys = !!(GEMINI_API_KEY || OPENROUTER_API_KEY);
