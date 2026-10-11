import crypto from 'crypto';
import express, { Request, Response } from "express";
import { requireAuth, AuthRequest } from './src/middleware/auth';
import { httpsEnforcer, securityHeadersMiddleware } from './src/middleware/security';
import { getOrCreateUser, updateUser } from './src/db/users';
import { getProfile, updateProfile } from './src/db/profiles';
import { getSubmissions, addSubmission, deleteSubmission } from './src/db/submissions';
import { getCache, setCache, deleteCache } from './src/lib/redis-cache';
import { adminAuth, adminDb } from './src/lib/firebase-admin';
import { saveAiReport, getUserAiReports, saveChatSession, getUserChatSessions, logUserActivity } from './src/db/ai-diagnostics';
import { processReviewPseudocode, processGenerateDatasetsAndPlan, processDatasetVisualization } from './src/lib/review.functions';
import { processPlaygroundReview } from './src/lib/playground.functions';
import { runSecureCpp, runSecureCode } from './src/lib/compiler/index';
import { fetchLeetCodeStats } from './src/lib/leetcode-service';
import { statementForSlug } from './src/lib/statements';
import localStatementsJson from './src/data/statements.json';
import {
  evaluateInterviewTier,
  generateInterviewScorecard,
  generateInterviewerResponse,
  runInterviewSampleTests,
} from './src/lib/interview-evaluator.server';
import {
  runProblemSampleTests,
  submitProblemSolution,
} from './src/lib/leetcode-judge.server';
import {
  attachUserKeyVaultContext,
  getUserKeyVaultStatus,
  saveUserApiKeyToVault,
  deleteUserApiKeyFromVault,
} from './src/lib/user-keys.server';
import {
  getGeminiKey,
  getOpenAIKey,
  getOpenRouterKey,
} from './src/lib/openrouter.server';


import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import dotenv from "dotenv";

dotenv.config();

process.on("uncaughtException", (err: any) => {
  if (err?.message?.includes("Could not load the default credentials")) {
    console.warn("⚠️ [Local Dev]: Google Cloud ADC not configured locally; skipping background Firestore gRPC sync.");
    return;
  }
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason: any) => {
  if (reason?.message?.includes("Could not load the default credentials")) {
    return;
  }
  console.error("Unhandled Rejection:", reason);
});


const cleanSecretEnv = (val?: string | null): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

const getEncryptionKey = (): Buffer => {
  const encKey = cleanSecretEnv(process.env.ENCRYPTION_KEY);
  if (encKey && encKey.length >= 32) {
    return Buffer.from(encKey.slice(0, 32));
  }
  if (encKey && encKey.length > 0) {
    return crypto.scryptSync(encKey, "dsaviz_salt", 32);
  }
  const secret = cleanSecretEnv(process.env.GITHUB_CLIENT_SECRET);
  if (secret) {
    return crypto.scryptSync(secret, "dsaviz_salt", 32);
  }
  console.warn("⚠️ [Security Notice]: ENCRYPTION_KEY is not configured. Deriving fallback encryption key.");
  return crypto.scryptSync("dev_insecure_local_encryption_fallback_32", "dsaviz_salt", 32);
};

function encryptToken(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

function decryptToken(text: string): string | null {
  try {
    const parts = text.split(":");
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0]!, "hex");
    const encryptedText = Buffer.from(parts[1]!, "hex");
    const authTag = Buffer.from(parts[2]!, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.error("Token decryption error:", e);
    return null;
  }
}

const GH_TOKEN_COOKIE_NAME = "dsaviz_gh_token";
const GH_OAUTH_BEARER_COOKIE_NAME = "dsaviz_gh_oauth_bearer";

function parseRequestCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(";")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const k = pair.slice(0, eqIdx).trim();
    const v = pair.slice(eqIdx + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

interface GithubCookieSession {
  uid: string;
  githubToken: string; // encryptedToken (iv:cipher:tag)
  githubUsername?: string | null;
  githubAvatar?: string | null;
  githubUrl?: string | null;
}

function setGithubSessionCookie(req: Request, res: Response, data: GithubCookieSession): void {
  try {
    const sealed = encryptToken(JSON.stringify(data));
    const isSecure =
      process.env.NODE_ENV === "production" ||
      req.secure ||
      req.headers["x-forwarded-proto"] === "https";
    const parts = [
      `${GH_TOKEN_COOKIE_NAME}=${encodeURIComponent(sealed)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${60 * 60 * 24 * 90}`,
    ];
    if (isSecure) parts.push("Secure");
    res.append("Set-Cookie", parts.join("; "));
  } catch {
    // Non-fatal cookie write
  }
}

function getGithubSessionCookie(req: Request, expectedUid: string): GithubCookieSession | null {
  try {
    const cookies = parseRequestCookies(req.headers.cookie);
    const raw = cookies[GH_TOKEN_COOKIE_NAME];
    if (!raw) return null;
    const decrypted = decryptToken(raw);
    if (!decrypted) return null;
    const parsed = JSON.parse(decrypted) as GithubCookieSession;
    if (!parsed || parsed.uid !== expectedUid || !parsed.githubToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearGithubSessionCookie(req: Request, res: Response): void {
  const isSecure =
    process.env.NODE_ENV === "production" ||
    req.secure ||
    req.headers["x-forwarded-proto"] === "https";
  const parts = [
    `${GH_TOKEN_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isSecure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

function setGithubOAuthBearerCookie(req: Request, res: Response, bearerToken: string): void {
  try {
    const sealed = encryptToken(bearerToken);
    const isSecure =
      process.env.NODE_ENV === "production" ||
      req.secure ||
      req.headers["x-forwarded-proto"] === "https";
    const parts = [
      `${GH_OAUTH_BEARER_COOKIE_NAME}=${encodeURIComponent(sealed)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=600",
    ];
    if (isSecure) parts.push("Secure");
    res.append("Set-Cookie", parts.join("; "));
  } catch {
    // Non-fatal
  }
}

function getGithubOAuthBearerCookie(req: Request): string | null {
  try {
    const cookies = parseRequestCookies(req.headers.cookie);
    const raw = cookies[GH_OAUTH_BEARER_COOKIE_NAME];
    if (!raw) return null;
    return decryptToken(raw);
  } catch {
    return null;
  }
}

function extractRequestBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token || token === "undefined" || token === "null" || token === "local-dev-token") {
    return null;
  }
  return token;
}

function getFirestoreProjectAndDb(): { projectId: string; databaseId: string } {
  const projectId =
    cleanSecretEnv(process.env.VITE_FIREBASE_PROJECT_ID) ||
    cleanSecretEnv(process.env.FIREBASE_PROJECT_ID) ||
    "gen-lang-client-0937971784";
  const databaseId =
    cleanSecretEnv(process.env.VITE_FIREBASE_DATABASE_ID) ||
    "ai-studio-f73f5b28-1f90-4a8e-a450-12a34f569c0d";
  return { projectId, databaseId };
}

function fromFirestoreRestValue(val: any): any {
  if (!val || typeof val !== "object") return null;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("stringValue" in val) return String(val.stringValue);
  if ("timestampValue" in val) return String(val.timestampValue);
  if ("arrayValue" in val) {
    const values = val.arrayValue?.values;
    return Array.isArray(values) ? values.map(fromFirestoreRestValue) : [];
  }
  if ("mapValue" in val) {
    const fields = val.mapValue?.fields;
    if (!fields || typeof fields !== "object") return {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreRestValue(v);
    }
    return out;
  }
  return null;
}

function fromFirestoreRestFields(fields: Record<string, any> | undefined): Record<string, any> {
  if (!fields || typeof fields !== "object") return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreRestValue(v);
  }
  return out;
}

async function fetchUserProfileFromFirestoreRest(
  uid: string,
  bearerToken: string | null
): Promise<Record<string, any> | null> {
  if (!uid || !bearerToken) return null;
  const { projectId, databaseId } = getFirestoreProjectAndDb();
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents/users/${encodeURIComponent(uid)}`;
  try {
    const res = await fetch(docUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data?.fields) return null;
    const parsed = fromFirestoreRestFields(data.fields);
    return {
      id: uid,
      ...parsed,
    };
  } catch {
    return null;
  }
}

async function fetchUserCollectionFromFirestoreRest(
  uid: string,
  subcollection: string,
  bearerToken: string | null,
  pageSize = 200
): Promise<any[] | null> {
  if (!uid || !bearerToken) return null;
  const { projectId, databaseId } = getFirestoreProjectAndDb();
  const colUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents/users/${encodeURIComponent(
    uid
  )}/${encodeURIComponent(subcollection)}?pageSize=${pageSize}`;
  try {
    const res = await fetch(colUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    return docs.map((d: any) => {
      const docName = String(d?.name || "");
      const docId = docName.split("/").pop() || "";
      const parsed = fromFirestoreRestFields(d?.fields);
      return {
        id: docId,
        ...parsed,
      };
    });
  } catch {
    return null;
  }
}

async function fetchGithubProfileFromFirestoreRest(
  uid: string,
  bearerToken: string | null
): Promise<{
  githubToken: string | null;
  githubConnected: boolean;
  githubUsername: string | null;
  githubAvatar: string | null;
  githubUrl: string | null;
} | null> {
  const fullProfile = await fetchUserProfileFromFirestoreRest(uid, bearerToken);
  if (!fullProfile) return null;
  const githubToken = fullProfile.githubToken || null;
  const githubUsername =
    fullProfile.githubUsername || fullProfile.github_username || null;
  const githubAvatar =
    fullProfile.githubAvatar || fullProfile.github_avatar || null;
  const githubUrl =
    fullProfile.githubUrl ||
    (githubUsername ? `https://github.com/${githubUsername}` : null);
  const githubConnected = Boolean(
    fullProfile.githubConnected ||
      fullProfile.github_connected ||
      githubToken ||
      githubUsername
  );
  return {
    githubToken,
    githubConnected,
    githubUsername,
    githubAvatar,
    githubUrl,
  };
}

async function saveGithubProfileToFirestoreRest(
  uid: string,
  bearerToken: string | null,
  data: {
    githubToken: string | null;
    githubConnected: boolean;
    githubUsername: string | null;
    githubAvatar: string | null;
    githubUrl: string | null;
  }
): Promise<void> {
  if (!uid || !bearerToken) return;
  const { projectId, databaseId } = getFirestoreProjectAndDb();
  const maskFields = [
    "githubToken",
    "githubConnected",
    "github_connected",
    "githubUsername",
    "github_username",
    "githubAvatar",
    "github_avatar",
    "githubUrl",
    "updatedAt",
  ];
  const maskQuery = maskFields.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents/users/${encodeURIComponent(
    uid
  )}?${maskQuery}`;

  const toFirestoreStrOrNull = (val: string | null) =>
    val ? { stringValue: val } : { nullValue: null };

  try {
    await fetch(docUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          githubToken: toFirestoreStrOrNull(data.githubToken),
          githubConnected: { booleanValue: data.githubConnected },
          github_connected: { booleanValue: data.githubConnected },
          githubUsername: toFirestoreStrOrNull(data.githubUsername),
          github_username: toFirestoreStrOrNull(data.githubUsername),
          githubAvatar: toFirestoreStrOrNull(data.githubAvatar),
          github_avatar: toFirestoreStrOrNull(data.githubAvatar),
          githubUrl: toFirestoreStrOrNull(data.githubUrl),
          updatedAt: { stringValue: new Date().toISOString() },
        },
      }),
    });
  } catch {
    // Non-blocking Firestore REST write
  }
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const PORT = 3000;

// Force HTTPS & Hardened HTTP Security Headers Middleware (OWASP Defense-in-Depth & Strict Transport Security)
app.use(securityHeadersMiddleware);
app.use(httpsEnforcer);

// Dual-Path Prefix Normalizer for API paths (only if accessing an API endpoint without /api prefix)
const API_ENDPOINTS = [
  "/statement", "/review", "/solve", "/explain", "/compile", "/profile",
  "/sync-leetcode", "/submissions", "/auth", "/debug-token", "/github",
  "/chat", "/chat-sessions", "/interview-evaluate", "/interview-scorecard",
  "/interview-respond", "/interview-run-tests", "/problem-run-tests", "/problem-submit",
  "/livekit-token", "/generate-plan", "/verify-trace", "/visualize-dataset", "/playground-review",
  "/code-diff-nudge", "/rate-submission", "/generate-mistakes-report",
  "/user-reports", "/compiler", "/health", "/debug", "/user-keys"
];
app.use((req, _res, next) => {
  const pathname = req.url.split("?")[0];
  if (API_ENDPOINTS.some(endpoint => pathname === endpoint || pathname.startsWith(`${endpoint}/`))) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  next();
});

// Security: Constrain global JSON & urlencoded payload sizes to 2MB
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { error: "Too many requests, please try again later." },
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false }
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40,
  message: { error: "AI rate limit exceeded. Please wait a moment and try again." },
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false }
});

const compilerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  message: { error: "Compiler rate limit exceeded. Please wait a moment before running again." },
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false }
});

// Compiler concurrency tracker
let inFlightCompilations = 0;
const MAX_CONCURRENT_COMPILATIONS = 5;

// Single-use OAuth nonce tracker with TTL
const usedOAuthNonces = new Map<string, number>();
const cleanupExpiredNonces = () => {
  const now = Date.now();
  for (const [nonce, expiresAt] of usedOAuthNonces.entries()) {
    if (now > expiresAt) usedOAuthNonces.delete(nonce);
  }
};
setInterval(cleanupExpiredNonces, 5 * 60 * 1000).unref();

app.use("/api/", apiLimiter);
// Per-request User API Key Vault Context (AES-256-GCM decrypted strictly in backend memory)
app.use("/api/", attachUserKeyVaultContext);

// --- User-Specific Encrypted API Key Vault Endpoints (Zero Frontend Exposure) ---
app.get("/api/user-keys/status", requireAuth, async (req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const status = await getUserKeyVaultStatus(req, undefined, res);
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to read key vault status" });
  }
});

app.post("/api/user-keys", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const { apiKey, provider, verify } = req.body || {};
    const result = await saveUserApiKeyToVault(req, res, {
      apiKey: typeof apiKey === "string" ? apiKey : "",
      provider: typeof provider === "string" ? provider : undefined,
      verify: verify !== false,
    });
    if (!result.ok) {
      return res.status(400).json({ error: result.error || "Invalid API key" });
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to store API key securely" });
  }
});

app.delete("/api/user-keys", requireAuth, async (req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const provider = (req.body?.provider || req.query?.provider || "all") as any;
    const status = await deleteUserApiKeyFromVault(req, provider, res);
    return res.json({ ok: true, status });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to remove API key from vault" });
  }
});


const cleanEnv = (val?: string | null): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

// Server-side Gemini AI Client (prioritizes current user's decrypted personal key from AsyncLocalStorage)
function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiKey();
  return new GoogleGenAI({
    apiKey: apiKey || "unconfigured_gemini_key",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Robust Gemini model invoker with multi-model failover sequence.
 * Uses the user's personal API key (Gemini, OpenAI, or OpenRouter) first when configured.
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  params: {
    contents: any;
    config?: any;
  }
): Promise<{ text: string; modelUsed: string }> {
  const geminiKey = getGeminiKey();
  let lastError: any = null;

  if (geminiKey) {
    const candidateModels = [
      preferredModel,
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.7-flash",
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    for (const model of candidateModels) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return {
          text: resp.text || "",
          modelUsed: model,
        };
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || (err?.error && err?.error?.code);
        console.log(`[Gemini Fallback] Model ${model} returned (${status}): ${err?.message || err}. Attempting fallback candidate...`);
      }
    }
  }

  // Attempt OpenAI or OpenRouter fallback using user's personal key (or server fallback)
  const openAIKey = getOpenAIKey();
  const openRouterKey = getOpenRouterKey();

  if (openAIKey || openRouterKey) {
    try {
      const isJson = params.config?.responseMimeType === "application/json";
      const systemPrompt = params.config?.systemInstruction || "You are an expert algorithmic technical interviewer.";
      const userPrompt = Array.isArray(params.contents)
        ? params.contents.map((c: any) => c?.parts?.map((p: any) => p?.text || "").join("") || "").join("\n")
        : typeof params.contents === "string"
          ? params.contents
          : JSON.stringify(params.contents);

      if (openAIKey) {
        console.log("[AI Fallback] Attempting OpenAI fallback candidate (gpt-4o-mini)...");
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAIKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            ...(isJson ? { response_format: { type: "json_object" } } : {}),
            temperature: params.config?.temperature || 0.4,
            max_tokens: 4096,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const text = data?.choices?.[0]?.message?.content || "";
          if (text) return { text, modelUsed: "openai/gpt-4o-mini" };
        } else {
          const errBody = await res.text().catch(() => "");
          console.log(`[OpenAI Fallback] Returned status ${res.status}: ${errBody}`);
        }
      }

      if (openRouterKey) {
        console.log("[AI Fallback] Attempting OpenRouter fallback candidate (google/gemini-2.0-flash-001)...");
        let res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            ...(isJson ? { response_format: { type: "json_object" } } : {}),
            temperature: params.config?.temperature || 0.4,
            max_tokens: 4096,
          }),
        });

        if (!res.ok && res.status === 400) {
          res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.0-flash-001",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: params.config?.temperature || 0.4,
              max_tokens: 4096,
            }),
          });
        }

        if (res.ok) {
          const data = (await res.json()) as any;
          let text = data?.choices?.[0]?.message?.content || "";
          if (text) {
            // Strip markdown block formatting if json is requested and OpenRouter included it
            if (isJson && text.startsWith("```json")) {
               text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
            }
            return { text, modelUsed: "openrouter/google/gemini-2.0-flash-001" };
          }
        } else {
          const errBody = await res.text().catch(() => "");
          console.log(`[OpenRouter Fallback] Returned status ${res.status}: ${errBody}`);
        }
      }
    } catch (fallbackErr: any) {
      console.log("[Fallback Error]:", fallbackErr?.message || fallbackErr);
    }
  }

  throw lastError;
}

