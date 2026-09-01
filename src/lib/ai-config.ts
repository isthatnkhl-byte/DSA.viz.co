export type AiProvider = "gemini" | "openrouter" | "none";

export function getAiConfig() {
  const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process?.env ? process.env : {};

  const geminiKey =
    env["GEMINI_API_KEY"] ||
    env["GOOGLE_API_KEY"] ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    "";

  const openRouterKey =
    env["OPENROUTER_API_KEY"] ||
    env["OPEN_ROUTER_API_KEY"] ||
    env["Openrouterapi"] ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_OPENROUTER_API_KEY) ||
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
