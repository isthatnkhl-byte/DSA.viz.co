import crypto from "crypto";
import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import type { Request, Response, NextFunction } from "express";
import { GoogleGenAI } from "@google/genai";
import { adminDb, isAdminDbAvailable, markAdminDbUnavailable } from "./firebase-admin";
import { verifyFirebaseIdTokenCryptographically } from "../middleware/auth";
import fallbackConfig from "../../firebase-applet-config.json";

export type SupportedKeyProvider = "gemini" | "openrouter" | "openai";

export interface EncryptedProviderRecord {
  ciphertext: string; // ivHex:encryptedHex:authTagHex (AES-256-GCM)
  maskedHint: string; // e.g. "AIza••••••••x2eQ" (irreversible display hint)
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
  sealedVault?: string | null;
  securityMode: "Persistent Account Vault (Firebase + Backend AES-256-GCM)";
}

const VAULT_COOKIE_NAME = "dsaviz_vault_sid";
const VAULT_BLOB_COOKIE_NAME = "dsaviz_vault_blob";
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", ".data")
  : path.join(process.cwd(), ".data");
const VAULT_FILE = path.join(DATA_DIR, "user_keys_vault.json");
const MAX_VAULT_RECORDS = 5000;
const memoryVaultStore = new Map<string, UserVaultRecord>();
const MAX_EMPTY_VAULT_CACHE = 2000;
const EMPTY_VAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const checkedEmptyVaultOwners = new Map<string, number>();
const requestKeyStorage = new AsyncLocalStorage<RequestUserKeys>();

function setMemoryVaultRecord(key: string, record: UserVaultRecord): void {
  checkedEmptyVaultOwners.delete(key);
  if (!memoryVaultStore.has(key) && memoryVaultStore.size >= MAX_VAULT_RECORDS) {
    const oldestKey = memoryVaultStore.keys().next().value;
    if (oldestKey) memoryVaultStore.delete(oldestKey);
  }
  memoryVaultStore.set(key, record);
}

function markOwnerVaultEmpty(ownerId: string): void {
  const now = Date.now();
  if (checkedEmptyVaultOwners.size >= MAX_EMPTY_VAULT_CACHE) {
    for (const [k, exp] of checkedEmptyVaultOwners.entries()) {
      if (exp <= now) checkedEmptyVaultOwners.delete(k);
    }
    if (checkedEmptyVaultOwners.size >= MAX_EMPTY_VAULT_CACHE) {
      const oldest = checkedEmptyVaultOwners.keys().next().value;
      if (oldest) checkedEmptyVaultOwners.delete(oldest);
    }
  }
  checkedEmptyVaultOwners.set(ownerId, now + EMPTY_VAULT_TTL_MS);
}

function isOwnerKnownEmpty(ownerId: string): boolean {
  const exp = checkedEmptyVaultOwners.get(ownerId);
  if (!exp) return false;
  if (exp > Date.now()) return true;
  checkedEmptyVaultOwners.delete(ownerId);
  return false;
}

// Load encrypted vault from disk on startup
try {
  if (fs.existsSync(VAULT_FILE)) {
    const raw = fs.readFileSync(VAULT_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === "object") {
          setMemoryVaultRecord(k, v as UserVaultRecord);
        }
      }
    }
  }
} catch {
  // Ignore missing or unreadable initial file
}

let persistVaultTimer: ReturnType<typeof setTimeout> | null = null;
let isPersistingVault = false;

function persistVaultToDisk() {
  if (persistVaultTimer) return;
  persistVaultTimer = setTimeout(async () => {
    persistVaultTimer = null;
    if (isPersistingVault) return;
    isPersistingVault = true;
    try {
      const dir = path.dirname(VAULT_FILE);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const serialized: Record<string, UserVaultRecord> = {};
      for (const [k, v] of memoryVaultStore.entries()) {
        serialized[k] = v;
      }
      await fs.promises.writeFile(VAULT_FILE, JSON.stringify(serialized, null, 2), {
        encoding: "utf-8",
        mode: 0o600,
      });
    } catch {
      // Non-blocking persistence fallback
    } finally {
      isPersistingVault = false;
    }
  }, 500);
  if (typeof persistVaultTimer.unref === "function") {
    persistVaultTimer.unref();
  }
}

const cleanEnv = (val?: string | null): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