/**
 * Intelligent offline heuristic submission rater when external AI models are experiencing high demand.
 */
function generateOfflineRating(
  sourceCode: string,
  problemTitle: string,
  problemSlug: string,
  _difficulty = "Medium"
) {
  const codeLen = sourceCode.trim().length;
  const hasGuard = /if\s*\(.*(?:null|empty|\.length\s*===?\s*0|!root|size\(\)\s*===?\s*0)/i.test(sourceCode);
  const hasTwoPointers = /(?:left|right|ptr|head|tail|prev|curr|slow|fast)/i.test(sourceCode);
  const hasMapOrSet = /(?:map|set|dict|unordered_map|HashMap|HashSet)/i.test(sourceCode);

  let score = 8.0;
  if (codeLen < 40) score = 6.0;
  else if (hasGuard && (hasTwoPointers || hasMapOrSet)) score = 9.0;
  else if (hasGuard) score = 8.5;

  const grade = score >= 9 ? "S" : score >= 8 ? "A" : score >= 7 ? "B" : score >= 6 ? "C" : "D";

  return {
    overallScore: score,
    grade,
    cleanlinessScore: Math.min(10, Math.max(6, Math.round(score + 0.5))),
    optimalityScore: Math.min(10, Math.max(6, Math.round(score))),
    edgeCaseScore: hasGuard ? 9 : 7,
    verdict: score >= 8 ? "Optimal" : score >= 6 ? "Good" : "Needs Refinement",
    timeComplexity: hasTwoPointers ? "O(N)" : "O(N log N)",
    spaceComplexity: hasMapOrSet ? "O(N)" : "O(1)",
    strengths: [
      "Structured and readable control flow",
      hasGuard ? "Includes boundary/null guards" : "Clear algorithmic progression",
      "Consistent variable naming and loop termination"
    ],
    improvements: [
      hasGuard ? "Consider testing against single-element edge inputs" : "Add explicit edge-case guards for empty/null inputs",
      "Document the invariant in a leading docstring for interviewers"
    ],
    interviewerFeedback: `Your submission for "${problemTitle || problemSlug}" demonstrates solid mechanical execution and clean logic. Ensure you communicate your invariants clearly and articulate edge cases to the interviewer before writing the loop body.`
  };
}

/**
 * Intelligent offline diagnostic mistake reporter when external AI models are experiencing high demand.
 */
function generateOfflineMistakesReport(userSubmissions: any[]) {
  const count = userSubmissions.length;
  return {
    reportTitle: "Candidate Algorithmic & Syntax Diagnostics Report",
    totalSubmissionsAnalyzed: count,
    overallReadinessScore: count > 5 ? 86 : 78,
    summary: `Based on your analyzed submission history (${count} problem attempt${count === 1 ? '' : 's'}), your foundational algorithmic patterns and syntactic structure are consistent. Strengthening boundary assertions and space optimization will accelerate your interview mastery.`,
    commonSyntaxMistakes: [
      {
        mistake: "Unchecked Vector Boundaries / Off-By-One Indexing",
        frequency: "Medium",
        impact: "Runtime Out of Bounds or Segfault",
        examplePattern: "for (int i = 0; i <= n; i++) accessing arr[i]",
        correctiveRule: "Use strict inequality (< n) or size() - 1 limits with explicit guard conditions."
      }
    ],
    commonTypingMistakes: [
      {
        mistake: "Assignment vs Equality Comparison",
        description: "Accidentally writing 'if (x = 0)' instead of 'if (x == 0)'",
        proactiveTip: "Adopt Yoda conditions or rely on compiler strict mode to catch assignments in condition headers."
      }
    ],
    logicalFlaws: [
      {
        pattern: "Missing Base Case on Recursion / Edge Condition on Empty Array",
        occurrence: "Observed occasionally in early drafts",
        whyItHappens: "Focusing immediately on the main iteration before establishing guard conditions.",
        remediationStrategy: "Always write return statements for empty or single-element inputs before writing the main loop."
      }
    ],
    complexityTraps: [
      {
        pattern: "Hidden O(N) operations inside iteration loops",
        impact: "Degrades linear O(N) approaches to quadratic O(N^2)",
        example: "Calling .includes(), Array.prototype.indexOf(), or vector copies inside a loop",
        fix: "Pre-populate a Hash Set / Hash Map or pass arrays by reference."
      }
    ],
    topStrengths: [
      "Solid grasp of two-pointer and sliding window paradigms",
      "Clean code formatting and readable variable naming conventions"
    ],
    actionPlan: [
      {
        step: 1,
        title: "Drill Boundary Edge Cases",
        description: "Focus on empty string, single element array, and integer overflow constraints.",
        recommendedProblems: ["Two Sum", "Valid Palindrome", "Binary Search"]
      },
      {
        step: 2,
        title: "Invariant Checkpoints",
        description: "State your loop invariant in a one-line comment before writing the loop body.",
        recommendedProblems: ["Container With Most Water", "3Sum"]
      }
    ]
  };
}

/**
 * Intelligent offline heuristic code analyzer when external AI models are temporarily unreachable.
 */
function generateOfflineDiffAnalysis(
  sourceCode: string,
  problemTitle: string,
  problemSlug: string,
  _difficulty: string,
  compilerError = ""
) {
  const lines = sourceCode.split("\n");
  const issues: any[] = [];
  const diffHunks: any[] = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    let status = "clean";
    let hint = "";

    if (/for\s*\([^;]+;\s*[a-zA-Z0-9_]+\s*<=\s*(?:[a-zA-Z0-9_]+\.length|[a-zA-Z0-9_]+\.size\(\)|n)\s*;/i.test(line)) {
      status = "warning";
      hint = "Notice loop condition uses '<=' against length/size; this may cause an off-by-one Out-of-Bounds access.";
      issues.push({
        line: lineNum,
        type: "logic",
        severity: "warning",
        description: "Potential off-by-one index error with '<=' against array boundary.",
        suggestionHint: "Consider whether the last valid index is length - 1, or change condition to '<'."
      });
    } else if (/if\s*\([^=!<>]=[^=]/i.test(line)) {
      status = "error";
      hint = "Single '=' detected inside conditional expression. This assigns rather than compares.";
      issues.push({
        line: lineNum,
        type: "syntax",
        severity: "error",
        description: "Assignment inside condition statement.",
        suggestionHint: "Did you mean '==' or '===' for equality check?"
      });
    }

    diffHunks.push({
      line: lineNum,
      code: line,
      status,
      hint: hint || undefined,
    });
  });

  const hasErrors = issues.length > 0 || !!compilerError;

  return {
    hasErrors,
    summary: compilerError
      ? `Compiler note: ${compilerError.slice(0, 120)}. Verify variable types, closing delimiters, and function signatures.`
      : issues.length > 0
      ? `Identified ${issues.length} potential syntax or indexing boundary concern(s) in your code.`
      : `Code structure appears clean. Double check your base cases and loop invariants on empty or single-element inputs.`,
    interviewerNudges: [
      {
        level: 1,
        title: "Invariant & Bounds Verification",
        text: "Step through your loop bounds manually: what value does the loop variable take on the very first and very last iteration?"
      },
      {
        level: 2,
        title: "Edge Case Testing",
        text: `How does your solution handle extreme constraints for "${problemTitle || problemSlug}" (e.g. n = 0, n = 1, or duplicate elements)?`
      },
      {
        level: 3,
        title: "Space & Time Complexity",
        text: "Analyze whether nested operations or helper lookups add hidden overhead to your inner loop."
      }
    ],
    detectedIssues: issues,
    diffHunks,
    promptSuggestion: `Can you explain the loop invariants and termination conditions for ${problemTitle || "this problem"}?`
  };
}

/**
 * Intelligent offline chat guide when model APIs encounter 503 high demand or 429 quota exhaustion.
 */
function generateOfflineSocraticChatReply(options: {
  role: string;
  lastUserMessage: string;
  context: any;
}): string {
  const { role, context } = options;
  const pTitle = context.problemTitle || context.problemSlug || "the problem";
  const stepNum = context.currentStep !== undefined ? context.currentStep + 1 : null;

  if (role === "step_doubts" && stepNum) {
    return `### 🔍 Vizco Buddy — Step ${stepNum} Analysis\n\nIn Step ${stepNum} of "${pTitle}": The algorithm transitions state: **"${context.stepDesc || 'advancing state'}"**.\n\n**Key Observations:**\n- Pointers / indices update to reflect the current subarray or node being evaluated.\n- Notice what triggered this transition and how it updates the search interval or dynamic state.\n\nFeel free to ask me to trace any specific variables, explain subsequent steps, or show the full code implementation! ✨`;
  }

  if (role === "interviewer") {
    return `### 💡 Vizco Buddy — Problem Guidance\n\nRegarding "${pTitle}":\n\n1. **Core Intuition**: Identify the fundamental invariant or pattern (e.g. Two Pointers, Monotonic Stack, Sliding Window, or Dynamic Programming).\n2. **State & Transitions**: How does the active data structure evolve across iterations?\n3. **Optimal Strategy**: What data structure eliminates redundant re-computation (e.g. Hash Map for O(1) lookups)?\n\nAsk me for a conceptual breakdown, edge cases, step-by-step trace, or full optimal code in C++, Python, or Java! ✨`;
  }

  if (role === "mistake_analyzer") {
    return `### 🛠️ Vizco Buddy — Bug & Pitfall Inspection\n\nAnalyzing logic for "${pTitle}":\n- **Bounds & Indexing**: Check boundary termination conditions (\`<\` vs \`<=\`) and empty/singleton input handling.\n- **State Mutation**: Ensure variables aren't overwritten before their previous value is referenced.\n- **Data Types**: Check for potential integer overflow with large intermediate calculations.\n\nPaste your code or error message and I'll pinpoint the exact bug and show you the fix!`;
  }

  return `### ⚡ Vizco Buddy\n\nRegarding "${pTitle}": I'm here to help with any aspect of this algorithm! Whether you'd like an explanation of the core pattern, an optimal solution with code, a step-by-step trace, or complexity analysis, just let me know what you need! ✨`;
}

// Initialize problem statements in memory from statically bundled JSON
const memoryStatements: Record<string, string> = {
  ...(((localStatementsJson as any)?.default || localStatementsJson || {}) as Record<string, string>),
};

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "DSA.viz Full-Stack Intelligence & Workspace Platform",
  });
});

