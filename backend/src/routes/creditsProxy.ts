import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const creditsProxyRouter = Router();

// Credits serverless function endpoint - to be configured in .env
const CREDITS_LAMBDA_URL = process.env.CREDITS_LAMBDA_URL || null;

creditsProxyRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!CREDITS_LAMBDA_URL) {
      return res.status(503).json({ error: 'Credits service unavailable' });
    }

    // Get the token from the original request
    const token = req.headers.authorization;

    // Forward request to serverless function
    const response = await fetch(CREDITS_LAMBDA_URL, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Credits service returned ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Credits proxy error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch credits' });
  }
});
