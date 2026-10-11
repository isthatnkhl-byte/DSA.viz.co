/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from "@google/genai";
import { getActiveRequestUserKeys } from "./user-keys.server";

const env = typeof process !== "undefined" && process?.env ? process.env : {};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_API_BASE_URL = (
  env["GEMINI_API_BASE_URL"] || "https://generativelanguage.googleapis.com/v1beta"
).replace(/\/+$/, "");

const DEFAULT_GEMINI_MODEL = env["DEFAULT_MODEL_NAME"] || env["GEMINI_MODEL"] || "gemini-2.5-flash";
const API_TIMEOUT_MS = Number(env["AI_TIMEOUT_MS"]) || 120000;

/** Supported review models prioritized by speed, availability, and capability. */
export const REVIEW_MODELS = Array.from(
  new Set([
    DEFAULT_GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "openai/gpt-4o-mini",
    "gpt-4o-mini",
    "gpt-4o",
    "qwen/qwen-2.5-coder-32b-instruct",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-small-3",
  ]),
);

/** Supported visualizer models prioritized by speed, availability, and capability. */
export const VIZ_MODELS = Array.from(
  new Set([
    DEFAULT_GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "openai/gpt-4o-mini",
    "gpt-4o-mini",
    "gpt-4o",
    "qwen/qwen-2.5-coder-32b-instruct",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-small-3",
  ]),
);

const clean = (val?: string | null): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

export function getOpenRouterKey(): string {
  const reqKeys = getActiveRequestUserKeys();
  if (reqKeys?.hasPersonalKey) {
    return clean(reqKeys.openRouterKey || "");
  }

  const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process?.env ? process.env : {};

  return clean(
    env["OPENROUTER_API_KEY"] ||
    env["OPEN_ROUTER_API_KEY"] ||
    env["Openrouterapi"] ||
    env["VITE_OPENROUTER_API_KEY"] ||
    ""
  );
}

export function getOpenAIKey(): string {
  const reqKeys = getActiveRequestUserKeys();
  if (reqKeys?.hasPersonalKey) {
    return clean(reqKeys.openAIKey || "");
  }

  const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process?.env ? process.env : {};

  return clean(
    env["OPENAI_API_KEY"] ||
    env["OPEN_AI_API_KEY"] ||
    env["VITE_OPENAI_API_KEY"] ||
    ""
  );
}

export function getGeminiKey(): string {
  const reqKeys = getActiveRequestUserKeys();
  if (reqKeys?.hasPersonalKey) {
    return clean(reqKeys.geminiKey || "");
  }

  const env: Record<string, string | undefined> =
    typeof process !== "undefined" && process?.env ? process.env : {};

  return clean(
    env["GEMINI_API_KEY"] ||
    env["GOOGLE_API_KEY"] ||
    env["VITE_GEMINI_API_KEY"] ||
    env["VITE_GOOGLE_API_KEY"] ||
    ""
  );
}

export function isGeminiKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith("AIza") || key.startsWith("AQ.")) return true;
  if (key.startsWith("sk-or-") || key.startsWith("sk-proj-") || key.startsWith("sk-")) return false;
  return true;
}

export function isOpenRouterKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith("sk-or-")) return true;
  if (key.startsWith("sk-proj-")) return false;
  if (key.startsWith("AIza") || key.startsWith("AQ.")) return false;
  return false;
}

export function isOpenAIKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith("sk-proj-") || (key.startsWith("sk-") && !key.startsWith("sk-or-"))) return true;
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

function describe(status: number, model: string, provider: "OpenRouter" | "Gemini" | "OpenAI") {
  if (provider === "Gemini") {
    if (status === 400) return `Gemini rejected the model request for ${model} (400).`;
    if (status === 401 || status === 403)
      return "Gemini key is missing, invalid, or blocked (401/403).";
    if (status === 404)
      return `Gemini model is unavailable for this account or API version: ${model} (404).`;
    if (status === 429) return "Gemini rate limit reached (429).";
    if (status === 503) return "Gemini model is currently experiencing high demand (503).";
    return `Gemini error ${status} on ${model}.`;
  }
  if (provider === "OpenAI") {
    if (status === 401) return "OpenAI key is invalid or expired (401).";
    if (status === 403) return "OpenAI access forbidden or quota restricted (403).";
    if (status === 429) return "OpenAI credit balance exhausted or rate limited (429).";
    if (status === 503) return "OpenAI servers temporarily unavailable (503).";
    return `OpenAI error ${status} on ${model}.`;
  }
  if (status === 401) return "OpenRouter rejected the key (401).";
  if (status === 403)
    return "OpenRouter key limit or credits exceeded (403) — raise the key limit or add credits.";
  if (status === 429) return "OpenRouter rate limited this key (429).";
  return `OpenRouter error ${status} on ${model}.`;
}