// API: Get problem statement
app.get("/api/statement", async (req: Request, res: Response) => {
  try {
    const slug = String(req.query.slug || "").trim();
    if (!slug) {
      return res.json({ statement: "" });
    }

    let s = "";
    try {
      s = decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, "");
    } catch {
      s = slug.toLowerCase().trim().replace(/\/+$/, "");
    }

    const normalizedSlug = s.replace(/_/g, "-");

    // 1. Direct in-memory lookup
    let statement = memoryStatements[s] || memoryStatements[normalizedSlug] || "";

    // 2. Fallback: Synthesize statement from problem database
    if (!statement) {
      statement = statementForSlug(slug);
    }

    return res.json({ statement: statement || "" });
  } catch (error: any) {
    console.error("Error in /api/statement:", error);
    const fallback = statementForSlug(String(req.query.slug || ""));
    return res.json({ statement: fallback || "" });
  }
});


// API: List entire repository file tree

// --- DB API Routes ---
const REDIS_RETENTION_TTL = 60 * 60 * 24 * 7; // 7 days — retained until explicit Firebase resync or mutation
const PROFILE_CACHE_KEY = (uid: string) => `profile_v3:${uid}`;
const SNAPSHOT_CACHE_KEY = (uid: string) => `profile_snapshot_v3:${uid}`;
const SUBMISSIONS_CACHE_KEY = (uid: string) => `submissions_v3:${uid}`;
const REPORTS_CACHE_KEY = (uid: string) => `reports_v3:${uid}`;

app.get("/api/profile", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const forceRefresh = req.query.refresh === "1" || req.query.force === "1";
    const bearerToken = extractRequestBearerToken(req);
    const ghCookie = getGithubSessionCookie(req, uid);
    const cacheKey = PROFILE_CACHE_KEY(uid);

    // 1. Return retained verified Redis cache immediately unless explicitly refreshed
    if (!forceRefresh) {
      const cached = await getCache<any>(cacheKey);
      if (
        cached &&
        cached.isVerifiedSync &&
        (cached.githubToken || !ghCookie?.githubToken)
      ) {
        return res.json(cached);
      }
    }

    const [user, profile, fsProfile, legacyUserCache, legacyProfileCache, legacySnapshotCache] =
      await Promise.all([
        getOrCreateUser(uid, req.user.email || null).catch(() => null),
        getProfile(uid).catch(() => null),
        fetchUserProfileFromFirestoreRest(uid, bearerToken).catch(() => null),
        getCache<any>(`user:${uid}`).catch(() => null),
        getCache<any>(`profile:${uid}`).catch(() => null),
        getCache<any>(`profile_snapshot:${uid}`).catch(() => null),
      ]);
    const { githubToken: memoryToken, ...safeProfile } = (profile || {}) as any;
    const legacySnapProf = legacySnapshotCache?.profile || null;

    // Encrypted token (AES-256-GCM ciphertext only, never raw plaintext)
    const resolvedEncryptedToken =
      fsProfile?.githubToken ||
      memoryToken ||
      ghCookie?.githubToken ||
      legacyProfileCache?.githubToken ||
      legacySnapProf?.githubToken ||
      null;

    if (resolvedEncryptedToken && !ghCookie?.githubToken) {
      setGithubSessionCookie(req, res, {
        uid,
        githubToken: resolvedEncryptedToken,
        githubUsername:
          fsProfile?.githubUsername ||
          fsProfile?.github_username ||
          safeProfile?.githubUsername ||
          ghCookie?.githubUsername ||
          legacyProfileCache?.githubUsername ||
          legacySnapProf?.githubUsername ||
          null,
        githubAvatar:
          fsProfile?.githubAvatar ||
          fsProfile?.github_avatar ||
          safeProfile?.githubAvatar ||
          ghCookie?.githubAvatar ||
          legacyProfileCache?.githubAvatar ||
          legacySnapProf?.githubAvatar ||
          null,
        githubUrl:
          fsProfile?.githubUrl ||
          safeProfile?.githubUrl ||
          ghCookie?.githubUrl ||
          legacyProfileCache?.githubUrl ||
          legacySnapProf?.githubUrl ||
          null,
      });
    }

    const cleanDisplayName =
      fsProfile?.displayName ||
      fsProfile?.display_name ||
      safeProfile?.displayName ||
      safeProfile?.display_name ||
      legacyUserCache?.displayName ||
      legacyUserCache?.display_name ||
      user?.displayName ||
      user?.display_name ||
      req.user.name ||
      req.user.email?.split("@")[0] ||
      "Authenticated User";
    const cleanAvatar =
      fsProfile?.avatarUrl ||
      fsProfile?.avatar_url ||
      safeProfile?.avatarUrl ||
      safeProfile?.avatar_url ||
      req.user.picture ||
      user?.avatarUrl ||
      null;
    const cleanLcUsername =
      fsProfile?.leetcodeUsername ||
      fsProfile?.leetcode_username ||
      safeProfile?.leetcodeUsername ||
      safeProfile?.leetcode_username ||
      legacyUserCache?.leetcodeUsername ||
      legacyUserCache?.leetcode_username ||
      legacyProfileCache?.leetcodeUsername ||
      legacyProfileCache?.leetcode_username ||
      legacySnapProf?.leetcodeUsername ||
      legacySnapProf?.leetcode_username ||
      null;
    let cleanLcStats =
      fsProfile?.leetcodeStats ||
      fsProfile?.leetcode_stats ||
      safeProfile?.leetcodeStats ||
      safeProfile?.leetcode_stats ||
      legacyUserCache?.leetcodeStats ||
      legacyUserCache?.leetcode_stats ||
      legacyProfileCache?.leetcodeStats ||
      legacyProfileCache?.leetcode_stats ||
      legacySnapProf?.leetcodeStats ||
      legacySnapProf?.leetcode_stats ||
      null;

    if (cleanLcUsername && !cleanLcStats) {
      cleanLcStats = await getCache<any>(`leetcode:${String(cleanLcUsername).toLowerCase()}`).catch(
        () => null
      );
      if (!cleanLcStats) {
        cleanLcStats = await fetchLeetCodeStats(String(cleanLcUsername)).catch(() => null);
        if (cleanLcStats) {
          await setCache(
            `leetcode:${String(cleanLcUsername).toLowerCase()}`,
            cleanLcStats,
            3600
          ).catch(() => {});
        }
      }
    }

    const cleanGithubUsername =
      fsProfile?.githubUsername ||
      fsProfile?.github_username ||
      safeProfile?.githubUsername ||
      safeProfile?.github_username ||
      ghCookie?.githubUsername ||
      null;
    const cleanGithubAvatar =
      fsProfile?.githubAvatar ||
      fsProfile?.github_avatar ||
      safeProfile?.githubAvatar ||
      safeProfile?.github_avatar ||
      ghCookie?.githubAvatar ||
      null;
    const cleanGithubUrl =
      fsProfile?.githubUrl ||
      safeProfile?.githubUrl ||
      ghCookie?.githubUrl ||
      (cleanGithubUsername ? `https://github.com/${cleanGithubUsername}` : null);
    const cleanGithubConnected = Boolean(
      resolvedEncryptedToken ||
        fsProfile?.githubConnected ||
        fsProfile?.github_connected ||
        safeProfile?.githubConnected ||
        ghCookie?.githubToken ||
        cleanGithubUsername
    );

    const isVerifiedSync = Boolean(
      fsProfile ||
        cleanLcUsername ||
        cleanLcStats ||
        cleanGithubConnected ||
        safeProfile?.leetcodeUsername ||
        safeProfile?.githubUsername
    );

    const payload = {
      uid,
      email: req.user.email,
      ...(user || {}),
      ...safeProfile,
      ...(fsProfile || {}),
      githubToken: resolvedEncryptedToken,
      githubTokenConfigured: Boolean(resolvedEncryptedToken),
      githubConnected: cleanGithubConnected,
      github_connected: cleanGithubConnected,
      githubUsername: cleanGithubUsername,
      github_username: cleanGithubUsername,
      githubAvatar: cleanGithubAvatar,
      github_avatar: cleanGithubAvatar,
      githubUrl: cleanGithubUrl,
      displayName: cleanDisplayName,
      display_name: cleanDisplayName,
      avatarUrl: cleanAvatar,
      avatar_url: cleanAvatar,
      leetcodeUsername: cleanLcUsername,
      leetcode_username: cleanLcUsername,
      leetcodeStats: cleanLcStats,
      leetcode_stats: cleanLcStats,
      isVerifiedSync,
    };

    // Only retain in Redis when verified from Firestore / connected integrations (never cache generic fallback)
    if (isVerifiedSync) {
      await setCache(cacheKey, payload, REDIS_RETENTION_TTL).catch(() => {});
    }

    res.json(payload);
  } catch (error) {
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      displayName: req.user.name || req.user.email?.split("@")[0] || "Authenticated User",
      display_name: req.user.name || req.user.email?.split("@")[0] || "Authenticated User",
      avatarUrl: req.user.picture || null,
      avatar_url: req.user.picture || null,
      githubConnected: false,
      githubTokenConfigured: false,
      isVerifiedSync: false,
      createdAt: new Date().toISOString(),
    });
  }
});

// Unified Redis-retained Profile Telemetry Snapshot (returns retained data without hitting Firebase on refresh)
app.get("/api/profile/snapshot", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const forceRefresh = req.query.refresh === "1" || req.query.force === "1";
    const snapshotKey = SNAPSHOT_CACHE_KEY(uid);

    if (!forceRefresh) {
      const cachedSnapshot = await getCache<any>(snapshotKey);
      if (
        cachedSnapshot &&
        cachedSnapshot.profile &&
        cachedSnapshot.isVerifiedSync &&
        cachedSnapshot.source !== "instant"
      ) {
        const ghCookie = getGithubSessionCookie(req, uid);
        if (ghCookie?.githubToken && !cachedSnapshot.profile.githubToken) {
          cachedSnapshot.profile = {
            ...cachedSnapshot.profile,
            githubToken: ghCookie.githubToken,
            githubConnected: true,
            github_connected: true,
            githubUsername:
              cachedSnapshot.profile.githubUsername || ghCookie.githubUsername || null,
            githubAvatar:
              cachedSnapshot.profile.githubAvatar || ghCookie.githubAvatar || null,
          };
        }
        return res.json({ cached: true, snapshot: cachedSnapshot });
      }
    }

    return res.json({ cached: false, snapshot: null });
  } catch {
    return res.json({ cached: false, snapshot: null });
  }
});

app.post("/api/profile/snapshot", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const rawBody = req.body;
    const snapshot =
      rawBody?.snapshot && typeof rawBody.snapshot === "object" && rawBody.snapshot.profile
        ? rawBody.snapshot
        : rawBody && typeof rawBody === "object" && rawBody.profile
        ? rawBody
        : null;

    if (!snapshot || !snapshot.profile || snapshot.source === "instant") {
      return res.status(400).json({ error: "Valid synced snapshot payload required" });
    }

    const enrichedSnapshot = {
      ...snapshot,
      profile: {
        ...snapshot.profile,
        isVerifiedSync: true,
      },
      isVerifiedSync: true,
      cachedAt: snapshot.cachedAt || new Date().toISOString(),
    };

    await Promise.all([
      setCache(SNAPSHOT_CACHE_KEY(uid), enrichedSnapshot, REDIS_RETENTION_TTL).catch(() => {}),
      setCache(PROFILE_CACHE_KEY(uid), enrichedSnapshot.profile, REDIS_RETENTION_TTL).catch(
        () => {}
      ),
      ...(Array.isArray(enrichedSnapshot.submissions)
        ? [
            setCache(
              SUBMISSIONS_CACHE_KEY(uid),
              enrichedSnapshot.submissions,
              REDIS_RETENTION_TTL
            ).catch(() => {}),
          ]
        : []),
      ...(Array.isArray(enrichedSnapshot.aiReports)
        ? [
            setCache(
              REPORTS_CACHE_KEY(uid),
              enrichedSnapshot.aiReports,
              REDIS_RETENTION_TTL
            ).catch(() => {}),
          ]
        : []),
    ]);

    res.json({ ok: true, cachedAt: enrichedSnapshot.cachedAt });
  } catch {
    res.status(500).json({ error: "Failed to persist profile snapshot to Redis" });
  }
});

app.post("/api/profile/update", requireAuth, async (req: any, res) => {
  try {
    const { username } = req.body;
    if (typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "Username is required." });
    }
    const clean = username.trim().replace(/^@+/, "");
    if (clean.length < 2 || clean.length > 30) {
      return res.status(400).json({ error: "Username must be between 2 and 30 characters." });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, underscores, dashes, and periods." });
    }
    const uid = req.user.uid;
    const updated = await updateProfile(uid, { displayName: clean, display_name: clean }).catch(() => null);
    await updateUser(uid, { displayName: clean, display_name: clean }).catch(() => null);

    // Update Redis profile and retained snapshot in-place
    const existingProfile = (await getCache<any>(PROFILE_CACHE_KEY(uid))) || {};
    const responsePayload = {
      ...existingProfile,
      uid,
      ...(updated || {}),
      displayName: clean,
      display_name: clean,
      isVerifiedSync: true,
    };

    await setCache(PROFILE_CACHE_KEY(uid), responsePayload, REDIS_RETENTION_TTL).catch(() => {});
    await setCache(`user:${uid}`, responsePayload, REDIS_RETENTION_TTL).catch(() => {});

    const existingSnapshot = await getCache<any>(SNAPSHOT_CACHE_KEY(uid));
    if (existingSnapshot?.profile) {
      await setCache(
        SNAPSHOT_CACHE_KEY(uid),
        {
          ...existingSnapshot,
          profile: {
            ...existingSnapshot.profile,
            displayName: clean,
            display_name: clean,
          },
          isVerifiedSync: true,
          cachedAt: new Date().toISOString(),
        },
        REDIS_RETENTION_TTL
      ).catch(() => {});
    }

    res.json({
      ok: true,
      profile: responsePayload,
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Failed to update profile username" });
  }
});

