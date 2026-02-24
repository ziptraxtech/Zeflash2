import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../middleware/auth';
import { getOrCreateUser } from '../services/userService';
import { prisma } from '../lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const reports = await prisma.report.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ reports });
  } catch (err: any) {
    console.error('reports error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
