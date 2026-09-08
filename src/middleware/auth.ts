import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

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
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed authorization header' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token === 'undefined' || token === 'null') { 
    return res.status(401).json({ error: 'Unauthorized: Missing token' }); 
  }

  // Explicitly gated mock auth strictly for offline automated integration test suites or guest dev mode
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-mock-user-id']) {
    req.user = {
      uid: String(req.headers['x-test-mock-user-id']),
      email: String(req.headers['x-test-mock-email'] || 'test@example.com'),
    } as unknown as DecodedIdToken;
    return next();
  }

  // In non-production environments only, permit mock guest developer tokens for local development
  if (process.env.NODE_ENV !== 'production' && (token.startsWith('mock-guest-token') || token.startsWith('guest-token') || token === 'guest-developer')) {
    req.user = {
      uid: 'guest-developer',
      email: 'guest@dsaviz.local',
      name: 'Guest Developer',
    } as unknown as DecodedIdToken;
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error: any) {
    console.error('Authentication verification failed:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};
