import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser } from '../services/userService';
import { razorpay, PLAN_PACKS, calculateCustomPlanPrice, totalWithGst, toPaise, SINGLE_REPORT_PRICE } from '../lib/razorpay';
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

    // Everything below is in RUPEES.
    let payable: number;          // what the customer pays: plan price + 18% GST
    let selectedPack = 'unknown';

    if (isCustom && months) {
      payable = totalWithGst(calculateCustomPlanPrice(credits, months));
      selectedPack = `custom-${months}m`;
    } else if (planName && PLAN_PACKS[planName]) {
      payable = totalWithGst(PLAN_PACKS[planName].price);
      selectedPack = planName;
    } else {
      // No planName: the single AI report flow (AIReportCheckout). Never fall
      // back to a plan price here — that silently charges a different amount
      // than the one the user was shown. This price already includes GST.
      payable = credits * SINGLE_REPORT_PRICE;
      selectedPack = 'single-report';
    }

    console.log(`[createOrder] ${selectedPack}: ₹${payable} for ${credits} credit(s)`);

    const order = await razorpay.orders.create({
      amount: toPaise(payable), // the one place rupees become paise
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
        amount: payable,
        credits,
        status: 'created',
        ...(couponCode && { couponCode }),
      },
    });

    return res.json({ 
      orderId: order.id, 
      amount: payable, // rupees — the frontend compares against this
      currency: 'INR', 
      credits, 
      keyId: process.env.RAZORPAY_KEY_ID 
    });
  } catch (err: any) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message });
  }
});
