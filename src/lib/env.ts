// ── Socket.IO Server ──────────────────────────────────────────
// Auto-switches: localhost in dev, Render URL in production
export const SOCKET_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:3001"
  : "https://climaneer-server.onrender.com";

// ── AI Voice Command Parser (Optional) ────────────────────────
// Provider: "gemini" | "openrouter" | ""
export const AI_PROVIDER = "";

// Your API key for the chosen provider:
export const GEMINI_API_KEY = "";
export const OPENROUTER_API_KEY = "";

// Optional model override (leave empty for default):
export const AI_MODEL = "";

export const hasAIKeys = !!(GEMINI_API_KEY || OPENROUTER_API_KEY);
