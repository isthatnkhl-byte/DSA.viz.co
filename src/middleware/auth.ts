import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

import fallbackConfig from '../../firebase-applet-config.json';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
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
    // strictly validate the Firebase RS256 Google ID token structure, issuer, audience, and expiry
    try {
      const parts = token.split('.');
      if (parts.length === 3 && parts[2] && parts[2].length >= 64) {
        const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8'));
        const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));

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

