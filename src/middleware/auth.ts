import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { adminAuth, isAdminDbAvailable } from '../lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

import fallbackConfig from '../../firebase-applet-config.json';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedGoogleCerts: Record<string, string> | null = null;
let cachedGoogleCertsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string> | null> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCertsExpiresAt > now) {
    return cachedGoogleCerts;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(GOOGLE_CERTS_URL, { signal: controller.signal });
    if (!res.ok) return cachedGoogleCerts;
    const certs = (await res.json()) as Record<string, string>;
    if (certs && typeof certs === 'object' && Object.keys(certs).length > 0) {
      const validCerts: Record<string, string> = {};
      for (const [k, v] of Object.entries(certs)) {
        if (typeof v === 'string' && v.includes('-----BEGIN CERTIFICATE-----')) {
          validCerts[k] = v;
        }
      }
      if (Object.keys(validCerts).length === 0) {
        return cachedGoogleCerts;
      }
      let ttlMs = 60 * 60 * 1000;
      const cacheControl = typeof res.headers?.get === 'function' ? res.headers.get('cache-control') : null;
      if (cacheControl) {
        const match = cacheControl.match(/max-age=(\d+)/i);
        if (match && match[1]) {
          const parsedSec = Number.parseInt(match[1], 10);
          if (Number.isFinite(parsedSec) && parsedSec >= 60) {
            ttlMs = Math.min(parsedSec * 1000, 6 * 60 * 60 * 1000);
          }
        }
      }
      cachedGoogleCerts = validCerts;
      cachedGoogleCertsExpiresAt = now + ttlMs;
      return validCerts;
    }
    return cachedGoogleCerts;
  } catch {
    return cachedGoogleCerts;
  } finally {
    clearTimeout(timeout);
  }
}

function verifyRs256Signature(
  signingInput: string,
  signatureB64Url: string,
  certPem: string
): boolean {
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signingInput);
    verifier.end();
    const signatureBuf = Buffer.from(signatureB64Url, 'base64url');
    return verifier.verify(certPem, signatureBuf);
  } catch {
    return false;
  }
}

const MAX_VERIFIED_TOKEN_CACHE = 500;
const verifiedTokenCache = new Map<string, { decoded: DecodedIdToken; expiresAt: number }>();

function getCachedVerifiedToken(tokenHash: string): DecodedIdToken | null {
  const entry = verifiedTokenCache.get(tokenHash);
  if (!entry) return null;
  if (entry.expiresAt > Date.now()) {
    return entry.decoded;
  }
  verifiedTokenCache.delete(tokenHash);
  return null;
}

function setCachedVerifiedToken(tokenHash: string, decoded: DecodedIdToken): void {
  const now = Date.now();
  const expMs = typeof decoded.exp === 'number' ? decoded.exp * 1000 : now + 60_000;
  const expiresAt = Math.min(expMs, now + 60_000);
  if (expiresAt <= now) return;

  if (verifiedTokenCache.size >= MAX_VERIFIED_TOKEN_CACHE) {
    for (const [k, v] of verifiedTokenCache.entries()) {
      if (v.expiresAt <= now) verifiedTokenCache.delete(k);
    }
    if (verifiedTokenCache.size >= MAX_VERIFIED_TOKEN_CACHE) {
      const oldestKey = verifiedTokenCache.keys().next().value;
      if (oldestKey) verifiedTokenCache.delete(oldestKey);
    }
  }
  verifiedTokenCache.set(tokenHash, { decoded, expiresAt });
}

const MIN_JWT_LENGTH = 64;
const MAX_JWT_LENGTH = 8192;

export async function verifyFirebaseIdTokenCryptographically(
  token: string
): Promise<DecodedIdToken | null> {
  if (
    !token ||
    typeof token !== 'string' ||
    token.length < MIN_JWT_LENGTH ||
    token.length > MAX_JWT_LENGTH ||
    token === 'undefined' ||
    token === 'null' ||
    token === 'local-dev-token'
  ) {
    return null;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const cached = getCachedVerifiedToken(tokenHash);
  if (cached) {
    return cached;
  }

  if (isAdminDbAvailable()) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token, true);
      if (decodedToken && decodedToken.uid) {
        setCachedVerifiedToken(tokenHash, decodedToken);
        return decodedToken;
      }
    } catch {
      // Fall through to X.509 cryptographic verification
    }
  }

  try {
    const parts = token.split('.');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length >= 64) {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

      if (header.alg !== 'RS256' || !header.kid || typeof header.kid !== 'string') {
        return null;
      }

      const cleanEnv = (v?: string | null) => v?.trim().replace(/^["']|["']$/g, '').trim();
      const projectId =
        cleanEnv(process.env.VITE_FIREBASE_PROJECT_ID) ||
        cleanEnv(process.env.FIREBASE_PROJECT_ID) ||
        fallbackConfig.projectId;
      const expectedIssuer = `https://securetoken.google.com/${projectId}`;

      const now = Math.floor(Date.now() / 1000);
      const isNotExpired = typeof payload.exp === 'number' && payload.exp > now - 120;
      const isValidIssuedAt =
        typeof payload.iat === 'number' &&
        payload.iat <= now + 120 &&
        payload.exp - payload.iat <= 86400;
      const isValidAuthTime =
        payload.auth_time === undefined ||
        (typeof payload.auth_time === 'number' && payload.auth_time <= now + 120);
      const isMatchingAudience = payload.aud === projectId;
      const isMatchingIssuer = payload.iss === expectedIssuer;
      const uid = payload.sub || payload.user_id;
      const hasValidUid =
        typeof uid === 'string' &&
        uid.length >= 6 &&
        uid.length <= 128 &&
        uid !== 'local-dev-user' &&
        uid !== 'explorer';

      if (
        isNotExpired &&
        isValidIssuedAt &&
        isValidAuthTime &&
        isMatchingAudience &&
        isMatchingIssuer &&
        hasValidUid
      ) {
        const certs = await getGooglePublicCerts();
        if (certs) {
          const certPem = certs[header.kid];
          if (!certPem || !verifyRs256Signature(`${parts[0]}.${parts[1]}`, parts[2], certPem)) {
            return null;
          }
        } else if (
          process.env.NODE_ENV === 'production' ||
          process.env.ALLOW_OFFLINE_DEV_AUTH !== 'true'
        ) {
          return null;
        }

        const decoded = {
          uid,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          ...payload,
        } as unknown as DecodedIdToken;
        setCachedVerifiedToken(tokenHash, decoded);
        return decoded;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed Google OAuth authorization header' });
  }

  const token = authHeader.slice(7).trim();
  if (
    !token ||
    token.length < MIN_JWT_LENGTH ||
    token.length > MAX_JWT_LENGTH ||
    token === 'undefined' ||
    token === 'null' ||
    token === 'local-dev-token'
  ) {
    return res.status(401).json({ error: 'Unauthorized: Valid Google OAuth token required' });
  }

  if (req.user?.uid && (req as any)._verifiedBearerToken === token) {
    return next();
  }

  const decoded = await verifyFirebaseIdTokenCryptographically(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired Google OAuth token' });
  }

  req.user = decoded;
  (req as any)._verifiedBearerToken = token;
  return next();
};



