import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser } from '../services/userService';
import { razorpay, CREDIT_PACKS } from '../lib/razorpay';
import { prisma } from '../lib/prisma';

export const createOrderRouter = Router();

createOrderRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { credits, email } = req.body as { credits: number; email?: string };

  if (!credits || !CREDIT_PACKS[credits]) {
    return res.status(400).json({ error: 'Invalid credits. Choose 1, 3, or 7.', validPacks: CREDIT_PACKS });
  }

  try {
    const user = await getOrCreateUser(req.clerkUserId!, email);
    if (!user) return res.status(500).json({ error: 'Failed to resolve user' });

    const amountPaise = CREDIT_PACKS[credits];
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `zeflash_${Date.now()}`,
      notes: { clerkUserId: req.clerkUserId!, credits: String(credits) },
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        amount: amountPaise,
        credits,
        status: 'created',
      },
    });

    return res.json({ orderId: order.id, amount: amountPaise, currency: 'INR', credits, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err: any) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message });
  }
});
