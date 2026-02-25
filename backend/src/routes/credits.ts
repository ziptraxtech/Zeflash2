import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser, getRemainingCredits } from '../services/userService';
import { prisma } from '../lib/prisma';

export const creditsRouter = Router();

creditsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId!);
    if (!user) return res.status(500).json({ error: 'Failed to resolve user' });

    const remaining = await getRemainingCredits(user.id);
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.json({ remaining, transactions });
  } catch (err: any) {
    console.error('credits error:', err);
    return res.status(500).json({ error: err.message });
  }
});
