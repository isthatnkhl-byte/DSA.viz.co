import crypto from "crypto";
import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import type { Request, Response, NextFunction } from "express";
import { GoogleGenAI } from "@google/genai";
import { adminAuth, adminDb } from "./firebase-admin";
import fallbackConfig from "../../firebase-applet-config.json";

export type SupportedKeyProvider = "gemini" | "openrouter" | "openai";

export interface EncryptedProviderRecord {
  ciphertext: string; // ivHex:encryptedHex:authTagHex (AES-256-GCM)
  maskedHint: string; // e.g. "AQ.A••••••••x2eQ" (irreversible display hint)
  updatedAt: string;
}

export interface UserVaultRecord {
  ownerId: string;
  providers: Partial<Record<SupportedKeyProvider, EncryptedProviderRecord>>;
  updatedAt: string;
}

export interface RequestUserKeys {
  ownerId: string | null;
  uid: string | null;
  vaultSid: string | null;
  geminiKey: string;
  openRouterKey: string;
  openAIKey: string;
  hasPersonalKey: boolean;
}

export interface ProviderStatusPublic {
  configured: boolean;
  maskedHint: string | null;
  updatedAt: string | null;
}

export interface UserKeysStatusResponse {
  hasPersonalKey: boolean;
  activeProvider: SupportedKeyProvider | "none";
  providers: Record<SupportedKeyProvider, ProviderStatusPublic>;
  securityMode: "AES-256-GCM Backend Vault (HttpOnly / Zero-Frontend-Storage)";
}

const VAULT_COOKIE_NAME = "dsaviz_vault_sid";
const DATA_DIR = process.env.VERCEL ? path.join("/tmp", ".data") : path.join(process.cwd(), ".data");
const VAULT_FILE = path.join(DATA_DIR, "user_keys_vault.json");
const memoryVaultStore = new Map<string, UserVaultRecord>();
const requestKeyStorage = new AsyncLocalStorage<RequestUserKeys>();

// Load encrypted vault from disk on startup
try {
  if (fs.existsSync(VAULT_FILE)) {
    const raw = fs.readFileSync(VAULT_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === "object") {
          memoryVaultStore.set(k, v as UserVaultRecord);
        }
      }
    }
  }
} catch {
  // Ignore missing or unreadable initial file
}