function getFirebaseProjectId(): string {
  return (
    cleanEnv(process.env.VITE_FIREBASE_PROJECT_ID) ||
    cleanEnv(process.env.FIREBASE_PROJECT_ID) ||
    fallbackConfig.projectId
  );
}

function getFirebaseDatabaseId(): string {
  const dbId =
    cleanEnv(process.env.VITE_FIREBASE_DATABASE_ID) ||
    fallbackConfig.firestoreDatabaseId ||
    "(default)";
  return dbId;
}

let cachedVaultMasterKey: Buffer | null = null;
let cachedVaultSecretSource = "";
let cachedEphemeralProdKey: Buffer | null = null;
let cachedPrevVaultMasterKey: Buffer | null = null;
let cachedPrevVaultSecretSource = "";

/**
 * Derives a dedicated 256-bit master key for the User API Key Vault using scrypt
 * with domain separation so even database/file dumps cannot be decoded without server secrets.
 */
function getVaultMasterKey(): Buffer {
  const configuredSecret =
    cleanEnv(process.env.USER_KEYS_ENCRYPTION_KEY) ||
    cleanEnv(process.env.VAULT_MASTER_KEY) ||
    cleanEnv(process.env.ENCRYPTION_KEY) ||
    cleanEnv(process.env.GITHUB_CLIENT_SECRET) ||
    cleanEnv(process.env.LIVEKIT_API_SECRET);

  if (!configuredSecret) {
    if (process.env.NODE_ENV === "production") {
      if (!cachedEphemeralProdKey) {
        console.error(
          "🚨 [Vault Security Alert]: No VAULT_MASTER_KEY / ENCRYPTION_KEY configured in production. Generating per-process CSPRNG key."
        );
        cachedEphemeralProdKey = crypto.randomBytes(32);
      }
      return cachedEphemeralProdKey;
    }
    const devFallback = "dsaviz_vault_dev_only_master_secret_v1";
    if (cachedVaultMasterKey && cachedVaultSecretSource === devFallback) {
      return cachedVaultMasterKey;
    }
    cachedVaultSecretSource = devFallback;
    cachedVaultMasterKey = crypto.scryptSync(
      devFallback,
      "dsaviz_user_api_key_vault_salt_v1",
      32
    );
    return cachedVaultMasterKey;
  }

  if (cachedVaultMasterKey && cachedVaultSecretSource === configuredSecret) {
    return cachedVaultMasterKey;
  }
  cachedVaultSecretSource = configuredSecret;
  cachedVaultMasterKey = crypto.scryptSync(
    configuredSecret,
    "dsaviz_user_api_key_vault_salt_v1",
    32
  );
  return cachedVaultMasterKey;
}

/**
 * Optional previous master key for zero-downtime key rotation in production.
 */
function getPreviousVaultMasterKey(): Buffer | null {
  const prevSecret =
    cleanEnv(process.env.USER_KEYS_ENCRYPTION_KEY_PREVIOUS) ||
    cleanEnv(process.env.VAULT_MASTER_KEY_PREVIOUS) ||
    cleanEnv(process.env.ENCRYPTION_KEY_PREVIOUS);
  if (!prevSecret) return null;
  if (cachedPrevVaultMasterKey && cachedPrevVaultSecretSource === prevSecret) {
    return cachedPrevVaultMasterKey;
  }
  cachedPrevVaultSecretSource = prevSecret;
  cachedPrevVaultMasterKey = crypto.scryptSync(
    prevSecret,
    "dsaviz_user_api_key_vault_salt_v1",
    32
  );
  return cachedPrevVaultMasterKey;
}

/**
 * Encrypts a plaintext API key using AES-256-GCM with a unique 16-byte random IV
 * and binds the ownerId as Additional Authenticated Data (AAD) so ciphertext cannot
 * be transplanted across accounts.
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

function decryptWithKey(
  iv: Buffer,
  encryptedText: Buffer,
  authTag: Buffer,
  aad: Buffer,
  key: Buffer
): string | null {
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted API key strictly inside backend memory.
 * Verifies both the GCM AuthTag and the ownerId AAD binding, with fallback to
 * getPreviousVaultMasterKey() during key rotation.
 */
