import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { addCredits } from '../services/userService';

export const webhookRouter = Router();

// Body is raw Buffer (set in index.ts before express.json)
webhookRouter.post('/', async (req: Request, res: Response) => {
  const bodyBuffer = req.body as Buffer;
  const bodyString = bodyBuffer.toString('utf8');

  const receivedSig = req.headers['x-razorpay-signature'] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(bodyString)
    .digest('hex');

  if (receivedSig !== expectedSig) {
    console.error('❌ Webhook signature mismatch');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event: any;
  try {
    event = JSON.parse(bodyString);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventType: string = event.event;
  console.log('📦 Webhook event:', eventType);

  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    try {
      const razorpayPaymentId: string = event.payload.payment?.entity?.id;
      const razorpayOrderId: string =
        event.payload.payment?.entity?.order_id ||
        event.payload.order?.entity?.id;

      if (!razorpayOrderId) {
        console.error('❌ No order ID in event');
        return res.status(200).json({ received: true });
      }

      const dbPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId },
        include: { user: true },
      });

      if (!dbPayment) {
        console.error('❌ Payment not found:', razorpayOrderId);
        return res.status(200).json({ received: true });
      }

      if (dbPayment.status === 'paid') {
        console.log('⚠️ Already processed:', razorpayOrderId);
        return res.status(200).json({ received: true });
      }

      await prisma.payment.update({
        where: { razorpayOrderId },
        data: { status: 'paid', razorpayPaymentId, processedAt: new Date() },
      });

      await addCredits(
        dbPayment.userId,
        dbPayment.credits,
        `Payment ${razorpayPaymentId} — ${dbPayment.credits} credit(s)`
      );

      console.log(`✅ Added ${dbPayment.credits} credits to ${dbPayment.user.clerkUserId}`);
    } catch (err: any) {
      console.error('❌ Webhook processing error:', err.message);
    }
  }

  if (eventType === 'payment.failed') {
    const razorpayOrderId: string = event.payload.payment?.entity?.order_id;
    if (razorpayOrderId) {
      await prisma.payment.updateMany({
        where: { razorpayOrderId, status: 'created' },
        data: { status: 'failed' },
      }).catch(() => {});
    }
  }

  return res.status(200).json({ received: true });
});
