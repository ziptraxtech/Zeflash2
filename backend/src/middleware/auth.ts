
import { verifyToken } from '@clerk/backend';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  clerkUserId?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    req.clerkUserId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth middleware - extracts userId if token provided, otherwise allows request to continue unauthenticated
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log('[optionalAuth] 🔐 Checking auth header...');
  const authHeader = req.headers.authorization;
  
  console.log('[optionalAuth] Auth header status:', {
    present: !!authHeader,
    startsWithBearer: authHeader ? authHeader.startsWith('Bearer ') : false,
    headerStart: authHeader ? authHeader.substring(0, 30) : 'MISSING',
  });

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('[optionalAuth] 🔑 Token found, verifying...');

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      req.clerkUserId = payload.sub;
      console.log('[optionalAuth] ✅ Token verified, userId:', payload.sub.substring(0, 10) + '...');
    } catch (err) {
      // Token is invalid but we don't reject - just continue without user context
      console.log('[optionalAuth] ❌ Token verification failed (but allowing unauthenticated request):', (err as any).message);
      req.clerkUserId = undefined;
    }
  } else {
    console.log('[optionalAuth] ✅ No auth header - allowing unauthenticated request');
  }

  next();
}
