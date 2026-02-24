import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { addCredits } from '../services/userService';

// Disable Vercel's default body parser so we can read raw bytes for HMAC verification
export const config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const bodyString = rawBody.toString('utf8');

  // Verify Razorpay webhook signature
  const receivedSig = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyString)
    .digest('hex');

  if (receivedSig !== expectedSig) {
    console.error('❌ Webhook signature mismatch');
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  let event: any;
  try {
    event = JSON.parse(bodyString);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventType: string = event.event;
  console.log('📦 Razorpay webhook event:', eventType);

  // Handle successful payment
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    try {
      const payment = event.payload.payment?.entity || event.payload.order?.entity?.payment;
      const order = event.payload.order?.entity || event.payload.payment?.entity?.order;

      const razorpayPaymentId: string = event.payload.payment?.entity?.id;
      const razorpayOrderId: string =
        event.payload.payment?.entity?.order_id ||
        event.payload.order?.entity?.id;

      if (!razorpayOrderId) {
        console.error('❌ Could not extract order ID from event');
        return res.status(200).json({ received: true }); // acknowledge to Razorpay
      }

      // Find the payment record in DB
      const dbPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId },
        include: { user: true },
      });

      if (!dbPayment) {
        console.error('❌ Payment record not found for order:', razorpayOrderId);
        return res.status(200).json({ received: true });
      }

      // Idempotency: skip if already processed
      if (dbPayment.status === 'paid') {
        console.log('⚠️ Payment already processed, skipping:', razorpayOrderId);
        return res.status(200).json({ received: true });
      }

      // Mark payment as paid
      await prisma.payment.update({
        where: { razorpayOrderId },
        data: {
          status: 'paid',
          razorpayPaymentId,
          processedAt: new Date(),
        },
      });

      // Add credits to user
      await addCredits(
        dbPayment.userId,
        dbPayment.credits,
        `Payment ${razorpayPaymentId} — ${dbPayment.credits} credit(s) purchased`
      );

      console.log(
        `✅ Credits added: ${dbPayment.credits} for user ${dbPayment.user.clerkUserId}`
      );
    } catch (err: any) {
      console.error('❌ Webhook processing error:', err.message);
      // Still return 200 so Razorpay doesn't retry infinitely
      return res.status(200).json({ received: true, error: err.message });
    }
  }

  if (eventType === 'payment.failed') {
    try {
      const razorpayOrderId: string = event.payload.payment?.entity?.order_id;
      if (razorpayOrderId) {
        await prisma.payment.updateMany({
          where: { razorpayOrderId, status: 'created' },
          data: { status: 'failed' },
        });
        console.log('❌ Payment failed for order:', razorpayOrderId);
      }
    } catch (err: any) {
      console.error('Failed to update failed payment:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}
