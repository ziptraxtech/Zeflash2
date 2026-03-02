import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser } from '../services/userService';
import { razorpay, PLAN_PACKS, calculateCustomPlanPrice } from '../lib/razorpay';
import { prisma } from '../lib/prisma';

export const createOrderRouter = Router();

createOrderRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { credits, email, planName, months, isCustom } = req.body as { 
    credits: number; 
    email?: string;
    planName?: string;
    months?: number;
    isCustom?: boolean;
  };

  if (!credits || credits < 1) {
    return res.status(400).json({ error: 'Invalid credits amount' });
  }

  try {
    const user = await getOrCreateUser(req.clerkUserId!, email);
    if (!user) return res.status(500).json({ error: 'Failed to resolve user' });

    // Calculate amount based on whether it's a custom plan or predefined pack
    let amountPaise: number;
    if (isCustom && months) {
      amountPaise = calculateCustomPlanPrice(credits, months);
    } else if (planName && PLAN_PACKS[planName]) {
      amountPaise = PLAN_PACKS[planName].price;
    } else {
      // Fallback to trial price
      amountPaise = credits * 29900;
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `zeflash_${Date.now()}`,
      notes: { 
        clerkUserId: req.clerkUserId!, 
        credits: String(credits),
        planName: planName || 'custom',
        months: months ? String(months) : '0'
      },
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

    return res.json({ 
      orderId: order.id, 
      amount: amountPaise, 
      currency: 'INR', 
      credits, 
      keyId: process.env.RAZORPAY_KEY_ID 
    });
  } catch (err: any) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message });
  }
});
