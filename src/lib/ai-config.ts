export type AiProvider = "gemini" | "openrouter" | "none";

export function getAiConfig() {
  const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process?.env ? process.env : {};
  const metaEnv: Record<string, string | undefined> =
    typeof import.meta !== "undefined" && (import.meta as any).env ? (import.meta as any).env : {};

  const geminiKey =
    env["GEMINI_API_KEY"] ||
    env["VITE_GEMINI_API_KEY"] ||
    env["GOOGLE_API_KEY"] ||
    env["VITE_GOOGLE_API_KEY"] ||
    metaEnv["VITE_GEMINI_API_KEY"] ||
    metaEnv["VITE_GOOGLE_API_KEY"] ||
    metaEnv["GEMINI_API_KEY"] ||
    "";

  const openRouterKey =
    env["OPENROUTER_API_KEY"] ||
    env["VITE_OPENROUTER_API_KEY"] ||
    env["OPEN_ROUTER_API_KEY"] ||
    env["VITE_OPEN_ROUTER_API_KEY"] ||
    env["Openrouterapi"] ||
    env["VITE_Openrouterapi"] ||
    metaEnv["VITE_OPENROUTER_API_KEY"] ||
    metaEnv["VITE_OPEN_ROUTER_API_KEY"] ||
    metaEnv["OPENROUTER_API_KEY"] ||
    "";

  const reviewKey = geminiKey || openRouterKey;
  const vizKey = geminiKey || openRouterKey;

  const reviewProvider: AiProvider = geminiKey ? "gemini" : openRouterKey ? "openrouter" : "none";
  const vizProvider: AiProvider = geminiKey ? "gemini" : openRouterKey ? "openrouter" : "none";

  return {
    geminiKey,
    openRouterKey,
    reviewKey,
    vizKey,
    reviewProvider,
    vizProvider,
  };
}

