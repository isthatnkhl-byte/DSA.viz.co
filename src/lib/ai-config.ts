export type AiProvider = "gemini" | "openrouter" | "openai" | "none";

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

  const openAIKey =
    env["OPENAI_API_KEY"] ||
    env["OPEN_AI_API_KEY"] ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_OPENAI_API_KEY) ||
    "";

  const reviewKey = geminiKey || openRouterKey || openAIKey;
  const vizKey = geminiKey || openRouterKey || openAIKey;

  const reviewProvider: AiProvider = geminiKey
    ? "gemini"
    : openRouterKey
      ? "openrouter"
      : openAIKey
        ? "openai"
        : "none";
  const vizProvider: AiProvider = geminiKey
    ? "gemini"
    : openRouterKey
      ? "openrouter"
      : openAIKey
        ? "openai"
        : "none";

  return {
    geminiKey,
    openRouterKey,
    openAIKey,
    reviewKey,
    vizKey,
    reviewProvider,
    vizProvider,
  };
}
