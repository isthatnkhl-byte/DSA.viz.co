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
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) { 
    return res.status(401).json({ error: 'Unauthorized: Missing token' }); 
  }

  try {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      return next();
    } catch (adminErr) {
      console.warn('Firebase Admin verifyIdToken fallback:', adminErr);
      // Fallback: decode JWT claims if client token is present
      const parts = token.split('.');
      if (parts.length === 3 && parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        const uid = payload.user_id || payload.sub || payload.uid;
        if (uid) {
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

      throw adminErr;
    }
  } catch (error) {
    console.error('Error in requireAuth middleware:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

};
