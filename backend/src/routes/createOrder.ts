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
    // All amounts are in RUPEES (not paise)
    let amountInRupees: number;
    let selectedPack: string = 'unknown';
    
    if (isCustom && months) {
      // Custom plan: calculate per-test price with GST, then multiply by tests
      const priceMap: { [key: number]: number } = {
        12: 300,  // ₹300/test for 12 months
        18: 290,  // ₹290/test for 18 months
        24: 280,  // ₹280/test for 24 months
      };
      const pricePerTest = priceMap[months] || 300;
      const subtotal = credits * pricePerTest;
      amountInRupees = Math.round(subtotal * 1.18); // Apply GST and round to rupee
      selectedPack = `custom-${months}m`;
    } else if (planName && PLAN_PACKS[planName]) {
      amountInRupees = PLAN_PACKS[planName].price;
      selectedPack = planName;
      console.log(`[createOrder] Plan "${planName}" found: ₹${amountInRupees}, ${credits} credits`);
    } else {
      // If plan not found, use trial price as fallback
      console.warn(`[createOrder] Plan "${planName}" NOT found in PLAN_PACKS. Using trial price (₹235) as fallback. Available: ${Object.keys(PLAN_PACKS).join(', ')}`);
      amountInRupees = PLAN_PACKS['trial'].price;
      selectedPack = 'trial-fallback';
    }

    console.log(`[createOrder] Creating order: ${selectedPack}, amount=₹${amountInRupees}, credits=${credits}`);

    const order = await razorpay.orders.create({
      amount: amountInRupees,
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
        amount: amountInRupees,
        credits,
        status: 'created',
        ...(couponCode && { couponCode }),
      },
    });

    return res.json({ 
      orderId: order.id, 
      amount: amountInRupees,  // Return in RUPEES for frontend comparison
      currency: 'INR', 
      credits, 
      keyId: process.env.RAZORPAY_KEY_ID 
    });
  } catch (err: any) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message });
  }
});
