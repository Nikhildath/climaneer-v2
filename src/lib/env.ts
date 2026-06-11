// ── Socket.IO Server ──────────────────────────────────────────
// npm run dev       → process.env.NODE_ENV = "development"  → localhost
// npm run build+start → process.env.NODE_ENV = "production"  → Render
export const SOCKET_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:3001"
  : "https://climaneer-v2.onrender.com";

// ── AI Voice Command Parser (Optional) ────────────────────────
// Provider: "gemini" | "openrouter" | ""
export const AI_PROVIDER = "";

// Your API key for the chosen provider:
export const GEMINI_API_KEY = "";
export const OPENROUTER_API_KEY = "";

// Optional model override (leave empty for default):
export const AI_MODEL = "";

export const hasAIKeys = !!(GEMINI_API_KEY || OPENROUTER_API_KEY);
