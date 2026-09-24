import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser } from '../services/userService';
import { razorpay, PLAN_PACKS, calculateCustomPlanPrice, totalWithGst, toPaise, SINGLE_REPORT_PRICE } from '../lib/razorpay';
import { prisma } from '../lib/prisma';

export const createOrderRouter = Router();

createOrderRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  let { credits, email, planName, months, isCustom, couponCode } = req.body as { 
    credits: number; 
    email?: string;
    planName?: string;
    months?: number;
    isCustom?: boolean;
    couponCode?: string;
  };

  // TRIM planName to remove any whitespace
  planName = planName?.trim().toLowerCase();

  console.log(`[createOrder] REQUEST RECEIVED - planName: "${planName}", credits: ${credits}, months: ${months}, isCustom: ${isCustom}`);
  console.log(`[createOrder] PLAN_PACKS keys available: ${Object.keys(PLAN_PACKS).join(', ')}`);
  console.log(`[createOrder] planName="${planName}" exists in PLAN_PACKS: ${planName ? (planName in PLAN_PACKS) : false}`);

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
    } else if (planName) {
      // A plan was named, so it must be one we know. Falling back to some other
      // price here is what makes Razorpay show a total the checkout page never
      // displayed — fail loudly instead, so the mismatch can never be charged.
      const pack = PLAN_PACKS[planName];
      if (!pack) {
        console.error(`[createOrder] Unknown plan "${planName}". Known: ${Object.keys(PLAN_PACKS).join(', ')}`);
        return res.status(400).json({
          error: `Unknown plan "${planName}". This is a configuration error — you have not been charged.`,
        });
      }
      payable = totalWithGst(pack.price);
      selectedPack = planName;
      console.log(`[createOrder] Plan "${planName}": base ₹${pack.price} + 18% GST = ₹${payable}`);
    } else {
      // No planName at all: the single AI report flow (AIReportCheckout).
      // This price already includes GST.
      payable = credits * SINGLE_REPORT_PRICE;
      selectedPack = 'single-report';
      console.log(`[createOrder] No plan named — ${credits} AI report(s) at ₹${SINGLE_REPORT_PRICE} = ₹${payable}`);
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