export function decryptUserApiKey(ciphertext: string, ownerId: string): string | null {
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0]!, "hex");
    const encryptedText = Buffer.from(parts[1]!, "hex");
    const authTag = Buffer.from(parts[2]!, "hex");
    const aad = Buffer.from(ownerId, "utf8");

    const primary = decryptWithKey(iv, encryptedText, authTag, aad, getVaultMasterKey());
    if (primary !== null) return primary;

    const prevKey = getPreviousVaultMasterKey();
    if (prevKey) {
      return decryptWithKey(iv, encryptedText, authTag, aad, prevKey);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Seals an entire UserVaultRecord into an opaque, tamper-proof AES-256-GCM envelope
 * bound to its ownerId via AAD. This envelope can be safely stored in Firebase Firestore
 * and HttpOnly cookies because only the backend possesses getVaultMasterKey().
 */
export function sealVaultRecord(record: UserVaultRecord): string {
  const payloadJson = JSON.stringify(record);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getVaultMasterKey(), iv);
  cipher.setAAD(Buffer.from(`vault_envelope:${record.ownerId}`, "utf8"));
  let encrypted = cipher.update(payloadJson, "utf8", "base64url");
  encrypted += cipher.final("base64url");
  const authTag = cipher.getAuthTag().toString("base64url");
  return `${iv.toString("base64url")}.${encrypted}.${authTag}`;
}

/**
 * Unseals and verifies an AES-256-GCM vault envelope for a specific expectedOwnerId.
 * Returns null if the signature/AuthTag is invalid or if the ownerId does not match.
 */
export function unsealVaultRecord(
  sealed: string | null | undefined,
  expectedOwnerId: string
): UserVaultRecord | null {
  if (!sealed || typeof sealed !== "string" || !expectedOwnerId) return null;
  try {
    const parts = sealed.trim().split(".");
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0]!, "base64url");
    const encrypted = Buffer.from(parts[1]!, "base64url");
    const authTag = Buffer.from(parts[2]!, "base64url");
    const aad = Buffer.from(`vault_envelope:${expectedOwnerId}`, "utf8");

    let json = decryptWithKey(iv, encrypted, authTag, aad, getVaultMasterKey());
    if (json === null) {
      const prevKey = getPreviousVaultMasterKey();
      if (prevKey) {
        json = decryptWithKey(iv, encrypted, authTag, aad, prevKey);
      }
    }
    if (json === null) return null;

    const parsed = JSON.parse(json) as UserVaultRecord;
    if (!parsed || parsed.ownerId !== expectedOwnerId || typeof parsed.providers !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Generates an irreversible masked hint (e.g. "AIza••••••••x2eQ") for UI status display.
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
  if (trimmed.includes("••") || /^\*+$/.test(trimmed)) return null;

  if (
    explicitProvider === "gemini" ||
    explicitProvider === "openrouter" ||
    explicitProvider === "openai"
  ) {
    if (trimmed.startsWith("sk-or-")) return "openrouter";
    if (trimmed.startsWith("AIza") || trimmed.startsWith("AQ.")) return "gemini";
    if (
      trimmed.startsWith("sk-proj-") ||
      (trimmed.startsWith("sk-") && !trimmed.startsWith("sk-or-"))
    ) {
      return "openai";
    }
    return explicitProvider;
  }

  if (trimmed.startsWith("AIza") || trimmed.startsWith("AQ.")) return "gemini";
  if (trimmed.startsWith("sk-or-")) return "openrouter";
  if (trimmed.startsWith("sk-proj-") || trimmed.startsWith("sk-")) return "openai";
  return "gemini";
}

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

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token || token === "undefined" || token === "null" || token === "local-dev-token") {
    return null;
  }
  return token;
}

/**
 * Extracts cryptographically verified Firebase UID from the Authorization Bearer header if present.
 */
export async function extractVerifiedUidFromRequest(req: Request): Promise<string | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  const anyReq = req as any;
  if (anyReq.user?.uid && anyReq._verifiedBearerToken === token) {
    return anyReq.user.uid;
  }

  const decoded = await verifyFirebaseIdTokenCryptographically(token);
  if (decoded?.uid) {
    anyReq.user = decoded;
    anyReq._verifiedBearerToken = token;
    return decoded.uid;
  }
  return null;
}

/**
 * Reads the user's AES-256-GCM sealed vault directly from Firebase Cloud Firestore
 * using the official Firestore v1 REST API authenticated with the user's Firebase ID Token.
 * Works on Vercel serverless functions without requiring a service account JSON file.
 */
