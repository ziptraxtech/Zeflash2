import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser } from '../services/userService';
import { razorpay, PLAN_PACKS, calculateCustomPlanPrice } from '../lib/razorpay';
import { prisma } from '../lib/prisma';

export const createOrderRouter = Router();

createOrderRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { credits, email, planName, months, isCustom, couponCode } = req.body as { 
    credits: number; 
    email?: string;
    planName?: string;
    months?: number;
    isCustom?: boolean;
    couponCode?: string;
  };

  if (!credits || credits < 1) {
    return res.status(400).json({ error: 'Invalid credits amount' });
  }

  try {
    const user = await getOrCreateUser(req.clerkUserId!, email);
    if (!user) return res.status(500).json({ error: 'Failed to resolve user' });

    // Calculate amount based on whether it's a custom plan or predefined pack
    let amountPaise: number;
    let selectedPack: string = 'unknown';
    
    if (isCustom && months) {
      amountPaise = calculateCustomPlanPrice(credits, months);
      selectedPack = `custom-${months}m`;
    } else if (planName && PLAN_PACKS[planName]) {
      amountPaise = PLAN_PACKS[planName].price;
      selectedPack = planName;
      console.log(`[createOrder] Plan "${planName}" found in PLAN_PACKS: ${amountPaise} paise (₹${amountPaise / 100}), ${credits} credits`);
    } else {
      // If plan not found, log it and use the trial price as fallback
      console.warn(`[createOrder] Plan "${planName}" NOT found in PLAN_PACKS. Using trial price (23500 paise) as fallback. Available plans: ${Object.keys(PLAN_PACKS).join(', ')}`);
      amountPaise = PLAN_PACKS['trial'].price; // Use trial price (₹235) as fallback, not credits * 29900
      selectedPack = 'trial-fallback';
    }

    console.log(`[createOrder] Creating order: ${selectedPack}, amount=${amountPaise} paise (₹${amountPaise / 100}), credits=${credits}`);

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `zeflash_${Date.now()}`,
      notes: { 
        clerkUserId: req.clerkUserId!, 
        credits: String(credits),
        planName: planName || 'custom',
        months: months ? String(months) : '0',
        ...(couponCode && { couponCode })
      },
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        amount: amountPaise,
        credits,
        status: 'created',
        ...(couponCode && { couponCode }),
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
