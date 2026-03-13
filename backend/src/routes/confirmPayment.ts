import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { addCredits, getRemainingCredits } from '../services/userService';

export const confirmPaymentRouter = Router();

confirmPaymentRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment confirmation fields' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ error: 'Payment verification is not configured' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  const dbPayment = await prisma.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
    include: { user: true },
  });

  if (!dbPayment) {
    return res.status(404).json({ error: 'Payment record not found' });
  }

  if (dbPayment.user.clerkUserId !== req.clerkUserId) {
    return res.status(403).json({ error: 'Payment does not belong to current user' });
  }

  if (dbPayment.status === 'paid') {
    const remaining = await getRemainingCredits(dbPayment.userId);
    return res.json({
      success: true,
      alreadyProcessed: true,
      creditsAdded: 0,
      remaining,
    });
  }

  await prisma.payment.update({
    where: { razorpayOrderId: razorpay_order_id },
    data: {
      status: 'paid',
      razorpayPaymentId: razorpay_payment_id,
      processedAt: new Date(),
    },
  });

  const updatedCredits = await addCredits(
    dbPayment.userId,
    dbPayment.credits,
    `Payment ${razorpay_payment_id} — ${dbPayment.credits} credit(s)`
  );

  return res.json({
    success: true,
    alreadyProcessed: false,
    creditsAdded: dbPayment.credits,
    remaining: updatedCredits.remaining,
  });
});