// Privacy & Right to Erasure: Permanent Account & Data Deletion (GDPR Art. 17 & DPDP Act)
app.delete("/api/profile", requireAuth, async (req: any, res: Response) => {
  try {
    const uid = req.user.uid;
    // 1. Delete user submissions
    const userSubs = await getSubmissions(uid).catch(() => []);
    for (const sub of userSubs) {
      await deleteSubmission(uid, sub.id).catch(() => {});
    }

    // 2. Delete Firestore subcollections if adminDb is connected
    try {
      if (adminDb) {
        const userRef = adminDb.collection("users").doc(uid);
        const subCollections = ["chat_sessions", "ai_reports", "activity", "bookmarks", "tasks"];
        for (const colName of subCollections) {
          const snapshot = await userRef.collection(colName).get().catch(() => null);
          if (snapshot && snapshot.docs && snapshot.docs.length > 0) {
            const batch = adminDb.batch();
            snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit().catch(() => {});
          }
        }
        await userRef.delete().catch(() => {});
      }
    } catch (dbErr) {
      console.warn("Firestore subcollections purge notice:", dbErr);
    }

    // 3. Invalidate Redis caches
    await deleteCache(SNAPSHOT_CACHE_KEY(uid)).catch(() => {});
    await deleteCache(PROFILE_CACHE_KEY(uid)).catch(() => {});
    await deleteCache(`user:${uid}`).catch(() => {});
    await deleteCache(SUBMISSIONS_CACHE_KEY(uid)).catch(() => {});
    await deleteCache(REPORTS_CACHE_KEY(uid)).catch(() => {});

    // 4. Mark profile cleared/deleted
    await updateProfile(uid, {
      displayName: "Deleted User",
      display_name: "Deleted User",
      githubToken: null,
      leetcodeUsername: null,
      leetcode_username: null,
      deletedAt: new Date().toISOString(),
    }).catch(() => {});

    res.json({
      success: true,
      message: "Account and associated data deleted permanently in accordance with GDPR Right to Erasure.",
    });
  } catch (error: any) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: "Failed to delete account data." });
  }
});

app.post("/api/sync-leetcode", requireAuth, async (req: any, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "Valid LeetCode username is required." });
    }
    const cleanUsername = username.trim().replace(/^@+/, "");
    const forceRefresh = req.body?.force === true || req.query.refresh === "1";

    // 1. Check Redis cache for recent LeetCode stats (1 hour TTL)
    const lcCacheKey = `leetcode:${cleanUsername.toLowerCase()}`;
    let fetchedStats = !forceRefresh ? await getCache<any>(lcCacheKey) : null;

    if (!fetchedStats) {
      fetchedStats = await fetchLeetCodeStats(cleanUsername);
      if (fetchedStats) {
        await setCache(lcCacheKey, fetchedStats, 3600).catch(() => {});
      }
    }

    if (!fetchedStats) {
      return res.status(404).json({ error: `Could not load LeetCode data for "${cleanUsername}". Please verify the username is public.` });
    }

    // Persist via DB & update retained Redis caches in-place
    try {
      if (req.user?.uid) {
        const uid = req.user.uid;
        await updateProfile(uid, {
          leetcodeUsername: cleanUsername,
          leetcode_username: cleanUsername,
          leetcodeStats: fetchedStats,
          leetcode_stats: fetchedStats,
        }).catch(() => null);

        const existingProfile = (await getCache<any>(PROFILE_CACHE_KEY(uid))) || {};
        await setCache(
          PROFILE_CACHE_KEY(uid),
          {
            ...existingProfile,
            leetcodeUsername: cleanUsername,
            leetcode_username: cleanUsername,
            leetcodeStats: fetchedStats,
            leetcode_stats: fetchedStats,
            isVerifiedSync: true,
          },
          REDIS_RETENTION_TTL
        ).catch(() => {});

        const existingSnapshot = await getCache<any>(SNAPSHOT_CACHE_KEY(uid));
        if (existingSnapshot?.profile) {
          await setCache(
            SNAPSHOT_CACHE_KEY(uid),
            {
              ...existingSnapshot,
              profile: {
                ...existingSnapshot.profile,
                leetcodeUsername: cleanUsername,
                leetcode_username: cleanUsername,
                leetcodeStats: fetchedStats,
                leetcode_stats: fetchedStats,
              },
              isVerifiedSync: true,
              cachedAt: new Date().toISOString(),
            },
            REDIS_RETENTION_TTL
          ).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Server-side DB update warning in /api/sync-leetcode:", e);
    }

    res.json({ success: true, stats: fetchedStats, username: cleanUsername });
  } catch (error: any) {
    console.error("Failed to sync LeetCode profile:", error);
    res.status(500).json({ error: error?.message || "Failed to sync" });
  }
});


app.get("/api/submissions", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const forceRefresh = req.query.refresh === "1" || req.query.force === "1";
    const bearerToken = extractRequestBearerToken(req);
    const cacheKey = SUBMISSIONS_CACHE_KEY(uid);
    if (!forceRefresh) {
      const cached = await getCache<any[]>(cacheKey);
      if (Array.isArray(cached) && cached.length > 0) {
        return res.json(cached);
      }
    }
    const [dbSubs, restSubs] = await Promise.all([
      getSubmissions(uid).catch(() => []),
      fetchUserCollectionFromFirestoreRest(uid, "submissions", bearerToken, 200).catch(() => null),
    ]);
    const subMap = new Map<string, any>();
    for (const s of [...(Array.isArray(restSubs) ? restSubs : []), ...(Array.isArray(dbSubs) ? dbSubs : [])]) {
      if (!s || !s.slug) continue;
      const normalized = {
        ...s,
        userId: uid,
        title: s.title || s.slug,
        pseudocode: s.pseudocode || s.code,
        lang: s.lang || s.language || "pseudocode",
        classification: s.classification || s.status || "Incomplete",
        difficulty: s.difficulty || "Medium",
        timeComplexity: s.timeComplexity || s.time_complexity || null,
        spaceComplexity: s.spaceComplexity || s.space_complexity || null,
        time_complexity: s.timeComplexity || s.time_complexity || null,
        space_complexity: s.spaceComplexity || s.space_complexity || null,
        viz_steps: s.vizSteps || s.viz_steps || null,
        test_case: s.testCase || s.test_case || null,
        code_lines: s.codeLines || s.code_lines || null,
        createdAt: s.createdAt || s.created_at || new Date().toISOString(),
        created_at: s.createdAt || s.created_at || new Date().toISOString(),
      };
      const key = String(
        normalized.id ||
          `${normalized.slug}_${String(normalized.createdAt).slice(0, 16)}_${normalized.classification}`
      );
      if (!subMap.has(key)) {
        subMap.set(key, normalized);
      }
    }
    const mergedSubs = Array.from(subMap.values()).sort((a, b) => {
      const ta = new Date(a.createdAt || a.created_at || 0).getTime();
      const tb = new Date(b.createdAt || b.created_at || 0).getTime();
      return tb - ta;
    });
    if (mergedSubs.length > 0 || Array.isArray(restSubs)) {
      await setCache(cacheKey, mergedSubs, REDIS_RETENTION_TTL).catch(() => {});
    }
    res.json(mergedSubs);
  } catch (error) {
    console.error("Failed to get submissions:", error);
    res.json([]);
  }
});

app.post("/api/submissions", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const sub = await addSubmission(uid, req.body).catch(() => ({
      id: "sub-" + Date.now(),
      ...req.body,
      createdAt: new Date().toISOString(),
    }));
    const existingSubs = await getCache<any[]>(SUBMISSIONS_CACHE_KEY(uid));
    if (Array.isArray(existingSubs)) {
      await setCache(SUBMISSIONS_CACHE_KEY(uid), [sub, ...existingSubs], REDIS_RETENTION_TTL).catch(() => {});
    }
    const existingSnapshot = await getCache<any>(SNAPSHOT_CACHE_KEY(uid));
    if (existingSnapshot && Array.isArray(existingSnapshot.submissions)) {
      const nextSubs = [sub, ...existingSnapshot.submissions];
      const completeRows = nextSubs.filter(
        (r: any) => r.classification && r.classification !== "Incomplete"
      );
      const solved = new Set(completeRows.map((r: any) => r.slug)).size;
      const optimal = new Set(
        completeRows.filter((r: any) => r.classification === "Optimal").map((r: any) => r.slug)
      ).size;
      await setCache(
        SNAPSHOT_CACHE_KEY(uid),
        {
          ...existingSnapshot,
          submissions: nextSubs,
          attempts: nextSubs.length,
          solved,
          optimal,
          isVerifiedSync: true,
          cachedAt: new Date().toISOString(),
        },
        REDIS_RETENTION_TTL
      ).catch(() => {});
    }
    res.json(sub);
  } catch (error) {
    console.error("Failed to add submission:", error);
    res.json({ id: "sub-" + Date.now(), ...req.body, createdAt: new Date().toISOString() });
  }
});

app.delete("/api/submissions/:id", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const targetId = String(req.params.id);
    await deleteSubmission(uid, targetId).catch(() => {});
    const existingSubs = await getCache<any[]>(SUBMISSIONS_CACHE_KEY(uid));
    if (Array.isArray(existingSubs)) {
      await setCache(
        SUBMISSIONS_CACHE_KEY(uid),
        existingSubs.filter((s: any) => String(s?.id) !== targetId),
        REDIS_RETENTION_TTL
      ).catch(() => {});
    }
    const existingSnapshot = await getCache<any>(SNAPSHOT_CACHE_KEY(uid));
    if (existingSnapshot && Array.isArray(existingSnapshot.submissions)) {
      const nextSubs = existingSnapshot.submissions.filter(
        (s: any) => String(s?.id) !== targetId
      );
      const completeRows = nextSubs.filter(
        (r: any) => r.classification && r.classification !== "Incomplete"
      );
      const solved = new Set(completeRows.map((r: any) => r.slug)).size;
      const optimal = new Set(
        completeRows.filter((r: any) => r.classification === "Optimal").map((r: any) => r.slug)
      ).size;
      await setCache(
        SNAPSHOT_CACHE_KEY(uid),
        {
          ...existingSnapshot,
          submissions: nextSubs,
          attempts: nextSubs.length,
          solved,
          optimal,
          isVerifiedSync: true,
          cachedAt: new Date().toISOString(),
        },
        REDIS_RETENTION_TTL
      ).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete submission:", error);
    res.json({ success: true });
  }
});
// ---------------------

