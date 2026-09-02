/* eslint-disable @typescript-eslint/no-explicit-any */

const env = typeof process !== "undefined" && process?.env ? process.env : {};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_API_BASE_URL = (
  env["GEMINI_API_BASE_URL"] || "https://generativelanguage.googleapis.com/v1beta"
).replace(/\/+$/, "");

const DEFAULT_GEMINI_MODEL = env["DEFAULT_MODEL_NAME"] || env["GEMINI_MODEL"] || "gemini-3.1-flash-lite";

/** Supported review models across Gemini and OpenRouter. */
export const REVIEW_MODELS = Array.from(
  new Set([
    DEFAULT_GEMINI_MODEL,
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.6-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "nvidia/nemotron-3.5-lightning:free",
    "stealth/ox-alpha",
    "dots-studio/dots-3-note-preview:free",
    "liquid/lfm-2.5-2.6b:free",
    "poolside/laguna-s-2.1:free",
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen-2.5-coder-32b-instruct",
    "mistralai/mistral-small-3",
    "deepseek/deepseek-chat",
  ]),
);

/** Supported visualizer models across Gemini and OpenRouter. */
export const VIZ_MODELS = Array.from(
  new Set([
    DEFAULT_GEMINI_MODEL,
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.6-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "nvidia/nemotron-3.5-lightning:free",
    "stealth/ox-alpha",
    "dots-studio/dots-3-note-preview:free",
    "liquid/lfm-2.5-2.6b:free",
    "poolside/laguna-s-2.1:free",
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-4o-mini",
    "qwen/qwen-2.5-coder-32b-instruct",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-small-3",
    "deepseek/deepseek-chat",
  ]),
);

const clean = (val?: string | null): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

export function getOpenRouterKey(): string {
  const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process?.env ? process.env : {};

  return clean(
    env["OPENROUTER_API_KEY"] ||
    env["VITE_OPENROUTER_API_KEY"] ||
    env["OPEN_ROUTER_API_KEY"] ||
    env["VITE_OPEN_ROUTER_API_KEY"] ||
    env["Openrouterapi"] ||
    env["VITE_Openrouterapi"] ||
    ""
  );
}

export function getGeminiKey(): string {
  const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process?.env ? process.env : {};

  return clean(
    env["GEMINI_API_KEY"] ||
    env["VITE_GEMINI_API_KEY"] ||
    env["GOOGLE_API_KEY"] ||
    env["VITE_GOOGLE_API_KEY"] ||
    ""
  );
}

export function isGeminiKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith("AIza") || key.startsWith("AQ.")) return true;
  if (key.startsWith("sk-or-") || key.startsWith("sk-")) return false;
  return true;
}

export function isOpenRouterKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith("sk-or-") || key.startsWith("sk-")) return true;
  if (key.startsWith("AIza") || key.startsWith("AQ.")) return false;
  return false;
}

/** Tolerant JSON extraction — raw, fenced, or embedded in prose with trailing comma cleanup. */
export function extractJson(str: string): any | null {
  if (!str) return null;
  const attempts: string[] = [str];
  const fenced = str.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) attempts.push(fenced[1]);
  const first = str.indexOf("{");
  const last = str.lastIndexOf("}");
  if (first !== -1 && last > first) attempts.push(str.slice(first, last + 1));
  for (const a of attempts) {
    const trimmed = a.trim();
    const parseAttempts = [trimmed, trimmed.replace(/,\s*([}\]])/g, "$1")];
    for (const textToParse of parseAttempts) {
      try {
        const parsed = JSON.parse(textToParse);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed)) {
            return { viz_steps: parsed };
          }
          if (!parsed.viz_steps && (parsed.vizSteps || parsed.steps)) {
            parsed.viz_steps = parsed.vizSteps || parsed.steps;
          }
          if (!parsed.code_lines && (parsed.codeLines || parsed.code)) {
            parsed.code_lines = parsed.codeLines || parsed.code;
          }
          if (!parsed.test_array && (parsed.testArray || parsed.testCase || parsed.array)) {
            parsed.test_array = parsed.testArray || parsed.testCase || parsed.array;
          }
          return parsed;
        }
      } catch {
        /* keep trying */
      }
    }
  }
  return null;
}

function describe(status: number, model: string, provider: "OpenRouter" | "Gemini") {
  if (provider === "Gemini") {
    if (status === 400) return `Gemini rejected the model request for ${model} (400).`;
    if (status === 401 || status === 403)
      return "Gemini key is missing, invalid, or blocked (401/403).";
    if (status === 404)
      return `Gemini model is unavailable for this account or API version: ${model} (404).`;
    if (status === 429) return "Gemini rate limit reached (429).";
    return `Gemini error ${status} on ${model}.`;
  }
  if (status === 401) return "OpenRouter rejected the key (401).";
  if (status === 403)
    return "OpenRouter key limit or credits exceeded (403) — raise the key limit or add credits.";
  if (status === 429) return "OpenRouter rate limited this key (429).";
  return `OpenRouter error ${status} on ${model}.`;
}

