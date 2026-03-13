import { verifyToken } from '@clerk/backend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Extracts and verifies the Clerk JWT from the Authorization header.
 * Returns the clerkUserId if valid, sends 401 otherwise.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<string | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return payload.sub; // clerkUserId
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}