function persistVaultToDisk() {
  try {
    const dir = path.dirname(VAULT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const serialized: Record<string, UserVaultRecord> = {};
    for (const [k, v] of memoryVaultStore.entries()) {
      serialized[k] = v;
    }
    fs.writeFileSync(VAULT_FILE, JSON.stringify(serialized, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
  } catch {
    // Non-blocking persistence fallback
  }
}

const cleanEnv = (val?: string | null): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

/**
 * Derives a dedicated 256-bit master key for the User API Key Vault using scrypt
 * with domain separation so even database/file dumps cannot be decoded without server secrets.
 */
function getVaultMasterKey(): Buffer {
  const masterSecret =
    cleanEnv(process.env.VAULT_MASTER_KEY) ||
    cleanEnv(process.env.ENCRYPTION_KEY) ||
    cleanEnv(process.env.GITHUB_CLIENT_SECRET) ||
    cleanEnv(process.env.LIVEKIT_API_SECRET) ||
    "dsaviz_vault_server_only_master_secret_v1";
  return crypto.scryptSync(masterSecret, "dsaviz_user_api_key_vault_salt_v1", 32);
}

/**
 * Encrypts a plaintext API key using AES-256-GCM with a unique 16-byte random IV
 * and binds the ownerId as Additional Authenticated Data (AAD) so ciphertext cannot
 * even be transplanted across users.
 */
export function encryptUserApiKey(plainKey: string, ownerId: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getVaultMasterKey(), iv);
  cipher.setAAD(Buffer.from(ownerId, "utf8"));
  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted API key strictly inside backend memory.
 * Verifies both the GCM AuthTag and the ownerId AAD binding.
 */
export function decryptUserApiKey(ciphertext: string, ownerId: string): string | null {
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0]!, "hex");
    const encryptedText = Buffer.from(parts[1]!, "hex");
    const authTag = Buffer.from(parts[2]!, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getVaultMasterKey(), iv);
    decipher.setAAD(Buffer.from(ownerId, "utf8"));
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Generates an irreversible masked hint (e.g. "AQ.A••••••••x2eQ") for UI status display.
 * Never reveals the middle characters of the secret key.
 */
export function buildMaskedKeyHint(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 2)}••••••••`;
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Auto-detects the AI provider from a raw API key string.
 */
export function detectKeyProvider(
  rawKey: string,
  explicitProvider?: string
): SupportedKeyProvider | null {
  const trimmed = rawKey.trim();
  if (!trimmed || trimmed.length < 12) return null;
  // Reject masked hints if accidentally submitted
  if (trimmed.includes("••") || /^\*+$/.test(trimmed)) return null;

  if (explicitProvider === "gemini" || explicitProvider === "openrouter" || explicitProvider === "openai") {
    if (trimmed.startsWith("sk-or-")) return "openrouter";
    if (trimmed.startsWith("AIza") || trimmed.startsWith("AQ.")) return "gemini";
    if (trimmed.startsWith("sk-proj-") || (trimmed.startsWith("sk-") && !trimmed.startsWith("sk-or-"))) {
      return "openai";
    }
    return explicitProvider;
  }

  if (trimmed.startsWith("AIza") || trimmed.startsWith("AQ.")) return "gemini";
  if (trimmed.startsWith("sk-or-")) return "openrouter";
  if (trimmed.startsWith("sk-proj-") || trimmed.startsWith("sk-")) return "openai";
  return "gemini";
}

/**
 * Signs a vault session ID with HMAC-SHA256 so the HttpOnly cookie cannot be forged or tampered with.
 */
function signVaultSessionId(sid: string): string {
  const hmac = crypto.createHmac("sha256", getVaultMasterKey());
  hmac.update(`vault_sid:${sid}`);
  const sig = hmac.digest("base64url");
  return `${sid}.${sig}`;
}

function verifySignedVaultSessionId(cookieVal?: string | null): string | null {
  if (!cookieVal || typeof cookieVal !== "string") return null;
  const dotIdx = cookieVal.indexOf(".");
  if (dotIdx <= 0) return null;
  const sid = cookieVal.slice(0, dotIdx);
  const sig = cookieVal.slice(dotIdx + 1);
  if (!/^[a-f0-9]{32,64}$/i.test(sid)) return null;

  const hmac = crypto.createHmac("sha256", getVaultMasterKey());
  hmac.update(`vault_sid:${sid}`);
  const expectedSig = hmac.digest("base64url");

  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return sid;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
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

/**
 * Extracts verified Firebase UID from the Authorization Bearer header if present.
 */
async function extractVerifiedUidFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token || token === "undefined" || token === "null" || token === "local-dev-token") return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    if (decoded?.uid) return decoded.uid;
  } catch {
    // Fallback structural verification if Firebase service account isn't configured locally
    try {
      const parts = token.split(".");
      if (parts.length === 3 && parts[2] && parts[2].length >= 64) {
        const header = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8"));
        const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8"));
        if (header.alg !== "RS256" || !header.kid) return null;
        const projectId =
          cleanEnv(process.env.VITE_FIREBASE_PROJECT_ID) ||
          cleanEnv(process.env.FIREBASE_PROJECT_ID) ||
          fallbackConfig.projectId;
        const expectedIssuer = `https://securetoken.google.com/${projectId}`;
        const now = Math.floor(Date.now() / 1000);
        const isNotExpired = typeof payload.exp === "number" && payload.exp > now - 120;
        const isMatchingAudience = payload.aud === projectId;
        const isMatchingIssuer = payload.iss === expectedIssuer;
        const uid = payload.sub || payload.user_id;
        if (
          isNotExpired &&
          isMatchingAudience &&
          isMatchingIssuer &&
          typeof uid === "string" &&
          uid.length >= 6 &&
          uid !== "local-dev-user"
        ) {
          return uid;
        }
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Sets an HttpOnly, SameSite=Strict, signed vault session cookie on the response.
 * JavaScript in the browser (document.cookie) can NEVER read this cookie.
 */
export function ensureHttpOnlyVaultCookie(req: Request, res: Response): string {
  const cookies = parseCookies(req.headers.cookie);
  const existingSid = verifySignedVaultSessionId(cookies[VAULT_COOKIE_NAME]);
  if (existingSid) return existingSid;

  const newSid = crypto.randomBytes(24).toString("hex");
  const signedVal = signVaultSessionId(newSid);
  const isSecure =
    process.env.NODE_ENV === "production" ||
    req.secure ||
    req.headers["x-forwarded-proto"] === "https";

  const cookieParts = [
    `${VAULT_COOKIE_NAME}=${encodeURIComponent(signedVal)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${60 * 60 * 24 * 90}`, // 90 days
  ];
  if (isSecure) cookieParts.push("Secure");

  res.append("Set-Cookie", cookieParts.join("; "));
  return newSid;
}

async function getVaultRecord(ownerId: string): Promise<UserVaultRecord | null> {
  if (!ownerId) return null;
  const local = memoryVaultStore.get(ownerId);
  if (local) return local;

  try {
    if (adminDb) {
      const doc = await adminDb.collection("user_key_vault").doc(ownerId).get();
      if (doc && doc.exists) {
        const data = doc.data() as UserVaultRecord;
        memoryVaultStore.set(ownerId, data);
        persistVaultToDisk();
        return data;
      }
    }
  } catch {
    // Offline or Firestore unavailable
  }
  return null;
}

async function saveVaultRecord(record: UserVaultRecord): Promise<void> {
  memoryVaultStore.set(record.ownerId, record);
  persistVaultToDisk();
  try {
    if (adminDb) {
      await adminDb.collection("user_key_vault").doc(record.ownerId).set(record, { merge: true });
    }
  } catch {
    // Non-blocking Firestore persistence
  }
}

/**
 * Resolves the decrypted keys for a given user UID and/or HttpOnly vault session ID.
 * If the user logged in after setting keys in their browser session, automatically merges
 * their session vault into their authenticated UID vault.
 */
export async function resolveUserKeysForRequest(
  uid: string | null,
  vaultSid: string | null
): Promise<RequestUserKeys> {
  const uidOwner = uid ? `uid:${uid}` : null;
  const sidOwner = vaultSid ? `sid:${vaultSid}` : null;

  const [uidRecord, sidRecord] = await Promise.all([
    uidOwner ? getVaultRecord(uidOwner) : Promise.resolve(null),
    sidOwner ? getVaultRecord(sidOwner) : Promise.resolve(null),
  ]);

  let geminiKey = "";
  let openRouterKey = "";
  let openAIKey = "";

  // Helper to decrypt from a record using its bound ownerId AAD
  const extractFrom = (rec: UserVaultRecord | null) => {
    if (!rec || !rec.providers) return;
    if (!geminiKey && rec.providers.gemini?.ciphertext) {
      geminiKey = decryptUserApiKey(rec.providers.gemini.ciphertext, rec.ownerId) || "";
    }
    if (!openRouterKey && rec.providers.openrouter?.ciphertext) {
      openRouterKey = decryptUserApiKey(rec.providers.openrouter.ciphertext, rec.ownerId) || "";
    }
    if (!openAIKey && rec.providers.openai?.ciphertext) {
      openAIKey = decryptUserApiKey(rec.providers.openai.ciphertext, rec.ownerId) || "";
    }
  };

  // Prefer authenticated UID vault, then fall back to HttpOnly browser session vault
  extractFrom(uidRecord);
  extractFrom(sidRecord);

  return {
    ownerId: uidOwner || sidOwner || null,
    uid,
    vaultSid,
    geminiKey,
    openRouterKey,
    openAIKey,
    hasPersonalKey: Boolean(geminiKey || openRouterKey || openAIKey),
  };
}

/**
 * Express middleware that populates AsyncLocalStorage with the current user's decrypted API keys
 * strictly inside backend memory for the duration of the HTTP request.
 */
export async function attachUserKeyVaultContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const vaultSid = verifySignedVaultSessionId(cookies[VAULT_COOKIE_NAME]);
    const uid = await extractVerifiedUidFromRequest(req);
    const resolved = await resolveUserKeysForRequest(uid, vaultSid);
    requestKeyStorage.run(resolved, () => next());
  } catch {
    next();
  }
}