export async function callOpenRouterModel(
  model: string,
  key: string,
  system: string,
  user: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    let res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "DSA.viz",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_tokens: 8192,
      }),
      signal: controller.signal,
    });

    if (!res.ok && res.status === 400) {
      res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Title": "DSA.viz",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 8192,
        }),
        signal: controller.signal,
      });
    }

    if (!res.ok) throw new Error(describe(res.status, model, "OpenRouter"));
    const data = (await res.json()) as any;
    return extractJson(data?.choices?.[0]?.message?.content ?? "");
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGeminiModel(model: string, key: string, system: string, user: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const url = `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    let res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          role: "system",
          parts: [{ text: system }],
        },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok && res.status === 400) {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            role: "system",
            parts: [{ text: system }],
          },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            maxOutputTokens: 8192,
          },
        }),
        signal: controller.signal,
      });
    }

    if (!res.ok) throw new Error(describe(res.status, model, "Gemini"));
    const data = (await res.json()) as any;
    const text =
      data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? "").join("") ?? "";
    return extractJson(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function callModel(
  model: string,
  key: string,
  system: string,
  user: string,
  provider: "openrouter" | "gemini",
) {
  if (provider === "gemini") return callGeminiModel(model, key, system, user);
  return callOpenRouterModel(model, key, system, user);
}

function providerForModel(model: string): "openrouter" | "gemini" {
  return model.startsWith("gemini-") ? "gemini" : "openrouter";
}

/**
 * Sequentially queries AI candidate models across Gemini and OpenRouter providers.
 * Evaluates the response with the validator predicate and returns the first valid result,
 * providing robust multi-provider failover.
 */
export async function queryModelWithFallbacks(
  models: string[],
  key: string,
  system: string,
  user: string,
  ok: (json: any) => boolean,
): Promise<{ json: any; model: string; error: string | null }> {
  let error: string | null = null;

  const envGeminiKey = getGeminiKey();
  const envOpenRouterKey = getOpenRouterKey();

  const effectiveGeminiKey = (isGeminiKey(key) ? key : "") || envGeminiKey;
  const effectiveOpenRouterKey = (isOpenRouterKey(key) ? key : "") || envOpenRouterKey;
  const fallbackKey = key || effectiveGeminiKey || effectiveOpenRouterKey;

  const executableCandidates: Array<{
    model: string;
    targetModel: string;
    key: string;
    provider: "gemini" | "openrouter";
  }> = [];

  for (const model of models) {
    if (model.startsWith("gemini-")) {
      // 1. Direct Gemini API if Gemini key is available
      if (effectiveGeminiKey) {
        executableCandidates.push({
          model,
          targetModel: model,
          key: effectiveGeminiKey,
          provider: "gemini",
        });
      }
      // 2. OpenRouter routing for gemini model if OpenRouter key is available
      if (effectiveOpenRouterKey) {
        const orModel =
          model === "gemini-2.0-flash"
            ? "google/gemini-2.0-flash-001"
            : model.startsWith("google/")
              ? model
              : `google/${model}`;
        executableCandidates.push({
          model,
          targetModel: orModel,
          key: effectiveOpenRouterKey,
          provider: "openrouter",
        });
      }
      if (!effectiveGeminiKey && !effectiveOpenRouterKey && fallbackKey) {
        executableCandidates.push({
          model,
          targetModel: model,
          key: fallbackKey,
          provider: providerForModel(model),
        });
      }
    } else if (model.startsWith("google/")) {
      // 1. OpenRouter
      if (effectiveOpenRouterKey) {
        executableCandidates.push({
          model,
          targetModel: model,
          key: effectiveOpenRouterKey,
          provider: "openrouter",
        });
      }
      // 2. Direct Gemini if it's a gemini model and Gemini key is available
      if (effectiveGeminiKey && model.includes("gemini")) {
        const directModel = model.replace(/^google\//, "").replace(/:free$/, "");
        executableCandidates.push({
          model,
          targetModel: directModel,
          key: effectiveGeminiKey,
          provider: "gemini",
        });
      }
    } else {
      // Third-party models (OpenAI, Meta, Qwen, Mistral, DeepSeek, NVIDIA, etc.)
      if (effectiveOpenRouterKey) {
        executableCandidates.push({
          model,
          targetModel: model,
          key: effectiveOpenRouterKey,
          provider: "openrouter",
        });
      } else if (fallbackKey && isOpenRouterKey(fallbackKey)) {
        executableCandidates.push({
          model,
          targetModel: model,
          key: fallbackKey,
          provider: "openrouter",
        });
      }
    }
  }

  const seen = new Set<string>();
  const uniqueCandidates = executableCandidates.filter((c) => {
    const sig = `${c.provider}:${c.targetModel}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  const failedProviders = new Set<string>();

  for (const candidate of uniqueCandidates) {
    if (failedProviders.has(candidate.provider)) continue;

    try {
      const json = await callModel(
        candidate.targetModel,
        candidate.key,
        system,
        user,
        candidate.provider,
      );
      if (json && ok(json)) return { json, model: candidate.model, error: null };
      error = `${candidate.model} returned an unusable response.`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      if (error.includes("(401)") || error.includes("(403)")) {
        // If the API key is unauthorized or out of credits, don't try other models on the same provider
        failedProviders.add(candidate.provider);
      }
    }
  }

  return { json: null, model: "", error };
}

/** Backwards-compatible alias for queryModelWithFallbacks. */
export const raceModels = queryModelWithFallbacks;