async function fetchVaultFromFirestoreRest(
  uid: string,
  bearerToken: string | null
): Promise<UserVaultRecord | null> {
  if (!uid || !bearerToken) return null;
  const ownerId = `uid:${uid}`;
  const projectId = getFirebaseProjectId();
  const databaseId = getFirebaseDatabaseId();
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(
    databaseId
  )}/documents/users/${encodeURIComponent(uid)}/tasks/encrypted_key_vault`;

  try {
    const res = await fetch(docUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const sealed = data?.fields?.sealedVault?.stringValue;
    if (typeof sealed === "string" && sealed.length > 16) {
      const unsealed = unsealVaultRecord(sealed, ownerId);
      if (unsealed) {
        setMemoryVaultRecord(ownerId, unsealed);
        persistVaultToDisk();
        return unsealed;
      }
    }
  } catch {
    // Non-fatal network fallback
  }
  return null;
}

/**
 * Persists the user's AES-256-GCM sealed vault directly into Firebase Cloud Firestore
 * under `/users/{uid}/tasks/encrypted_key_vault` (protected by `isOwner(userId)` rules)
 * using the user's Firebase ID Token.
 */
async function saveVaultToFirestoreRest(
  uid: string,
  bearerToken: string | null,
  record: UserVaultRecord
): Promise<void> {
  if (!uid || !bearerToken) return;
  const sealed = sealVaultRecord(record);
  const projectId = getFirebaseProjectId();
  const databaseId = getFirebaseDatabaseId();
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(
    databaseId
  )}/documents/users/${encodeURIComponent(uid)}/tasks/encrypted_key_vault`;

  try {
    await fetch(docUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          ownerId: { stringValue: record.ownerId },
          sealedVault: { stringValue: sealed },
          updatedAt: { stringValue: record.updatedAt },
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Non-blocking Firestore REST write
  }
}

/**
 * Sets an HttpOnly, SameSite=Strict, signed vault session cookie on the response.
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
    `Max-Age=${60 * 60 * 24 * 90}`,
  ];
  if (isSecure) cookieParts.push("Secure");

  res.append("Set-Cookie", cookieParts.join("; "));
  return newSid;
}

/**
 * Writes the AES-256-GCM sealed account vault record into an HttpOnly cookie
 * so page refreshes and serverless function transitions on the same browser retain
 * 0ms access to the encrypted vault without waiting on external network calls.
 */
export function writeHttpOnlyVaultBlobCookie(
  req: Request,
  res: Response,
  record: UserVaultRecord
): void {
  try {
    const sealed = sealVaultRecord(record);
    const isSecure =
      process.env.NODE_ENV === "production" ||
      req.secure ||
      req.headers["x-forwarded-proto"] === "https";

    const cookieParts = [
      `${VAULT_BLOB_COOKIE_NAME}=${encodeURIComponent(sealed)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${60 * 60 * 24 * 90}`,
    ];
    if (isSecure) cookieParts.push("Secure");
    res.append("Set-Cookie", cookieParts.join("; "));
  } catch {
    // Ignore cookie serialization errors
  }
}

/**
 * Hydrates the in-memory vault from the request's HttpOnly encrypted blob cookie or
 * `X-Encrypted-Account-Vault` header (synced from Firebase Firestore by the client).
 */
function hydrateVaultFromRequestEnvelope(
  req: Request,
  uid: string | null,
  vaultSid: string | null
): void {
  const cookies = parseCookies(req.headers.cookie);
  const cookieBlob = cookies[VAULT_BLOB_COOKIE_NAME];
  const headerBlob =
    typeof req.headers["x-encrypted-account-vault"] === "string"
      ? req.headers["x-encrypted-account-vault"]
      : null;

  if (uid) {
    const uidOwner = `uid:${uid}`;
    const existing = memoryVaultStore.get(uidOwner);
    const fromHeader = unsealVaultRecord(headerBlob, uidOwner);
    if (fromHeader && (!existing || fromHeader.updatedAt >= existing.updatedAt)) {
      setMemoryVaultRecord(uidOwner, fromHeader);
      persistVaultToDisk();
      return;
    }
    const fromCookie = unsealVaultRecord(cookieBlob, uidOwner);
    if (fromCookie && (!existing || fromCookie.updatedAt >= existing.updatedAt)) {
      setMemoryVaultRecord(uidOwner, fromCookie);
      persistVaultToDisk();
      return;
    }
  }

  if (vaultSid) {
    const sidOwner = `sid:${vaultSid}`;
    const existing = memoryVaultStore.get(sidOwner);
    const fromHeader = unsealVaultRecord(headerBlob, sidOwner);
    if (fromHeader && (!existing || fromHeader.updatedAt >= existing.updatedAt)) {
      setMemoryVaultRecord(sidOwner, fromHeader);
      persistVaultToDisk();
      return;
    }
    const fromCookie = unsealVaultRecord(cookieBlob, sidOwner);
    if (fromCookie && (!existing || fromCookie.updatedAt >= existing.updatedAt)) {
      setMemoryVaultRecord(sidOwner, fromCookie);
      persistVaultToDisk();
    }
  }
}