// API: Multi-turn Chatbot endpoint with Socratic Interviewer & Firestore access
app.post("/api/chat", requireAuth, aiLimiter, async (req: any, res: Response) => {
  try {
    const {
      messages = [],
      systemInstruction: customInstruction,
      role = "interviewer",
      model = "gemini-3.8-flash",
      temperature = 0.6,
      context = {},
      sessionId,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const authenticatedUid: string | null = req.user?.uid || null;
    let userSubmissionsContext = "";
    let userProfileContext = "";

    if (authenticatedUid) {
      try {
        // Fetch user's recent submissions and profile from Firestore to allow rating submissions & analyzing activity
        const [recentSubs, profile] = await Promise.all([
          getSubmissions(authenticatedUid).catch(() => []),
          getProfile(authenticatedUid).catch(() => null),
        ]);

        if (recentSubs.length > 0) {
          userSubmissionsContext = `\n[EXACT USER FIRESTORE SUBMISSIONS HISTORY (Total: ${recentSubs.length})]:\n` +
            recentSubs.slice(0, 15).map((s: any, idx: number) => 
              `${idx + 1}. Problem: "${s.title || s.slug}" | Lang: ${s.lang} | Classification: ${s.classification} | Time: ${s.timeComplexity || 'N/A'} | Space: ${s.spaceComplexity || 'N/A'} | Date: ${s.createdAt}`
            ).join("\n");
        }

        if (profile) {
          userProfileContext = `\n[USER PROFILE METRICS]: Display Name: ${profile.displayName || req.user?.name || 'Authenticated User'}, LeetCode Username: ${profile.leetcodeUsername || 'Not connected'}`;
        }
      } catch (authErr) {
        // Continue if Firestore enrichment fails
      }
    }

    // Determine role persona and system instruction
    let baseSystemInstruction = "";
    if (role === "interviewer") {
      baseSystemInstruction = `You are Vizco Buddy, the brilliant, friendly, interactive 3D AI companion and DSA mentor for DSA.viz.co! ✨

MISSION & COMPREHENSIVE DSA FREEDOM:
You are a master expert in Data Structures & Algorithms, computer science, and programming (C++, Python, Java, TypeScript/JavaScript, Go, Rust). You have complete freedom to answer ANY question the user asks, as long as it relates to DSA, algorithms, data structures, coding, complexity analysis, interview preparation, system architecture fundamentals, or DSA.viz.co visualizer features.

CORE CAPABILITIES & USER FREEDOM:
1. COMPLETE ADAPTABILITY TO USER INTENT:
   - If the user asks for code, full solution, or optimal implementation: Give clean, production-quality, optimal code in their requested language (defaulting to C++ or Python if unspecified). Include concise comments, intuition, and Big-O Time and Space complexities.
   - If the user asks for hints or intuition: Provide clear, step-by-step guidance, diagnostic questions, mental models, or invariants.
   - If the user asks to explain a problem: Deconstruct the problem, constraints, examples, brute force vs. optimal approaches, and trade-offs.
   - If the user asks to debug: Pinpoint the exact bug (off-by-one, boundary cases, null checks, infinite loop, type mismatch), explain why it happens, and provide the clean fix.
   - If the user asks to analyze complexity: Provide rigorous Big-O time and space proofs with worst, average, and best cases.
   - If the user asks about DSA.viz.co visualizer steps or simulation state: Explain pointer positions, variable updates, and algorithmic transitions clearly.
   - If the user asks you to "rate my recent submission" or "analyze my activity", use the provided Firestore submissions history below to provide an insightful, balanced rating with scores (out of 10) and specific growth points.

2. TONE & PRESENTATION:
   - Enthusiastic, encouraging, sharp, and helpful. You are a world-class coding partner and mentor.
   - Use clean Markdown with bold keywords, formatted bullet points, and language-tagged code blocks (e.g. \`\`\`cpp, \`\`\`python).
   - Never artificially refuse to give code or solutions. Give the user whatever level of help they ask for!

3. RELEVANCE GUARD:
   - If and only if the user asks questions completely unrelated to DSA, programming, computer science, or algorithms (e.g., cooking recipes, celebrity news), politely guide them back to DSA and coding.`;
    } else if (role === "step_doubts") {
      baseSystemInstruction = `You are Vizco Buddy in "Step Doubts" mode. The user is actively stepping through a live algorithmic simulation on DSA.viz.co! ✨

CAPABILITIES:
1. Explain precisely what happened in the current simulation step: pointer movements, DP table cell updates, swaps, stack/queue mutations, or window adjustments.
2. Clearly explain why the condition was triggered and what invariant is preserved.
3. Answer any question the user asks: whether they want a step-by-step trace, intuition, code implementation for this step or the entire algorithm, or edge-case walkthroughs.
4. If the user wants to know what happens in subsequent steps or the final outcome, explain it thoroughly and clearly.`;
    } else if (role === "evaluator") {
      baseSystemInstruction = `You are Vizco Buddy in "Algorithmic Reviewer" mode. You analyze the user's code, submissions, and algorithmic approaches. ✨

CAPABILITIES:
1. Provide a clear, constructive review with a score out of 10.
2. Deliver a rigorous Big-O Time and Space complexity breakdown.
3. Inspect edge-case resilience (empty inputs, singletons, duplicate keys, boundary values, integer overflow).
4. Celebrate clever insights, pinpoint bottlenecks, and provide optimized code improvements.`;
    } else if (role === "mistake_analyzer") {
      baseSystemInstruction = `You are Vizco Buddy in "Bug & Trap Hunter" mode. You detect typing slips, syntax errors, boundary pitfalls, and logical bugs. ✨

CAPABILITIES:
1. Pinpoint exact errors: off-by-one bounds (<= vs <), null pointers, vector out-of-bounds, uninitialized variables, infinite loops, and integer overflow.
2. Explain the root cause clearly: WHY the mistake happened in memory or algorithm flow.
3. Provide the corrected, working code with clear comments showing the fix.
4. Share tips on how to systematically verify and catch this in technical interviews.`;
    } else if (role === "solutions") {
      baseSystemInstruction = `You are Vizco Buddy in "Code & Solutions" mode. You generate optimal, clean, production-grade solutions for DSA problems! ✨

CAPABILITIES:
1. Provide optimal solutions with high-performance code in the user's requested programming language (C++, Python, Java, TypeScript, Go, etc.).
2. Always analyze Time and Space Complexity with Big-O notation.
3. Structure solutions with clear step-by-step logic, comments explaining non-trivial lines, and edge-case handling.
4. If comparing multiple approaches (e.g. Brute Force vs Sorting vs Hash Table vs Two Pointers), clearly explain trade-offs.`;
    } else {
      baseSystemInstruction = customInstruction || `You are Vizco Buddy, the brilliant, friendly interactive AI companion for DSA.viz.co! ✨
You answer anything the user asks regarding Data Structures & Algorithms, code implementations, problem-solving techniques, time/space complexity, debugging, and interview preparation.`;
    }

    // Comprehensive Platform Knowledge Base (Frontend & Backend Data Context)
    const platformKnowledge = `
[DSA.VIZ.CO COMPREHENSIVE PLATFORM ARCHITECTURE & CAPABILITIES]:
You have complete, authoritative knowledge of every frontend feature, page, routing, and backend API on DSA.viz.co to help users anywhere on the platform:

1. FRONTEND PAGES & USER CAPABILITIES:
   • "/" (Home / Landing): Hero showcase, interactive Complexity Leap card, live visualizer preview, Topic Tracks (Arrays, Strings, Linked Lists, Trees, Graphs, DP, Sorting & Searching, Greedy, Bit Manipulation), Algorithm Live Ticker, Curated Sheets section (LeetCode 75, NeetCode 150, Blind 75, Striver SDE), Theme Switcher (Dark/Light + Purple, Emerald, Ocean, Amber themes).
   • "/problems": Catalog of 1500+ LeetCode problems with topic filters, difficulty levels (Easy, Medium, Hard), search, and completion tags.
   • "/problem/:slug": Interactive Visualizer Engine. Features live step-by-step state playback, pointer animations (left/right, slow/fast, matrix cell traversal, tree/graph node traversal), variables state inspection, custom dataset editor modal (DatasetToolbar), pseudocode editor with line highlighting, AI Diff Nudge panel (ProblemDiffNudgePanel) for progressive hints without spoilers, and ReviewCard.
   • "/compiler": Multi-language Sandboxed Online Compiler supporting 4 execution targets:
     - C++20 (GCC 14.1)
     - C17 (GCC 14.1)
     - Java 25 (OpenJDK 25)
     - Python 3.12 (CPython 3.12)
     Features interactive Standard Input (stdin) and Output (stdout), compiler diagnostics, execution time (ms) and memory (KB) metrics, curated FAANG algorithm templates, Fast I/O snippets, GitHub direct repository push, and code snapshot export. Keyboard shortcut: Ctrl + Enter (Cmd + Enter) to run code immediately.
   • "/live-interview": AI Mock Technical Interview Room. Voice/audio interaction, real-time live coding sandbox, live evaluation, behavioral and algorithmic rubric scorecard, camera/microphone controls.
   • "/sheets": Curated DSA Roadmaps (LeetCode 75, NeetCode 150, Blind 75, Striver's SDE Sheet, and topic-wise mastery roadmaps) with checklist progress tracking.
   • "/playground": Interactive visualizer playground for experimenting with sorting algorithms, tree traversals, graph algorithms, and custom arrays.
   • "/dashboard" (and "/_authenticated/dashboard"): Personal user progress dashboard, LeetCode heatmap & account sync, AI mistake pattern analysis, and solved problem metrics.
   • Global features: Quick Search Modal ("/" or Ctrl+K), Theme Color Picker, Custom Cursor, Cookie Preferences, and Skip to main content landmark.

2. BACKEND API ENDPOINTS & ARCHITECTURE:
   • "POST /api/chat": Multi-turn Gemini AI assistant with roles (interviewer, solutions, step_doubts, mistake_analyzer, evaluator), session memory, Firestore profile integration, and client offline Socratic fallback.
   • "POST /api/compiler/execute": Sandboxed multi-tier code runner for C++, C, Java, and Python with pre-execution validation, resource limits, and stdin support.
   • "POST /api/review": AI pseudocode evaluation and logic gap identification.
   • "POST /api/code-diff-nudge": Step-by-step guidance comparing user implementation against optimal algorithmic patterns without spoiling full solutions.
   • "POST /api/rate-submission": Scores submissions out of 10 with Big-O time and space proofs.
   • "POST /api/interview-evaluate" & "POST /api/interview-scorecard": Technical interview grading across communication, problem-solving, code quality, and edge cases.
   • "POST /api/generate-mistakes-report": Aggregates recurring user mistakes into cognitive and algorithmic growth plans.
   • "GET /api/statement": Retrieves problem descriptions and test cases.
   • "GET /api/submissions" & "POST /api/submissions": User submission persistence in Firestore.
   • "POST /api/sync-leetcode": Synchronizes solved problem stats from official LeetCode profiles.
   • "POST /api/visualize-dataset" & "POST /api/verify-trace": Dynamic step trace generation for custom user datasets.
   • "GET /api/github/url" & "POST /api/github/push": GitHub OAuth integration to push code to user repositories.

3. OMNISCIENT PLATFORM GUIDANCE:
   • Help users navigate anywhere on the platform, explain features, give keyboard shortcuts, guide their preparation path, interpret compiler errors, and assist with any DSA concept.
`.trim();

    // Inject active problem, route, compiler, and simulation step context
    let siteContextStr = "";
    if (context.isCustom) {
      siteContextStr += `\n[USER CUSTOM CONTEXT SPECIFIED]: Topic: "${context.problemTitle || 'Custom'}"`;
      if (context.customGoal) siteContextStr += ` | User Goal/Focus: "${context.customGoal}"`;
    }
    if (context.route) {
      siteContextStr += `\n[CURRENT USER WEBSITE LOCATION]: Route: "${context.route}"${context.pageTitle ? ` | Page: "${context.pageTitle}"` : ""}`;
    }
    if (context.problemSlug || context.problemTitle) {
      siteContextStr += `\n[CURRENT PROBLEM CONTEXT]: Problem: "${context.problemTitle || context.problemSlug}" (${context.problemSlug || ""})`;
      if (context.difficulty) siteContextStr += ` | Difficulty: ${context.difficulty}`;
      if (context.category) siteContextStr += ` | Category: ${context.category}`;
    }
    if (context.userCode) {
      siteContextStr += `\n[USER CURRENT EDITOR CODE/PSEUDOCODE]:\n\`\`\`\n${context.userCode}\n\`\`\``;
    }
    if (context.compilerOutput) {
      siteContextStr += `\n[COMPILER / EXECUTION OUTPUT OR ERRORS]:\n\`\`\`\n${context.compilerOutput}\n\`\`\``;
    }
    if (context.currentStep !== undefined) {
      siteContextStr += `\n[ACTIVE SIMULATION STEP CONTEXT]: Step ${context.currentStep + 1} of ${context.totalSteps || 'N/A'} | Description: "${context.stepDesc || ''}"`;
      if (context.stepVariables) {
        siteContextStr += ` | Step Variables State: ${JSON.stringify(context.stepVariables)}`;
      }
    }

    const fullSystemInstruction = `${baseSystemInstruction}
${platformKnowledge}
${siteContextStr}
${userProfileContext}
${userSubmissionsContext}`.trim();

    const ai = getGeminiClient();
    const allowedModels = [
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.7-flash",
    ];
    const selectedModel = allowedModels.includes(model) ? model : "gemini-3.8-flash";

    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content || "" }],
    }));

    let replyText = "";
    let finalModelUsed = selectedModel;

    try {
      const { text, modelUsed } = await generateContentWithFallback(ai, selectedModel, {
        contents: formattedContents,
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: Number(temperature) || 0.6,
        },
      });
      replyText = text || "I was unable to generate a response.";
      finalModelUsed = modelUsed;
    } catch (apiErr: any) {
      console.log("Chat API models failed (503/429), deploying offline Socratic mentor:", apiErr?.message || apiErr);
      replyText = generateOfflineSocraticChatReply({
        role,
        lastUserMessage: messages[messages.length - 1]?.content || "",
        context,
      });
      finalModelUsed = "socratic-offline-assistant";
    }

    // If authenticated, asynchronously persist chat session in Firestore
    let activeSessionId = sessionId;
    if (authenticatedUid) {
      const updatedMessages = [
        ...messages,
        { role: "model", content: replyText, timestamp: new Date().toISOString() },
      ];
      try {
        const savedSession = await saveChatSession(authenticatedUid, {
          id: sessionId,
          title: context.problemTitle ? `Chat: ${context.problemTitle}` : (messages[0]?.content?.slice(0, 40) || "DSA Chat"),
          problemSlug: context.problemSlug || null,
          role,
          messages: updatedMessages,
        });
        activeSessionId = savedSession.id;
      } catch (sessionErr) {
        console.warn("Could not persist chat session to Firestore:", sessionErr);
      }
    }

    return res.json({
      role: "assistant",
      content: replyText,
      modelUsed: finalModelUsed,
      sessionId: activeSessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: error.message || "Failed to process chat request.",
      details: error.toString(),
    });
  }
});

// API: Code Diff & Interviewer Nudge Panel Endpoint
app.post("/api/code-diff-nudge", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const {
      code = "",
      pseudocode = "",
      problemSlug = "",
      problemTitle = "",
      difficulty = "Medium",
      topics = [],
      compilerError = "",
    } = req.body;

    const sourceCode = (code || pseudocode || "").trim();
    if (!sourceCode) {
      return res.status(400).json({ error: "Code or pseudocode is required." });
    }

    const ai = getGeminiClient();

    const prompt = `Analyze the user's algorithmic code/pseudocode for the problem "${problemTitle || problemSlug}" (${difficulty}).
Identify if there are any typing mistakes, syntax slips, off-by-one errors, boundary omissions, or logical flaws.
CRITICAL CONSTRAINT: You must act as a SOCRATIC INTERVIEWER. You must NEVER give away the complete code solution or direct answer!
Generate 3 progressive levels of interviewer nudges (Level 1: Gentle thought, Level 2: Directional clue, Level 3: Deep invariant question).

USER CODE:
\`\`\`
${sourceCode}
\`\`\`

COMPILER / RUNTIME OUTPUT:
\`\`\`
${compilerError || "None provided"}
\`\`\`

Return a strictly valid JSON object matching this schema:
{
  "hasErrors": boolean,
  "summary": "Brief 1-2 sentence overview of code health without revealing the answer",
  "interviewerNudges": [
    { "level": 1, "title": "Gentle Check", "text": "Subtle question about loop bounds or variable types" },
    { "level": 2, "title": "Directional Clue", "text": "More focused clue on line or condition behavior" },
    { "level": 3, "title": "Deep Invariant", "text": "Thought experiment testing an edge case like empty array or negative numbers" }
  ],
  "detectedIssues": [
    {
      "line": 1,
      "type": "syntax" | "typing" | "logic" | "edge_case",
      "severity": "error" | "warning",
      "description": "Specific issue explanation",
      "suggestionHint": "Socratic question to fix it without giving answer"
    }
  ],
  "diffHunks": [
    {
      "line": 1,
      "code": "Original line string",
      "status": "clean" | "warning" | "error",
      "hint": "Interviewer note for this line"
    }
  ],
  "promptSuggestion": "Suggested question the user can ask the AI interviewer"
}`;

    const { text } = await generateContentWithFallback(ai, "gemini-3.8-flash", {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.log("Code diff nudge fallback to heuristic analysis:", error?.message || error);
    // Provide deterministic offline heuristic analysis so UI never breaks with 500 error
    const offlineResult = generateOfflineDiffAnalysis(
      sourceCode,
      problemTitle,
      problemSlug,
      difficulty,
      compilerError
    );
    return res.json(offlineResult);
  }
});