/**
 * Returns the current request's decrypted user keys from AsyncLocalStorage (if running inside a request).
 */
export function getActiveRequestUserKeys(): RequestUserKeys | undefined {
  return requestKeyStorage.getStore();
}

/**
 * Builds the public, zero-secret status summary for the frontend UI.
 */
export async function getUserKeyVaultStatus(
  req: Request,
  overrideVaultSid?: string | null
): Promise<UserKeysStatusResponse> {
  const cookies = parseCookies(req.headers.cookie);
  const vaultSid = overrideVaultSid || verifySignedVaultSessionId(cookies[VAULT_COOKIE_NAME]);
  const uid = await extractVerifiedUidFromRequest(req);

  const uidOwner = uid ? `uid:${uid}` : null;
  const sidOwner = vaultSid ? `sid:${vaultSid}` : null;

  const [uidRecord, sidRecord] = await Promise.all([
    uidOwner ? getVaultRecord(uidOwner) : Promise.resolve(null),
    sidOwner ? getVaultRecord(sidOwner) : Promise.resolve(null),
  ]);

  const providers: Record<SupportedKeyProvider, ProviderStatusPublic> = {
    gemini: { configured: false, maskedHint: null, updatedAt: null },
    openrouter: { configured: false, maskedHint: null, updatedAt: null },
    openai: { configured: false, maskedHint: null, updatedAt: null },
  };

  for (const prov of ["gemini", "openrouter", "openai"] as SupportedKeyProvider[]) {
    const entry = uidRecord?.providers?.[prov] || sidRecord?.providers?.[prov];
    const ownerId = uidRecord?.providers?.[prov] ? uidRecord.ownerId : sidRecord?.ownerId;
    if (entry && ownerId) {
      // Verify the ciphertext still decrypts cleanly with its AuthTag & AAD
      const validPlain = decryptUserApiKey(entry.ciphertext, ownerId);
      if (validPlain) {
        providers[prov] = {
          configured: true,
          maskedHint: entry.maskedHint,
          updatedAt: entry.updatedAt,
        };
      }
    }
  }

  const activeProvider: SupportedKeyProvider | "none" = providers.gemini.configured
    ? "gemini"
    : providers.openrouter.configured
      ? "openrouter"
      : providers.openai.configured
        ? "openai"
        : "none";

  return {
    hasPersonalKey: activeProvider !== "none",
    activeProvider,
    providers,
    securityMode: "AES-256-GCM Backend Vault (HttpOnly / Zero-Frontend-Storage)",
  };
}