export async function callOpenAIModel(
  model: string,
  key: string,
  system: string,
  user: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const openAIModel = model.startsWith("openai/")
    ? model.replace(/^openai\//, "")
    : model.startsWith("gpt-")
      ? model
      : "gpt-4o-mini";
  try {
    let res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAIModel,
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
      res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openAIModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 8192,
        }),
        signal: controller.signal,
      });
    }

    if (!res.ok) throw new Error(describe(res.status, openAIModel, "OpenAI"));
    const data = (await res.json()) as any;
    return extractJson(data?.choices?.[0]?.message?.content ?? "");
  } catch (err: any) {
    if (err?.name === "AbortError" || controller.signal.aborted) {
      throw new Error(`OpenAI model ${openAIModel} timed out after ${API_TIMEOUT_MS}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOpenRouterModel(
  model: string,
  key: string,
  system: string,
  user: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
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
  } catch (err: any) {
    if (err?.name === "AbortError" || controller.signal.aborted) {
      throw new Error(`OpenRouter model ${model} timed out after ${API_TIMEOUT_MS}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGeminiModel(model: string, key: string, system: string, user: string) {
  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    const resp = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: user }] }],
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });
    const parsed = extractJson(resp.text || "");
    if (parsed) return parsed;
  } catch {
    // Fall through to direct REST fetch below
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const url = `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const geminiHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "aistudio-build",
    };
    let res = await fetch(url, {
      method: "POST",
      headers: geminiHeaders,
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
        headers: geminiHeaders,
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
  } catch (err: any) {
    if (err?.name === "AbortError" || controller.signal.aborted) {
      throw new Error(`Gemini model ${model} timed out after ${API_TIMEOUT_MS}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function callModel(
  model: string,
  key: string,
  system: string,
  user: string,
  provider: "openrouter" | "gemini" | "openai",
) {
  if (provider === "gemini") return callGeminiModel(model, key, system, user);
  if (provider === "openai") return callOpenAIModel(model, key, system, user);
  return callOpenRouterModel(model, key, system, user);
}

function providerForModel(model: string): "openrouter" | "gemini" | "openai" {
  if (model.startsWith("gemini-")) return "gemini";
  if (model.startsWith("openai/") || model.startsWith("gpt-")) return "openai";
  return "openrouter";
}

/**
 * Sequentially queries AI candidate models across Gemini, OpenAI, and OpenRouter providers.
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
  const envOpenAIKey = getOpenAIKey();
  const envOpenRouterKey = getOpenRouterKey();

  const effectiveGeminiKey = (isGeminiKey(key) ? key : "") || envGeminiKey;
  const effectiveOpenAIKey = (isOpenAIKey(key) ? key : "") || envOpenAIKey;
  const effectiveOpenRouterKey = (isOpenRouterKey(key) ? key : "") || envOpenRouterKey;
  const fallbackKey = key || effectiveGeminiKey || effectiveOpenAIKey || effectiveOpenRouterKey;

  const executableCandidates: Array<{
    model: string;
    targetModel: string;
    key: string;
    provider: "gemini" | "openrouter" | "openai";
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
      if (!effectiveGeminiKey && !effectiveOpenRouterKey && !effectiveOpenAIKey && fallbackKey) {
        executableCandidates.push({
          model,
          targetModel: model,
          key: fallbackKey,
          provider: providerForModel(model),
        });
      }
    } else if (model.startsWith("openai/") || model.startsWith("gpt-")) {
      // 1. Direct OpenAI API if OpenAI key is available
      if (effectiveOpenAIKey) {
        executableCandidates.push({
          model,
          targetModel: model,
          key: effectiveOpenAIKey,
          provider: "openai",
        });
      }
      // 2. OpenRouter fallback for OpenAI models
      if (effectiveOpenRouterKey) {
        const orModel = model.startsWith("openai/") ? model : `openai/${model}`;
        executableCandidates.push({
          model,
          targetModel: orModel,
          key: effectiveOpenRouterKey,
          provider: "openrouter",
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
      // Third-party models (Meta, Qwen, Mistral, DeepSeek, NVIDIA, etc.)
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

  // If OpenAI key is available, add OpenAI models as fallback candidates if not already present
  if (effectiveOpenAIKey) {
    const defaultOpenAIModels = ["gpt-4o-mini", "gpt-4o"];
    for (const oModel of defaultOpenAIModels) {
      if (!executableCandidates.some((c) => c.provider === "openai" && c.targetModel === oModel)) {
        executableCandidates.push({
          model: oModel,
          targetModel: oModel,
          key: effectiveOpenAIKey,
          provider: "openai",
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
      if (error.includes("(401)") || error.includes("(403)") || error.includes("(429)")) {
        // If the API key is unauthorized or out of credits, don't keep trying other models on the same provider
        failedProviders.add(candidate.provider);
      }
    }
  }

  return { json: null, model: "", error };
}

/** Backwards-compatible alias for queryModelWithFallbacks. */
export const raceModels = queryModelWithFallbacks;
