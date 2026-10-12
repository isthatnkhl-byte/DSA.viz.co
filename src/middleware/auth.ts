import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin';
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
      cachedGoogleCerts = certs;
      cachedGoogleCertsExpiresAt = now + 60 * 60 * 1000; // 1 hour cache
      return certs;
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

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed Google OAuth authorization header' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token === 'undefined' || token === 'null' || token === 'local-dev-token') {
    return res.status(401).json({ error: 'Unauthorized: Valid Google OAuth token required' });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token claims' });
    }
    req.user = decodedToken;
    return next();
  } catch (error: any) {
    // When local Firebase Admin ADC credentials are not present on the machine,
    // cryptographically verify the Firebase RS256 Google ID token against Google's X.509 public keys
    try {
      const parts = token.split('.');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length >= 64) {
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

        if (header.alg !== 'RS256' || !header.kid || typeof header.kid !== 'string') {
          return res.status(401).json({ error: 'Unauthorized: Invalid token signature algorithm' });
        }

        const cleanEnv = (v?: string | null) => v?.trim().replace(/^["']|["']$/g, "").trim();
        const projectId =
          cleanEnv(process.env.VITE_FIREBASE_PROJECT_ID) ||
          cleanEnv(process.env.FIREBASE_PROJECT_ID) ||
          fallbackConfig.projectId;
        const expectedIssuer = `https://securetoken.google.com/${projectId}`;

        const now = Math.floor(Date.now() / 1000);
        const isNotExpired = typeof payload.exp === 'number' && payload.exp > now - 120;
        const isValidIssuedAt = typeof payload.iat === 'number' && payload.iat <= now + 120;
        const isMatchingAudience = payload.aud === projectId;
        const isMatchingIssuer = payload.iss === expectedIssuer;
        const uid = payload.sub || payload.user_id;
        const hasValidUid =
          typeof uid === 'string' &&
          uid.length >= 6 &&
          uid !== 'local-dev-user' &&
          uid !== 'explorer';

        if (
          isNotExpired &&
          isValidIssuedAt &&
          isMatchingAudience &&
          isMatchingIssuer &&
          hasValidUid
        ) {
          const certs = await getGooglePublicCerts();
          if (certs) {
            const certPem = certs[header.kid];
            if (!certPem || !verifyRs256Signature(`${parts[0]}.${parts[1]}`, parts[2], certPem)) {
              return res.status(401).json({ error: 'Unauthorized: Invalid token cryptographic signature' });
            }
          } else if (process.env.NODE_ENV === 'production' || process.env.ALLOW_OFFLINE_DEV_AUTH !== 'true') {
            return res.status(401).json({ error: 'Unauthorized: Unable to verify token signature' });
          }

          req.user = {
            uid,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            ...payload,
          } as unknown as DecodedIdToken;
          return next();
        }
      }
    } catch {
      // Fall through to 401
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid or expired Google OAuth token' });
  }
};