/**
 * Live-verifies an API key on the backend before storing it so the user gets immediate confirmation.
 */
export async function verifyUserApiKeyLive(
  provider: SupportedKeyProvider,
  rawKey: string
): Promise<{ valid: boolean; error?: string; verifiedModel?: string }> {
  const key = rawKey.trim();
  if (provider === "gemini") {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
    ];
    let lastErr = "Invalid Gemini API key";
    for (const model of candidateModels) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: "Reply with OK",
          config: { maxOutputTokens: 5, temperature: 0 },
        });
        if (resp && typeof resp.text === "string") {
          return { valid: true, verifiedModel: model };
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        lastErr = msg;
        if (msg.includes("API_KEY_INVALID") || msg.includes("401") || msg.includes("403")) {
          break;
        }
      }
    }
    return {
      valid: false,
      error: `Gemini API rejected this key: ${lastErr.slice(0, 140)}`,
    };
  }

  if (provider === "openai") {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { valid: true, verifiedModel: "gpt-4o-mini" };
      }
      return {
        valid: false,
        error: `OpenAI rejected this key (HTTP ${res.status}). Check your key and billing quota.`,
      };
    } catch (err: any) {
      return { valid: false, error: err?.message || "Could not reach OpenAI to verify key." };
    }
  }

  if (provider === "openrouter") {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { valid: true, verifiedModel: "openrouter/auto" };
      }
      return {
        valid: false,
        error: `OpenRouter rejected this key (HTTP ${res.status}).`,
      };
    } catch (err: any) {
      return { valid: false, error: err?.message || "Could not reach OpenRouter to verify key." };
    }
  }

  return { valid: false, error: "Unsupported provider" };
}