async function getVaultRecord(
  ownerId: string,
  uid?: string | null,
  bearerToken?: string | null
): Promise<UserVaultRecord | null> {
  if (!ownerId) return null;
  const local = memoryVaultStore.get(ownerId);
  if (local && local.providers && Object.keys(local.providers).length > 0) {
    return local;
  }

  if (isOwnerKnownEmpty(ownerId)) {
    return local || null;
  }

  // 1. Try Firebase Firestore REST API with user's Google OAuth Bearer token (works on Vercel!)
  if (uid && ownerId === `uid:${uid}` && bearerToken) {
    const restRecord = await fetchVaultFromFirestoreRest(uid, bearerToken);
    if (restRecord) return restRecord;
  }

  // 2. Try Firebase Admin SDK ONLY if service account credentials are configured
  if (isAdminDbAvailable()) {
    try {
      const doc = await adminDb.collection("user_key_vault").doc(ownerId).get();
      if (doc && doc.exists) {
        const data = doc.data() as UserVaultRecord;
        setMemoryVaultRecord(ownerId, data);
        persistVaultToDisk();
        return data;
      }
    } catch {
      markAdminDbUnavailable();
    }
  }

  markOwnerVaultEmpty(ownerId);
  return local || null;
}

async function saveVaultRecord(
  record: UserVaultRecord,
  uid?: string | null,
  bearerToken?: string | null
): Promise<void> {
  setMemoryVaultRecord(record.ownerId, record);
  persistVaultToDisk();

  // 1. Persist to Firebase Firestore REST API under user's account
  if (uid && record.ownerId === `uid:${uid}` && bearerToken) {
    await saveVaultToFirestoreRest(uid, bearerToken, record);
  }

  // 2. Also persist via Firebase Admin SDK ONLY if service account credentials are configured
  if (isAdminDbAvailable()) {
    try {
      await adminDb.collection("user_key_vault").doc(record.ownerId).set(record, { merge: true });
    } catch {
      markAdminDbUnavailable();
    }
  }
}

/**
 * Resolves the decrypted keys for a given user UID and/or HttpOnly vault session ID.
 */
