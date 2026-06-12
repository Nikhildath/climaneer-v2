// ── Socket.IO Server ──────────────────────────────────────────
// Set NEXT_PUBLIC_SOCKET_URL env var at build time to override.
// Default: localhost:3001 (dev), climaneer-v2.onrender.com (prod)
const defaultProdUrl = "https://climaneer-v2.onrender.com";
export const SOCKET_URL = process.env.NODE_ENV === "development"
  ? (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001")
  : (process.env.NEXT_PUBLIC_SOCKET_URL || defaultProdUrl);

// ── AI Voice Command Parser (Optional) ────────────────────────
// Provider: "gemini" | "openrouter" | ""
export const AI_PROVIDER = "";

// Your API key for the chosen provider:
export const GEMINI_API_KEY = "";
export const OPENROUTER_API_KEY = "";

// Optional model override (leave empty for default):
export const AI_MODEL = "";

export const hasAIKeys = !!(GEMINI_API_KEY || OPENROUTER_API_KEY);
