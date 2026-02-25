import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser } from '../services/userService';
import { prisma } from '../lib/prisma';

export const reportsRouter = Router();

reportsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId!);
    if (!user) return res.status(500).json({ error: 'Failed to resolve user' });

    const reports = await prisma.report.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