export async function resolveUserKeysForRequest(
  uid: string | null,
  vaultSid: string | null,
  bearerToken?: string | null
): Promise<RequestUserKeys> {
  const uidOwner = uid ? `uid:${uid}` : null;
  const sidOwner = vaultSid ? `sid:${vaultSid}` : null;

  const [uidRecord, sidRecord] = await Promise.all([
    uidOwner ? getVaultRecord(uidOwner, uid, bearerToken) : Promise.resolve(null),
    sidOwner ? getVaultRecord(sidOwner) : Promise.resolve(null),
  ]);

  let geminiKey = "";
  let openRouterKey = "";
  let openAIKey = "";

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
    const bearerToken = extractBearerToken(req);

    // Immediately hydrate from HttpOnly encrypted blob cookie or Firebase-synced header envelope
    hydrateVaultFromRequestEnvelope(req, uid, vaultSid);

    const resolved = await resolveUserKeysForRequest(uid, vaultSid, bearerToken);
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
 * Builds the public status summary for the frontend UI and returns the opaque `sealedVault`
 * envelope so the authenticated client can also keep it synced in Firebase Firestore.
 */
export async function getUserKeyVaultStatus(
  req: Request,
  overrideVaultSid?: string | null,
  res?: Response
): Promise<UserKeysStatusResponse> {
  const cookies = parseCookies(req.headers.cookie);
  const vaultSid = overrideVaultSid || verifySignedVaultSessionId(cookies[VAULT_COOKIE_NAME]);
  const uid = await extractVerifiedUidFromRequest(req);
  const bearerToken = extractBearerToken(req);

  hydrateVaultFromRequestEnvelope(req, uid, vaultSid);

  const uidOwner = uid ? `uid:${uid}` : null;
  const sidOwner = vaultSid ? `sid:${vaultSid}` : null;

  const [uidRecord, sidRecord] = await Promise.all([
    uidOwner ? getVaultRecord(uidOwner, uid, bearerToken) : Promise.resolve(null),
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

  const primaryRecord = uidRecord || sidRecord || null;
  if (res && primaryRecord) {
    writeHttpOnlyVaultBlobCookie(req, res, primaryRecord);
  }

  return {
    hasPersonalKey: activeProvider !== "none",
    activeProvider,
    providers,
    sealedVault: primaryRecord ? sealVaultRecord(primaryRecord) : null,
    securityMode: "Persistent Account Vault (Firebase + Backend AES-256-GCM)",
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
        timeout: 8000,
      },
    });
    const candidateModels = [
      "gemini-flash-lite-latest",
      "gemini-flash-latest",
      "gemini-2.5-flash",
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
        if (
          msg.includes("API_KEY_INVALID") ||
          msg.toLowerCase().includes("api key not valid") ||
          msg.includes("401") ||
          msg.includes("403")
        ) {
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
        signal: AbortSignal.timeout(8000),
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
        signal: AbortSignal.timeout(8000),
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
 * Stores a user's API key encrypted with AES-256-GCM in the backend vault, persists it
 * to Firebase Cloud Firestore for their Google Account UID, and writes an HttpOnly encrypted cookie.
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
  sealedVault?: string | null;
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
      error:
        "Could not recognize API key format. Supported keys: Gemini (AIza... or AQ....), OpenRouter (sk-or-...), or OpenAI (sk-...).",
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
  const bearerToken = extractBearerToken(req);

  hydrateVaultFromRequestEnvelope(req, uid, vaultSid);

  const nowIso = new Date().toISOString();
  const maskedHint = buildMaskedKeyHint(rawKey);

  const targetOwnerIds: string[] = [`sid:${vaultSid}`];
  if (uid) {
    targetOwnerIds.push(`uid:${uid}`);
  }

  let savedUidRecord: UserVaultRecord | null = null;
  let savedSidRecord: UserVaultRecord | null = null;

  for (const ownerId of targetOwnerIds) {
    const existing = (await getVaultRecord(ownerId, uid, bearerToken)) || {
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
    await saveVaultRecord(existing, uid, bearerToken);
    if (uid && ownerId === `uid:${uid}`) {
      savedUidRecord = existing;
    } else if (ownerId === `sid:${vaultSid}`) {
      savedSidRecord = existing;
    }
  }

  const recordForCookie = savedUidRecord || savedSidRecord;
  if (recordForCookie) {
    writeHttpOnlyVaultBlobCookie(req, res, recordForCookie);
  }

  const status = await getUserKeyVaultStatus(req, vaultSid, res);
  return {
    ok: true,
    provider: detectedProvider,
    maskedHint,
    verifiedModel,
    sealedVault: status.sealedVault ?? null,
    status,
  };
}

/**
 * Deletes a user's encrypted API key(s) from the backend vault and Firebase Firestore.
 */
export async function deleteUserApiKeyFromVault(
  req: Request,
  provider?: SupportedKeyProvider | "all",
  res?: Response
): Promise<UserKeysStatusResponse> {
  const cookies = parseCookies(req.headers.cookie);
  const vaultSid = verifySignedVaultSessionId(cookies[VAULT_COOKIE_NAME]);
  const uid = await extractVerifiedUidFromRequest(req);
  const bearerToken = extractBearerToken(req);

  hydrateVaultFromRequestEnvelope(req, uid, vaultSid);

  const targetOwnerIds: string[] = [];
  if (vaultSid) targetOwnerIds.push(`sid:${vaultSid}`);
  if (uid) targetOwnerIds.push(`uid:${uid}`);

  for (const ownerId of targetOwnerIds) {
    const rec = await getVaultRecord(ownerId, uid, bearerToken);
    if (!rec || !rec.providers) continue;
    if (!provider || provider === "all") {
      rec.providers = {};
    } else {
      delete rec.providers[provider];
    }
    rec.updatedAt = new Date().toISOString();
    await saveVaultRecord(rec, uid, bearerToken);
    if (res && uid && ownerId === `uid:${uid}`) {
      writeHttpOnlyVaultBlobCookie(req, res, rec);
    }
  }

  return getUserKeyVaultStatus(req, vaultSid, res);
}