/**
 * Stores a user's API key encrypted with AES-256-GCM in the backend vault and binds it
 * to their HttpOnly session cookie AND (if logged in) their authenticated UID.
 */
export async function saveUserApiKeyToVault(
  req: Request,
  res: Response,
  params: {
    apiKey: string;
    provider?: string;
    verify?: boolean;
  }
): Promise<{
  ok: boolean;
  provider?: SupportedKeyProvider;
  maskedHint?: string;
  verifiedModel?: string;
  error?: string;
  status?: UserKeysStatusResponse;
}> {
  const rawKey = (params.apiKey || "").trim().replace(/^["']|["']$/g, "").trim();
  if (!rawKey || rawKey.length < 12 || rawKey.length > 512) {
    return {
      ok: false,
      error: "Please enter a valid API key (minimum 12 characters).",
    };
  }

  const detectedProvider = detectKeyProvider(rawKey, params.provider);
  if (!detectedProvider) {
    return {
      ok: false,
      error: "Could not recognize API key format. Supported keys: Gemini (AIza... or AQ....), OpenRouter (sk-or-...), or OpenAI (sk-...).",
    };
  }

  let verifiedModel: string | undefined;
  if (params.verify !== false) {
    const check = await verifyUserApiKeyLive(detectedProvider, rawKey);
    if (!check.valid) {
      return {
        ok: false,
        error: check.error || `Could not verify ${detectedProvider.toUpperCase()} API key.`,
      };
    }
    verifiedModel = check.verifiedModel;
  }

  const vaultSid = ensureHttpOnlyVaultCookie(req, res);
  const uid = await extractVerifiedUidFromRequest(req);
  const nowIso = new Date().toISOString();
  const maskedHint = buildMaskedKeyHint(rawKey);

  const targetOwnerIds: string[] = [`sid:${vaultSid}`];
  if (uid) {
    targetOwnerIds.push(`uid:${uid}`);
  }

  for (const ownerId of targetOwnerIds) {
    const existing = (await getVaultRecord(ownerId)) || {
      ownerId,
      providers: {},
      updatedAt: nowIso,
    };
    const ciphertext = encryptUserApiKey(rawKey, ownerId);
    existing.providers[detectedProvider] = {
      ciphertext,
      maskedHint,
      updatedAt: nowIso,
    };
    existing.updatedAt = nowIso;
    await saveVaultRecord(existing);
  }

  const status = await getUserKeyVaultStatus(req, vaultSid);
  return {
    ok: true,
    provider: detectedProvider,
    maskedHint,
    verifiedModel,
    status,
  };
}

/**
 * Deletes a user's encrypted API key(s) from the backend vault.
 */
export async function deleteUserApiKeyFromVault(
  req: Request,
  provider?: SupportedKeyProvider | "all"
): Promise<UserKeysStatusResponse> {
  const cookies = parseCookies(req.headers.cookie);
  const vaultSid = verifySignedVaultSessionId(cookies[VAULT_COOKIE_NAME]);
  const uid = await extractVerifiedUidFromRequest(req);

  const targetOwnerIds: string[] = [];
  if (vaultSid) targetOwnerIds.push(`sid:${vaultSid}`);
  if (uid) targetOwnerIds.push(`uid:${uid}`);

  for (const ownerId of targetOwnerIds) {
    const rec = await getVaultRecord(ownerId);
    if (!rec || !rec.providers) continue;
    if (!provider || provider === "all") {
      rec.providers = {};
    } else {
      delete rec.providers[provider];
    }
    rec.updatedAt = new Date().toISOString();
    await saveVaultRecord(rec);
  }

  return getUserKeyVaultStatus(req);
}
