import { getGeminiKey, getOpenAIKey, getOpenRouterKey } from "./openrouter.server";

export type AiProvider = "gemini" | "openrouter" | "openai" | "none";

export function getAiConfig() {
  // Never read VITE_* client variables on the frontend; only resolve keys on the backend
  if (typeof window !== "undefined") {
    return {
      geminiKey: "",
      openRouterKey: "",
      openAIKey: "",
      reviewKey: "",
      vizKey: "",
      reviewProvider: "none" as AiProvider,
      vizProvider: "none" as AiProvider,
    };
  }

  const geminiKey = getGeminiKey();
  const openRouterKey = getOpenRouterKey();
  const openAIKey = getOpenAIKey();

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
