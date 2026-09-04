export type AiProvider = "gemini" | "openrouter" | "none";

const clean = (val?: string | null): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

export function getAiConfig() {
  const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process?.env ? process.env : {};

  const geminiKey = clean(
    env["GEMINI_API_KEY"] ||
    env["GOOGLE_API_KEY"] ||
    ""
  );

  const openRouterKey = clean(
    env["OPENROUTER_API_KEY"] ||
    env["OPEN_ROUTER_API_KEY"] ||
    env["Openrouterapi"] ||
    ""
  );

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