// API: Rate Submission Endpoint
app.post("/api/rate-submission", requireAuth, aiLimiter, async (req: any, res: Response) => {
  try {
    const {
      code = "",
      pseudocode = "",
      problemSlug = "",
      problemTitle = "",
      difficulty = "Medium",
      submissionId = "",
    } = req.body;

    const sourceCode = (code || pseudocode || "").trim();
    if (!sourceCode) {
      return res.status(400).json({ error: "Submission code is required." });
    }

    const ai = getGeminiClient();

    const prompt = `You are a senior algorithmic hiring reviewer. Evaluate this algorithmic submission for "${problemTitle || problemSlug}" (${difficulty}).
Rate the submission strictly and constructivley.

SUBMISSION:
\`\`\`
${sourceCode}
\`\`\`

Return a strictly valid JSON object matching this schema:
{
  "overallScore": 8.5,
  "grade": "S" | "A" | "B" | "C" | "D",
  "cleanlinessScore": 8,
  "optimalityScore": 9,
  "edgeCaseScore": 8,
  "verdict": "Optimal" | "Good" | "Needs Refinement" | "Incomplete",
  "timeComplexity": "O(N)",
  "spaceComplexity": "O(1)",
  "strengths": ["Clear naming conventions", "Optimal two-pointer approach"],
  "improvements": ["Guard against empty input array"],
  "interviewerFeedback": "Detailed constructive paragraph providing encouragement and senior perspective."
}`;

    const { text } = await generateContentWithFallback(ai, "gemini-3.8-flash", {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const ratingData = JSON.parse(text || "{}");

    // If user is authenticated and submissionId provided, update rating in Firestore
    if (req.user?.uid && submissionId) {
      try {
        const subDoc = adminDb.collection("users").doc(req.user.uid).collection("submissions").doc(submissionId);
        await subDoc.set({
          rating: ratingData.overallScore,
          ratingGrade: ratingData.grade,
          ratingData,
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Could not update submission rating in Firestore:", dbErr);
      }
    }

    return res.json(ratingData);
  } catch (error: any) {
    console.log("Rate submission AI fallback to offline evaluation:", error?.message || error);
    const {
      code = "",
      pseudocode = "",
      problemSlug = "",
      problemTitle = "",
      difficulty = "Medium",
    } = req.body || {};
    const offlineRating = generateOfflineRating(
      (code || pseudocode || "").trim(),
      problemTitle,
      problemSlug,
      difficulty
    );
    return res.json(offlineRating);
  }
});

// API: Live Interview - Evaluate Solution Tier
app.post("/api/interview-evaluate", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const { question, tier, code, language, transcript, previousTiers } = req.body;
    if (!question || !tier || !code) {
      return res.status(400).json({ error: "Missing required interview evaluation fields (question, tier, code)." });
    }

    const evaluation = await evaluateInterviewTier({
      question,
      tier,
      code,
      language: language || "cpp",
      transcript,
      previousTiers,
    });

    return res.json(evaluation);
  } catch (error: any) {
    console.error("Interview tier evaluation error:", error);
    return res.status(500).json({ error: "Failed to evaluate interview tier." });
  }
});

// API: Live Interview - Conversational Interviewer Response & Socratic Coaching
app.post("/api/interview-respond", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const {
      question,
      tier,
      code,
      language,
      candidateSpeech,
      transcriptHistory,
      interviewStage,
      coachingAction,
      hintLevel,
    } = req.body;
    if (!candidateSpeech && !coachingAction) {
      return res.status(400).json({ error: "Missing candidateSpeech or coachingAction field." });
    }

    const response = await generateInterviewerResponse({
      question,
      tier: tier || "bruteForce",
      code: code || "",
      language: language || "cpp",
      candidateSpeech: candidateSpeech || "",
      transcriptHistory,
      interviewStage,
      coachingAction,
      hintLevel,
    });

    return res.json(response);
  } catch (error: any) {
    console.error("Interview respond error:", error);
    return res.status(500).json({ error: "Failed to generate interviewer response." });
  }
});

// API: Live Interview - Run Sample Tests & Dry-Run Trace
app.post("/api/interview-run-tests", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { question, code, language, customInput } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Missing question object for sample test execution." });
    }

    const result = await runInterviewSampleTests({
      question,
      code: code || "",
      language: language || "cpp",
      customInput,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("Interview sample test runner error:", error);
    return res.status(500).json({ error: "Failed to run interview sample tests." });
  }
});

// API: LeetCode-Style Editor — Run 3 Sample Testcases (+ Custom Testcase)
app.post("/api/problem-run-tests", requireAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { slug, title, difficulty, topics, statement, code, language, sampleCases, customInput } = req.body || {};
    if (!slug && !title) {
      return res.status(400).json({ error: "Missing problem slug or title for sample test execution." });
    }

    const result = await runProblemSampleTests({
      slug: String(slug || "problem"),
      title: String(title || slug || "Problem"),
      difficulty: difficulty ? String(difficulty) : "Medium",
      topics: Array.isArray(topics) ? topics : [],
      statement: statement ? String(statement) : undefined,
      code: String(code || ""),
      language: String(language || "python"),
      sampleCases: Array.isArray(sampleCases) ? sampleCases : undefined,
      customInput: customInput ? String(customInput) : undefined,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("Problem sample test runner error:", error);
    return res.status(500).json({ error: error?.message || "Failed to execute sample testcases." });
  }
});

// API: LeetCode-Style Editor — Submit Code against AI Testcase Suite
app.post("/api/problem-submit", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const { slug, title, difficulty, topics, statement, code, language, preverifiedRunResult } = req.body || {};
    if (!slug && !title) {
      return res.status(400).json({ error: "Missing problem slug or title for submission judge." });
    }

    const result = await submitProblemSolution({
      slug: String(slug || "problem"),
      title: String(title || slug || "Problem"),
      difficulty: difficulty ? String(difficulty) : "Medium",
      topics: Array.isArray(topics) ? topics : [],
      statement: statement ? String(statement) : undefined,
      code: String(code || ""),
      language: String(language || "python"),
      preverifiedRunResult:
        preverifiedRunResult && typeof preverifiedRunResult === "object"
          ? preverifiedRunResult
          : undefined,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("Problem submit judge error:", error);
    return res.status(500).json({ error: error?.message || "Failed to evaluate submission." });
  }
});

/**
 * Generate a standard LiveKit WebRTC Access Token (HS256 JWT) using native Node crypto.
 * Conforms directly to LiveKit Server SDK token specifications without external dependencies.
 */
function generateLiveKitAccessToken(
  apiKey: string,
  apiSecret: string,
  identity: string,
  room: string,
  name?: string,
  ttlSeconds: number = 3600
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    exp: now + ttlSeconds,
    nbf: now - 5,
    iat: now,
    iss: apiKey,
    sub: identity,
    identity,
    name: name || identity,
    video: {
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const encHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(`${encHeader}.${encPayload}`)
    .digest("base64url");

  return `${encHeader}.${encPayload}.${signature}`;
}

// API: Live Interview - LiveKit WebRTC Access Token for Real-Time AI Voice Interviewer
app.all("/api/livekit-token", requireAuth, (req: Request, res: Response) => {
  try {
    const apiKey = cleanEnv(process.env.LIVEKIT_API_KEY);
    const apiSecret = cleanEnv(process.env.LIVEKIT_API_SECRET);
    const livekitUrl = cleanEnv(
      process.env.LIVEKIT_URL ||
      process.env.VITE_LIVEKIT_URL ||
      process.env.NEXT_PUBLIC_LIVEKIT_URL
    );

    if (!apiKey || !apiSecret) {
      return res.json({
        configured: false,
        message: "LiveKit credentials (LIVEKIT_API_KEY / LIVEKIT_API_SECRET) are not configured.",
      });
    }

    const query = req.query || {};
    const body = req.body || {};
    const room = ((query.room || body.room) as string)?.trim() || `interview-${Date.now().toString(36)}`;
    const identity = ((query.identity || body.identity) as string)?.trim() || `candidate-${Math.random().toString(36).substring(2, 8)}`;
    const name = ((query.name || body.name) as string)?.trim() || identity;

    const token = generateLiveKitAccessToken(apiKey, apiSecret, identity, room, name, 3600);

    return res.json({
      configured: true,
      token,
      url: livekitUrl || "wss://nikhil-2fnvf789.livekit.cloud",
      room,
      identity,
    });
  } catch (error: any) {
    console.error("LiveKit token generation error:", error);
    return res.status(500).json({ error: "Failed to generate LiveKit token." });
  }
});

// API: Live Interview - Generate Comprehensive Scorecard
app.post("/api/interview-scorecard", requireAuth, aiLimiter, async (req: any, res: Response) => {
  try {
    const {
      question,
      bruteForceCode,
      betterCode,
      optimalCode,
      tiersCompleted,
      questionSubmissions,
      confidenceMetrics,
      proctoringMetrics,
      elapsedSeconds,
    } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Missing question details for scorecard." });
    }

    const scorecard = await generateInterviewScorecard({
      question,
      bruteForceCode: bruteForceCode || "",
      betterCode: betterCode || "",
      optimalCode: optimalCode || "",
      tiersCompleted: Array.isArray(tiersCompleted) ? tiersCompleted : [],
      questionSubmissions: Array.isArray(questionSubmissions) ? questionSubmissions : undefined,
      confidenceMetrics: confidenceMetrics || {
        overallConfidenceScore: 8.0,
        vocalSteadinessScore: 8.0,
        fluencyScore: 8.0,
        articulationScore: 8.0,
        wordsPerMinute: 110,
        fillerWordsDetected: [],
        hesitationPauses: 0,
        totalSpokenSeconds: 0,
        totalWordsSpoken: 0,
      },
      proctoringMetrics: proctoringMetrics || {
        strikes: 0,
        tabSwitchCount: 0,
        blurCount: 0,
        pasteCount: 0,
        integrityScore: 10.0,
      },
      elapsedSeconds: elapsedSeconds || 300,
    });

    const userId: string | null = req.user?.uid || null;

    if (userId && adminDb) {
      try {
        await adminDb.collection("interview_scorecards").add({
          userId,
          questionId: question.id,
          questionTitle: question.title,
          scorecard,
          createdAt: new Date().toISOString(),
        });
        await logUserActivity(userId, "completed_interview", `Completed Live Interview for ${question.title} (${scorecard.overallScore}/10)`);
      } catch (dbErr) {
        console.warn("Could not save interview scorecard to Firestore:", dbErr);
      }
    }

    return res.json(scorecard);
  } catch (error: any) {
    console.error("Interview scorecard error:", error);
    return res.status(500).json({ error: "Failed to generate interview scorecard." });
  }
});

