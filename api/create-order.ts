import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../middleware/auth';
import { getOrCreateUser } from '../services/userService';
import { razorpay, CREDIT_PACKS } from '../lib/razorpay';
import { prisma } from '../lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  const { credits, email } = req.body as { credits: number; email?: string };

  if (!credits || !CREDIT_PACKS[credits]) {
    return res.status(400).json({
      error: 'Invalid credits value. Choose 1, 3, or 7.',
      validPacks: CREDIT_PACKS,
    });
  }

  try {
    const user = await getOrCreateUser(clerkUserId, email);
    if (!user) return res.status(500).json({ error: 'Failed to resolve user' });

    const amountPaise = CREDIT_PACKS[credits];

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `zeflash_${Date.now()}`,
      notes: {
        clerkUserId,
        credits: String(credits),
      },
    });

    // Save payment record to DB (status: "created")
    await prisma.payment.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        amount: amountPaise,
        credits,
        status: 'created',
      },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      credits,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create order' });
  }
}
