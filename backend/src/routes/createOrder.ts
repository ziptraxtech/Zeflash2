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

  console.log(`[createOrder] REQUEST RECEIVED - planName: "${planName}", credits: ${credits}, months: ${months}, isCustom: ${isCustom}`);

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
      const basePrice = PLAN_PACKS[planName].price;
      payable = totalWithGst(basePrice);
      console.log(`[createOrder] ✓ Plan "${planName}" found - basePrice: ₹${basePrice}, with GST (18%): ₹${payable}`);
      selectedPack = planName;
    } else {
      // No planName: the single AI report flow (AIReportCheckout). Never fall
      // back to a plan price here — that silently charges a different amount
      // than the one the user was shown. This price already includes GST.
      payable = credits * SINGLE_REPORT_PRICE;
      selectedPack = 'single-report';
      console.log(`[createOrder] ⚠ No plan found, using SINGLE_REPORT_PRICE: ₹${payable}`);
    }

    console.log(`[createOrder] CALCULATING: ${selectedPack} → ₹${payable} for ${credits} credit(s)`);

    const amountInPaise = toPaise(payable);
    console.log(`[createOrder] RAZORPAY: Converting ₹${payable} → ${amountInPaise} paise`);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
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

    console.log(`[createOrder] ✓ RAZORPAY ORDER CREATED:`);
    console.log(`    Order ID: ${order.id}`);
    console.log(`    Amount stored in Razorpay: ${order.amount} paise = ₹${(order.amount as any) / 100}`);
    console.log(`    Expected: ${amountInPaise} paise = ₹${amountInPaise / 100}`);

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

    const response = { 
      orderId: order.id, 
      amount: payable, // rupees — the frontend displays this
      currency: 'INR', 
      credits, 
      keyId: process.env.RAZORPAY_KEY_ID 
    };
    
    console.log(`[createOrder] ✓ RESPONSE TO FRONTEND: ₹${response.amount} (rupees) for order ${response.orderId}`);
    
    return res.json(response);
  } catch (err: any) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message });
  }
});