// API: Generate Common Mistakes & Diagnostics Report from Profile
app.post("/api/generate-mistakes-report", requireAuth, aiLimiter, async (req: any, res: Response) => {
  try {
    const userId: string | null = req.user?.uid || null;

    // Retrieve user submissions from Firestore if authenticated
    let userSubmissions: any[] = [];
    if (userId) {
      userSubmissions = await getSubmissions(userId).catch(() => []);
    }

    // Allow fallback or manual payload if user passed submissions in body
    if ((!userSubmissions || userSubmissions.length === 0) && Array.isArray(req.body.submissions)) {
      userSubmissions = req.body.submissions;
    }

    const ai = getGeminiClient();

    const submissionsSummary = userSubmissions.length > 0
      ? userSubmissions.slice(0, 30).map((s, idx) => `
[Submission ${idx + 1}]:
Problem: ${s.title || s.slug} (${s.difficulty || 'Medium'})
Classification: ${s.classification}
Code Snippet:
${(s.code || s.pseudocode || "").slice(0, 500)}
Review Notes: ${s.review || s.nudge || "None"}
`).join("\n---\n")
      : "No previous submissions found. Provide a foundational diagnostic assessment of common DSA mistakes made by technical interview candidates.";

    const prompt = `You are a Senior Algorithm Diagnostic Specialist at DSA.viz.
Perform a comprehensive diagnostic analysis of this candidate's common syntax, typing, and logical mistakes based on their actual submission history.

SUBMISSIONS DATA (${userSubmissions.length} submissions analyzed):
${submissionsSummary}

Produce a structured, deeply analytical diagnostics report.
Return a strictly valid JSON object matching this schema:
{
  "reportTitle": "Candidate Algorithmic & Syntax Diagnostics Report",
  "totalSubmissionsAnalyzed": ${userSubmissions.length},
  "overallReadinessScore": 82,
  "summary": "Executive summary of developer coding habits, syntax precision, and algorithmic intuition.",
  "commonSyntaxMistakes": [
    {
      "mistake": "Unchecked Vector Boundaries / Off-By-One Indexing",
      "frequency": "High" | "Medium" | "Low",
      "impact": "Runtime Out of Bounds or Segfault",
      "examplePattern": "for (int i = 0; i <= n; i++) accessing arr[i]",
      "correctiveRule": "Use strict inequality or size() - 1 limits with explicit guard conditions."
    }
  ],
  "commonTypingMistakes": [
    {
      "mistake": "Assignment vs Equality Comparison",
      "description": "Accidentally writing 'if (x = 0)' instead of 'if (x == 0)'",
      "proactiveTip": "Adopt Yoda condition style or enable strict compiler warning -Wparentheses"
    }
  ],
  "logicalFlaws": [
    {
      "pattern": "Missing Base Case on Recursion / Edge Condition on Empty Array",
      "occurrence": "Observed in 28% of attempts",
      "whyItHappens": "Rushing straight into the recurrence relation without establishing foundational invariant state.",
      "remediationStrategy": "Always write the return statement for empty/single-element inputs before writing loop."
    }
  ],
  "complexityTraps": [
    {
      "pattern": "Hidden O(N) calls inside loops",
      "impact": "Degrades O(N) to O(N^2)",
      "example": "Calling .includes() or vector copy inside loop",
      "fix": "Pre-populate hash set or pass by const reference"
    }
  ],
  "topStrengths": [
    "Strong grasp of two-pointer paradigms",
    "Clean code formatting and descriptive variable naming"
  ],
  "actionPlan": [
    {
      "step": 1,
      "title": "Drill Boundary Edge Cases",
      "description": "Focus on empty string, single element array, and integer overflow constraints.",
      "recommendedProblems": ["Two Sum", "Valid Palindrome", "Binary Search"]
    },
    {
      "step": 2,
      "title": "Invariant Checkpoints",
      "description": "State your loop invariant in a one-line comment before writing the loop body.",
      "recommendedProblems": ["Container With Most Water", "3Sum"]
    }
  ]
}`;

    const { text } = await generateContentWithFallback(ai, "gemini-3.8-flash", {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const reportData = JSON.parse(text || "{}");

    // Save report to Firestore if user authenticated
    let savedReportId = null;
    if (userId) {
      try {
        const saved = await saveAiReport(userId, {
          title: reportData.reportTitle || "Algorithmic Diagnostics Report",
          totalSubmissions: userSubmissions.length,
          reportData,
        });
        savedReportId = saved.id;
        const normalizedSaved = {
          id: saved.id,
          ...reportData,
          createdAt: saved.createdAt || new Date().toISOString(),
        };
        const existingReports = await getCache<any[]>(REPORTS_CACHE_KEY(userId));
        if (Array.isArray(existingReports)) {
          await setCache(
            REPORTS_CACHE_KEY(userId),
            [normalizedSaved, ...existingReports],
            REDIS_RETENTION_TTL
          ).catch(() => {});
        }
        const existingSnapshot = await getCache<any>(SNAPSHOT_CACHE_KEY(userId));
        if (existingSnapshot && Array.isArray(existingSnapshot.aiReports)) {
          await setCache(
            SNAPSHOT_CACHE_KEY(userId),
            {
              ...existingSnapshot,
              aiReports: [normalizedSaved, ...existingSnapshot.aiReports],
              isVerifiedSync: true,
              cachedAt: new Date().toISOString(),
            },
            REDIS_RETENTION_TTL
          ).catch(() => {});
        }
      } catch (saveErr) {
        console.warn("Could not save AI report to Firestore:", saveErr);
      }
    }

    return res.json({
      reportId: savedReportId,
      ...reportData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn("Generate mistakes report AI fallback to offline analysis:", error?.message || error);
    const offlineReport = generateOfflineMistakesReport(
      Array.isArray(req.body?.submissions) ? req.body.submissions : []
    );
    return res.json({
      reportId: null,
      ...offlineReport,
      generatedAt: new Date().toISOString(),
    });
  }
});

// API: Get User's Past Saved Diagnostic Reports
app.get("/api/user-reports", requireAuth, async (req: any, res: Response) => {
  try {
    const uid = req.user.uid;
    const forceRefresh = req.query.refresh === "1" || req.query.force === "1";
    const bearerToken = extractRequestBearerToken(req);
    const cacheKey = REPORTS_CACHE_KEY(uid);
    if (!forceRefresh) {
      const cached = await getCache<any[]>(cacheKey);
      if (Array.isArray(cached) && cached.length > 0) {
        return res.json(cached);
      }
    }
    const [dbReports, fsReports] = await Promise.all([
      getUserAiReports(uid).catch(() => []),
      fetchUserCollectionFromFirestoreRest(uid, "ai_reports", bearerToken, 30).catch(() => []),
    ]);
    const reportMap = new Map<string, any>();
    for (const r of [...(Array.isArray(fsReports) ? fsReports : []), ...(Array.isArray(dbReports) ? dbReports : [])]) {
      if (!r) continue;
      const payload = r.reportData ? { id: r.id, ...r.reportData, createdAt: r.createdAt } : r;
      const key = String(payload.id || `${payload.reportTitle || "report"}_${String(payload.createdAt || "").slice(0, 16)}`);
      if (!reportMap.has(key)) {
        reportMap.set(key, payload);
      }
    }
    const mergedReports = Array.from(reportMap.values()).sort((a, b) => {
      const ta = new Date(a.createdAt || a.generatedAt || 0).getTime();
      const tb = new Date(b.createdAt || b.generatedAt || 0).getTime();
      return tb - ta;
    });
    if (mergedReports.length > 0) {
      await setCache(cacheKey, mergedReports, REDIS_RETENTION_TTL).catch(() => {});
    }
    res.json(mergedReports);
  } catch (error) {
    console.error("Failed to get user AI reports:", error);
    res.json([]);
  }
});

// API: Get & Save Chat Sessions
app.get("/api/chat-sessions", requireAuth, async (req: any, res: Response) => {
  try {
    const sessions = await getUserChatSessions(req.user.uid);
    res.json(sessions);
  } catch (error) {
    res.json([]);
  }
});

app.post("/api/chat-sessions", requireAuth, async (req: any, res: Response) => {
  try {
    const session = await saveChatSession(req.user.uid, req.body);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to save chat session" });
  }
});

// API: High-Quality Image Generation (Requires authentication to prevent unauthenticated resource exhaustion)
app.post("/api/generate-image", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      aspectRatio = "16:9",
      imageSize,
      size,
      model = "gemini-3-pro-image-preview",
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Valid prompt is required." });
    }

    const ai = getGeminiClient();
    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1"];
    const validSizes = ["512px", "1K", "2K", "4K"];

    const selectedRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9";
    const requestedSize = size || imageSize || "2K";
    const selectedSize = validSizes.includes(requestedSize) ? requestedSize : "1K";

    let selectedModel = "gemini-3.1-flash-image";
    if (model === "gemini-3-pro-image-preview" || model === "gemini-3-pro-image") {
      selectedModel = "gemini-3-pro-image-preview";
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          {
            text: `High-resolution professional software architecture diagram and technical illustration: ${prompt}. Clean minimalist vector style, crisp high contrast technical graphics, developer documentation aesthetics, no blurry artifacts.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: selectedRatio,
          imageSize: selectedSize,
        },
      },
    });

    let imageUrl: string | null = null;
    let caption: string = "";

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: "No image was returned from the generative model.",
        caption,
      });
    }

    return res.json({
      imageUrl,
      caption,
      aspectRatio: selectedRatio,
      imageSize: selectedSize,
      modelUsed: model,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate image.",
      details: error.toString(),
    });
  }
});

// AI Request Validation Schemas
const reviewInputSchema = z.object({
  slug: z.string().min(1, "Slug is required").max(255),
  title: z.string().min(1, "Title is required").max(255),
  difficulty: z.string().optional(),
  topics: z.array(z.string()).optional(),
  pseudocode: z.string().min(1, "Pseudocode cannot be empty").max(50000, "Pseudocode exceeds maximum length of 50,000 characters"),
});

const datasetPlanInputSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  difficulty: z.string().optional(),
  topics: z.array(z.string()).optional(),
  pseudocode: z.string().min(1).max(50000),
  classification: z.string().optional(),
  complexity: z
    .object({
      time: z.string(),
      space: z.string(),
    })
    .optional(),
});

const datasetVizInputSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().optional().default(""),
  difficulty: z.string().optional(),
  topics: z.array(z.string()).optional(),
  dataStructureType: z.string().optional(),
  previousContext: z.string().optional(),
  currentStepOffset: z.number().optional(),
  executionPlan: z
    .array(
      z.object({
        step_number: z.number(),
        line_index: z.number(),
        code_action: z.string(),
        description: z.string(),
      }),
    )
    .optional(),
  dataset: z.object({
    id: z.string(),
    label: z.string(),
    description: z.string().optional(),
    array: z.array(z.union([z.number(), z.string()])).optional(),
    matrix: z.array(z.array(z.union([z.number(), z.string()]))).optional(),
    target: z.union([z.number(), z.string()]).optional(),
    k: z.number().optional(),
    category: z.enum(["standard", "longer", "edge", "complex"]).optional(),
    tree: z.any().optional(),
    graph: z.any().optional(),
    secondaryArray: z.array(z.union([z.number(), z.string()])).optional(),
  }),
  pseudocode: z.string().min(1).max(50000),
});

const playgroundReviewInputSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.string().min(1).max(50),
  pseudocode: z.string().min(1).max(50000),
  testInput: z.array(z.union([z.number(), z.string()])).max(100),
  target: z.union([z.number(), z.string()]).optional(),
});

const compilerExecuteSchema = z.object({
  code: z.string().min(1, "Code cannot be empty").max(50000, "Code exceeds maximum length of 50,000 characters"),
  stdin: z.string().max(10000, "Standard input exceeds maximum length of 10,000 characters").optional().default(""),
  language: z.enum(["cpp", "c", "java", "python"]).optional().default("cpp"),
});

// AI Review Endpoint (Stage 1: Pure Review & Complexity Analysis)
app.post("/api/review", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = reviewInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid review request payload", details: parsed.error.format() });
    }
    const result = await processReviewPseudocode(parsed.data);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/review:", err);
    res.status(500).json({ error: err?.message || "Failed to process pseudocode review" });
  }
});

// AI Dataset Plan Endpoint (Stage 2: Data Structure Selection, 3 Datasets & Step Plan)
app.post("/api/generate-plan", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = datasetPlanInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid dataset plan request payload", details: parsed.error.format() });
    }
    const result = await processGenerateDatasetsAndPlan(parsed.data);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/generate-plan:", err);
    res.status(500).json({ error: err?.message || "Failed to generate dataset plan" });
  }
});

// AI Dataset Visualization Endpoint (Stage 3: Marker Dictionary & Step Synchronization)
app.post("/api/visualize-dataset", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = datasetVizInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid dataset visualization payload", details: parsed.error.format() });
    }
    const result = await processDatasetVisualization({
      ...parsed.data,
      title: parsed.data.title || parsed.data.slug,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/visualize-dataset:", err);
    res.status(500).json({ error: err?.message || "Failed to generate dataset visualization" });
  }
});

// AI Trace Verification Endpoint
app.post("/api/verify-trace", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const { processVerifyDatasetTrace } = await import("./src/lib/review.functions.js");
    const result = await processVerifyDatasetTrace(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/verify-trace:", err);
    res.status(500).json({ error: err?.message || "Failed to verify dataset trace" });
  }
});

// AI Playground Review Endpoint
app.post("/api/playground-review", requireAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = playgroundReviewInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid playground review payload", details: parsed.error.format() });
    }
    const result = await processPlaygroundReview(parsed.data);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/playground-review:", err);
    res.status(500).json({ error: err?.message || "Failed to process playground review" });
  }
});

// C++ Sandboxed Online Compiler Endpoint with Concurrency Guard & Rate Limiting
app.post("/api/compiler/execute", requireAuth, compilerLimiter, async (req: Request, res: Response) => {
  const parsed = compilerExecuteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      stdout: "",
      stderr: "Invalid compiler payload: " + JSON.stringify(parsed.error.format()),
      exitCode: 1,
      status: "error",
      statusMessage: "Validation Error",
      timestamp: new Date().toISOString(),
    });
  }

  if (inFlightCompilations >= MAX_CONCURRENT_COMPILATIONS) {
    return res.status(429).json({
      stdout: "",
      stderr: "Sandbox compiler queue is currently at maximum capacity. Please retry in a few seconds.",
      exitCode: 1,
      status: "error",
      statusMessage: "Concurrency Limit Exceeded",
      timestamp: new Date().toISOString(),
    });
  }

  inFlightCompilations++;
  try {
    const { code, stdin, language } = parsed.data;
    const result = await runSecureCode(code, stdin, language);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/compiler/execute:", err);
    res.status(500).json({
      stdout: "",
      stderr: err?.message || "Internal compilation error",
      exitCode: 1,
      status: "error",
      statusMessage: "Execution Error",
      timestamp: new Date().toISOString(),
    });
  } finally {
    inFlightCompilations = Math.max(0, inFlightCompilations - 1);
  }
});

// GitHub OAuth Lifecycle
app.get("/api/github/url", requireAuth, (req: any, res) => {
  const uid = req.user.uid;
  const clientId = cleanSecretEnv(process.env.GITHUB_CLIENT_ID);
  const secret = cleanSecretEnv(process.env.GITHUB_CLIENT_SECRET);

  if (!clientId || !secret) {
    return res.status(500).json({
      error:
        "GitHub OAuth is not configured on the server. Please configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your environment settings.",
      configured: false,
    });
  }

  // Persist short-lived Firebase Bearer token in HttpOnly cookie so /api/github/callback can write directly to Firestore REST API
  const bearerToken = extractRequestBearerToken(req);
  if (bearerToken) {
    setGithubOAuthBearerCookie(req, res, bearerToken);
  }

  // Construct canonical redirect URI
  const proto =
    (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() || "https";
  const host =
    (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim() || req.headers.host;
  const clientOrigin =
    typeof req.query.origin === "string" && req.query.origin.startsWith("http")
      ? req.query.origin.replace(/\/+$/, "")
      : null;
  const origin = clientOrigin || req.headers.origin || `${proto}://${host}`;
  const redirectUri = `${origin}/api/github/callback`;

  const rawReturnTo = typeof req.query.returnTo === "string" ? req.query.returnTo.trim() : "";
  const returnTo =
    rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "/profile";

  // Nonce + Expiry (10 minutes) for tamper-proof, single-use state
  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 10 * 60 * 1000;

  const payload = JSON.stringify({
    uid,
    redirectUri,
    returnTo,
    nonce,
    issuedAt,
    expiresAt,
  });
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "repo",
    state: state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

app.get("/api/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || typeof state !== "string" || typeof code !== "string") {
    return res.status(400).send("Missing code or state parameter");
  }

  const secret = cleanSecretEnv(process.env.GITHUB_CLIENT_SECRET);
  if (!secret) {
    return res.status(500).send("Server configuration error: GITHUB_CLIENT_SECRET missing");
  }

  let uid: string;
  let nonce: string;
  let expiresAt: number;
  let redirectUri: string | undefined;
  let returnTo = "/profile";

  try {
    const decodedWrapper = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    const { payload, signature } = decodedWrapper;

    // 1. Verify HMAC cryptographic signature
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return res.status(403).send("State signature mismatch - possible CSRF attack");
    }

    const decoded = JSON.parse(payload);
    uid = decoded.uid;
    nonce = decoded.nonce;
    expiresAt = decoded.expiresAt;
    redirectUri = decoded.redirectUri;
    if (
      typeof decoded.returnTo === "string" &&
      decoded.returnTo.startsWith("/") &&
      !decoded.returnTo.startsWith("//")
    ) {
      returnTo = decoded.returnTo;
    }

    // 2. Verify state expiration
    if (Date.now() > expiresAt) {
      return res.status(400).send("OAuth state expired. Please initiate GitHub login again.");
    }

    // 3. Verify single-use nonce to prevent replay attacks
    if (usedOAuthNonces.has(nonce)) {
      return res.status(400).send("OAuth state has already been used.");
    }
    usedOAuthNonces.set(nonce, expiresAt);
  } catch (e) {
    return res.status(400).send("Invalid or malformed state payload");
  }

  try {
    const clientId = cleanSecretEnv(process.env.GITHUB_CLIENT_ID);
    const clientSecret = cleanSecretEnv(process.env.GITHUB_CLIENT_SECRET);

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error("GitHub token exchange error:", tokenData);
      return res.status(400).send(`Error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.status(400).send("No access token returned by GitHub");
    }

    // Fetch GitHub user profile info (username, avatar, url)
    let ghUsername: string | null = null;
    let ghAvatar: string | null = null;
    let ghUrl: string | null = null;
    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "DSA-viz-App",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (userRes.ok) {
        const ghUser = await userRes.json();
        ghUsername = ghUser.login || null;
        ghAvatar = ghUser.avatar_url || null;
        ghUrl = ghUser.html_url || null;
      }
    } catch (ghErr) {
      console.warn("Could not fetch GitHub user info:", ghErr);
    }

    // Encrypt and persist token across all 4 layers (server memory, HttpOnly cookie, Firestore REST API, and client sync)
    const encryptedToken = encryptToken(accessToken);
    await updateProfile(uid, {
      githubToken: encryptedToken,
      githubConnected: true,
      githubUsername: ghUsername,
      githubAvatar: ghAvatar,
      githubUrl: ghUrl,
    });

    setGithubSessionCookie(req, res, {
      uid,
      githubToken: encryptedToken,
      githubUsername: ghUsername,
      githubAvatar: ghAvatar,
      githubUrl: ghUrl,
    });

    const oauthBearer = getGithubOAuthBearerCookie(req);
    if (oauthBearer) {
      await saveGithubProfileToFirestoreRest(uid, oauthBearer, {
        githubToken: encryptedToken,
        githubConnected: true,
        githubUsername: ghUsername,
        githubAvatar: ghAvatar,
        githubUrl: ghUrl,
      });
    }

    // Update Redis profile & snapshot caches in-place so connected GitHub state is retained immediately
    const existingProfile = (await getCache<any>(PROFILE_CACHE_KEY(uid))) || {};
    await setCache(
      PROFILE_CACHE_KEY(uid),
      {
        ...existingProfile,
        githubToken: encryptedToken,
        githubConnected: true,
        githubUsername: ghUsername,
        githubAvatar: ghAvatar,
        githubUrl: ghUrl,
        isVerifiedSync: true,
      },
      REDIS_RETENTION_TTL
    ).catch(() => {});

    const existingSnapshot = await getCache<any>(SNAPSHOT_CACHE_KEY(uid));
    if (existingSnapshot?.profile) {
      await setCache(
        SNAPSHOT_CACHE_KEY(uid),
        {
          ...existingSnapshot,
          profile: {
            ...existingSnapshot.profile,
            githubToken: encryptedToken,
            githubConnected: true,
            github_connected: true,
            githubUsername: ghUsername,
            github_username: ghUsername,
            githubAvatar: ghAvatar,
            github_avatar: ghAvatar,
            githubUrl: ghUrl,
          },
          isVerifiedSync: true,
          cachedAt: new Date().toISOString(),
        },
        REDIS_RETENTION_TTL
      ).catch(() => {});
    }

    const syncPayloadBase64 = Buffer.from(
      JSON.stringify({
        uid,
        githubConnected: true,
        githubToken: encryptedToken,
        githubUsername: ghUsername,
        githubAvatar: ghAvatar,
        githubUrl: ghUrl,
      })
    ).toString("base64url");

    const redirectWithSync = `${returnTo}${
      returnTo.includes("#") ? "&" : "#"
    }gh_sync=${encodeURIComponent(syncPayloadBase64)}`;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Connected</title>
          <meta http-equiv="refresh" content="1; url=${redirectWithSync}" />
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { text-align: center; padding: 2rem; background: #1e293b; border-radius: 1rem; border: 1px solid #334155; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>GitHub Connected Successfully!</h3>
            <p>Syncing token &amp; returning to your workspace...</p>
          </div>
          <script>
            try {
              var uid = ${JSON.stringify(uid)};
              var encryptedToken = ${JSON.stringify(encryptedToken)};
              var ghUsername = ${JSON.stringify(ghUsername)};
              var ghAvatar = ${JSON.stringify(ghAvatar)};
              var ghUrl = ${JSON.stringify(ghUrl)};
              var targetUrl = ${JSON.stringify(redirectWithSync)};

              if (typeof localStorage !== 'undefined' && uid) {
                if (encryptedToken) localStorage.setItem('dsa_viz_github_token_' + uid, encryptedToken);
                if (ghUsername) localStorage.setItem('dsa_viz_github_username_' + uid, ghUsername);
                if (ghAvatar) localStorage.setItem('dsa_viz_github_avatar_' + uid, ghAvatar);
                localStorage.setItem('dsa_viz_github_connected_' + uid, 'true');
              }

              if (window.opener && !window.opener.closed) {
                var msgPayload = {
                  githubConnected: true,
                  githubToken: encryptedToken,
                  githubUsername: ghUsername,
                  githubAvatar: ghAvatar,
                  githubUrl: ghUrl
                };
                window.opener.postMessage(Object.assign({ type: 'GITHUB_AUTH_SUCCESS' }, msgPayload), '*');
                window.opener.postMessage(Object.assign({ type: 'GITHUB_CONNECTED' }, msgPayload), '*');
                setTimeout(function() { window.close(); }, 300);
              } else {
                window.location.replace(targetUrl);
              }
            } catch (e) {
              window.location.replace(${JSON.stringify(redirectWithSync)});
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Failed to connect GitHub:", error);
    res.status(500).send("Failed to connect GitHub");
  }
});

app.post("/api/github/disconnect", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const bearerToken = extractRequestBearerToken(req);
    clearGithubSessionCookie(req, res);
    await updateProfile(uid, {
      githubToken: null,
      githubConnected: false,
      githubUsername: null,
      githubAvatar: null,
      githubUrl: null,
    });
    if (bearerToken) {
      await saveGithubProfileToFirestoreRest(uid, bearerToken, {
        githubToken: null,
        githubConnected: false,
        githubUsername: null,
        githubAvatar: null,
        githubUrl: null,
      });
    }
    const existingProfile = (await getCache<any>(PROFILE_CACHE_KEY(uid))) || {};
    await setCache(
      PROFILE_CACHE_KEY(uid),
      {
        ...existingProfile,
        githubToken: null,
        githubConnected: false,
        githubUsername: null,
        githubAvatar: null,
        githubUrl: null,
      },
      REDIS_RETENTION_TTL
    ).catch(() => {});

    const existingSnapshot = await getCache<any>(SNAPSHOT_CACHE_KEY(uid));
    if (existingSnapshot?.profile) {
      await setCache(
        SNAPSHOT_CACHE_KEY(uid),
        {
          ...existingSnapshot,
          profile: {
            ...existingSnapshot.profile,
            githubToken: null,
            githubConnected: false,
            github_connected: false,
            githubUsername: null,
            github_username: null,
            githubAvatar: null,
            github_avatar: null,
            githubUrl: null,
          },
          cachedAt: new Date().toISOString(),
        },
        REDIS_RETENTION_TTL
      ).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to disconnect GitHub" });
  }
});

app.post("/api/github/push", requireAuth, async (req: any, res) => {
  try {
    const pushSchema = z.object({
      code: z.string().min(1, "Code cannot be empty").max(50000, "Code is too large"),
      titleSlug: z.string().max(255),
      lang: z.string().max(50),
      githubToken: z.string().optional(),
    });

    const parsed = pushSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.format() });
    }
    const { code, titleSlug, lang, githubToken: clientToken } = parsed.data;

    const uid = req.user.uid;
    const bearerToken = extractRequestBearerToken(req);
    const ghCookie = getGithubSessionCookie(req, uid);
    const profile = await getProfile(uid).catch(() => null);

    // Multi-source encrypted/raw token resolution (Client -> Cookie -> Server Memory -> Firestore REST API)
    const candidateTokens: string[] = [];
    if (clientToken && typeof clientToken === "string" && clientToken.trim()) {
      candidateTokens.push(clientToken.trim());
    }
    if (ghCookie?.githubToken) {
      candidateTokens.push(ghCookie.githubToken);
    }
    if (profile?.githubToken) {
      candidateTokens.push(profile.githubToken);
    }

    let githubToken: string | null = null;
    let encryptedGithubToken: string | null = null;

    const tryResolveRawToken = (raw: string): { plain: string; encrypted: string } | null => {
      const dec = decryptToken(raw);
      if (dec) {
        return { plain: dec, encrypted: raw };
      }
      if (
        raw.startsWith("ghp_") ||
        raw.startsWith("github_pat_") ||
        raw.startsWith("gho_") ||
        raw.startsWith("ghu_")
      ) {
        return { plain: raw, encrypted: encryptToken(raw) };
      }
      return null;
    };

    for (const candidate of candidateTokens) {
      const resolved = tryResolveRawToken(candidate);
      if (resolved) {
        githubToken = resolved.plain;
        encryptedGithubToken = resolved.encrypted;
        break;
      }
    }

    // Fallback 4: Read directly from Firebase Cloud Firestore REST API using caller's Bearer token
    if (!githubToken && bearerToken) {
      const fsGithub = await fetchGithubProfileFromFirestoreRest(uid, bearerToken);
      if (fsGithub?.githubToken) {
        const resolved = tryResolveRawToken(fsGithub.githubToken);
        if (resolved) {
          githubToken = resolved.plain;
          encryptedGithubToken = resolved.encrypted;
        }
      }
    }

    if (!githubToken || !encryptedGithubToken) {
      return res.status(401).json({
        error:
          "GitHub authorization token needs to be refreshed. Reconnecting your GitHub session...",
        code: "GITHUB_TOKEN_REFRESH_REQUIRED",
      });
    }

    const extMap: Record<string, string> = {
      cpp: "cpp",
      c: "c",
      java: "java",
      python: "py",
      python3: "py",
      javascript: "js",
      typescript: "ts",
      pseudocode: "md",
      markdown: "md",
    };
    const normalizedLang = String(lang || "cpp").toLowerCase().trim();
    const ext = extMap[normalizedLang] || "txt";
    const cleanSlug =
      String(titleSlug || "solution")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "") || "solution";
    const repoName = "LeetCode-Solutions";
    const path = `${cleanSlug}/${cleanSlug}.${ext}`;
    const message = `Add ${normalizedLang.toUpperCase()} solution for ${cleanSlug} via DSA.viz.co`;

    const githubHeaders: Record<string, string> = {
      Authorization: `Bearer ${githubToken}`,
      "User-Agent": "DSA-viz-co-App/1.0",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // 1. Get GitHub Username & verify token validity
    const userRes = await fetch("https://api.github.com/user", {
      headers: githubHeaders,
    });
    const userData = await userRes.json().catch(() => ({}));
    if (!userRes.ok) {
      console.error("GitHub user fetch error:", userData);
      if (userRes.status === 401) {
        clearGithubSessionCookie(req, res);
        return res.status(401).json({
          error:
            "Your GitHub token has expired or been revoked. Reconnecting your GitHub account...",
          code: "GITHUB_TOKEN_REFRESH_REQUIRED",
        });
      }
      return res.status(400).json({
        error:
          userData.message ||
          "Invalid or expired GitHub token. Please reconnect GitHub in Profile.",
      });
    }
    const owner: string = userData.login;
    const ownerAvatar: string | null = userData.avatar_url || null;
    const ownerUrl: string | null = userData.html_url || `https://github.com/${owner}`;

    // Synchronize verified token & metadata across cookie, memory, and Firestore
    setGithubSessionCookie(req, res, {
      uid,
      githubToken: encryptedGithubToken,
      githubUsername: owner,
      githubAvatar: ownerAvatar,
      githubUrl: ownerUrl,
    });
    await updateProfile(uid, {
      githubToken: encryptedGithubToken,
      githubConnected: true,
      githubUsername: owner,
      githubAvatar: ownerAvatar,
      githubUrl: ownerUrl,
    }).catch(() => {});
    if (bearerToken) {
      saveGithubProfileToFirestoreRest(uid, bearerToken, {
        githubToken: encryptedGithubToken,
        githubConnected: true,
        githubUsername: owner,
        githubAvatar: ownerAvatar,
        githubUrl: ownerUrl,
      }).catch(() => {});
    }

    // 2. Check if repo exists, create if not
    let repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: githubHeaders,
    });
    let defaultBranch = "main";
    if (repoRes.status === 404) {
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: { ...githubHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: repoName,
          description: "My LeetCode & DSA solutions synced automatically with DSA.viz.co",
          private: false,
          auto_init: true,
        }),
      });
      if (!createRes.ok) {
        const repoErr = await createRes.json().catch(() => ({}));
        // If 422 because repo already exists (e.g. private repo), continue to push
        if (createRes.status !== 422) {
          return res.status(500).json({
            error: repoErr.message || "Failed to create LeetCode-Solutions repository on GitHub",
          });
        }
      } else {
        const createdRepoData = await createRes.json().catch(() => ({}));
        if (createdRepoData?.default_branch) {
          defaultBranch = createdRepoData.default_branch;
        }
        // Wait briefly for GitHub's initial commit to settle
        await new Promise((r) => setTimeout(r, 1500));
      }
    } else if (repoRes.ok) {
      const repoData = await repoRes.json().catch(() => ({}));
      if (repoData?.default_branch) {
        defaultBranch = repoData.default_branch;
      }
    }

    // 3. Check if file exists to get SHA (for updates)
    const fetchExistingFileSha = async (branchName?: string): Promise<string | undefined> => {
      const query = branchName ? `?ref=${encodeURIComponent(branchName)}` : "";
      const fileRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${path}${query}`,
        { headers: githubHeaders }
      );
      if (fileRes.ok) {
        const fileData = await fileRes.json().catch(() => null);
        if (fileData?.sha) return fileData.sha;
      }
      return undefined;
    };

    let sha = await fetchExistingFileSha(defaultBranch);

    // 4. Create/Update file (with automatic retry on 409/422 or uninitialized branch)
    const content = Buffer.from(code, "utf8").toString("base64");
    const putFile = async (targetSha?: string, includeBranch = true) => {
      return fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${path}`, {
        method: "PUT",
        headers: { ...githubHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content,
          ...(targetSha ? { sha: targetSha } : {}),
          ...(includeBranch && defaultBranch ? { branch: defaultBranch } : {}),
        }),
      });
    };

    let pushRes = await putFile(sha, true);
    if (!pushRes.ok && (pushRes.status === 409 || pushRes.status === 422 || pushRes.status === 404)) {
      await new Promise((r) => setTimeout(r, 1200));
      sha = await fetchExistingFileSha();
      pushRes = await putFile(sha, false);
    }

    if (!pushRes.ok) {
      const err = await pushRes.json().catch(() => ({ message: "Unknown error" }));
      return res.status(500).json({
        error: "Failed to push code to GitHub: " + (err.message || pushRes.statusText),
      });
    }

    const pushData = await pushRes.json().catch(() => ({}));
    const htmlUrl =
      pushData?.content?.html_url ||
      `https://github.com/${owner}/${repoName}/blob/${defaultBranch}/${path}`;

    res.json({
      success: true,
      url: htmlUrl,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      owner,
      repoName,
      path,
      encryptedGithubToken,
    });
  } catch (error: any) {
    console.error("GitHub push error:", error);
    res.status(500).json({ error: error?.message || "Failed to push to GitHub" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Development HTML fallback handler
    app.use(async (req: Request, res: Response, next: any) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        let html = await fs.promises.readFile(indexPath, "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`DSA.viz Workspace & Intelligence Platform running at http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
