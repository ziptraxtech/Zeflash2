import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../middleware/auth';
import { getOrCreateUser, getRemainingCredits } from '../services/userService';
import { prisma } from '../lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  try {
    const user = await getOrCreateUser(clerkUserId);
    if (!user) return res.status(500).json({ error: 'Failed to resolve user' });

    const remaining = await getRemainingCredits(user.id);

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.status(200).json({
      remaining,
      transactions,
    });
  } catch (err: any) {
    console.error('credits error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
