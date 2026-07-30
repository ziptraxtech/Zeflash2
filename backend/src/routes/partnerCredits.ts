import { Router, Request, Response } from 'express';
import { getOrCreateUser, addCredits } from '../services/userService';
import { prisma } from '../lib/prisma';

export const partnerCreditsRouter = Router();

// POST /partner/credits/grant — server-to-server credit grant from a
// trusted partner (currently: EVChamp's credit_grant_outbox processor, see
// EVChamp's api/index.js deliverCreditGrant()). Authenticated by a shared
// API key, NOT a Clerk session — the caller is granting credit on behalf of
// one of its own users, identified by clerkUserId (EVChamp and Zeflash share
// the same Clerk tenant, so this ID resolves to the same person here).
partnerCreditsRouter.post('/grant', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const expectedKey = process.env.EVCHAMP_PARTNER_API_KEY;

  if (!expectedKey) {
    console.error('[partner-credits] EVCHAMP_PARTNER_API_KEY not configured');
    return res.status(500).json({ error: 'Partner grants not configured' });
  }
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid partner API key' });
  }

  const { userId: clerkUserId, quantity, orderId, unitType, couponCode } = req.body || {};
  if (!clerkUserId || !quantity || !orderId) {
    return res.status(400).json({ error: 'userId, quantity and orderId are required' });
  }

  // Idempotency: EVChamp's outbox retries on failure/timeout, so the same
  // grant can arrive more than once for the same order — never double-credit.
  const idempotencyPrefix = `evchamp:${orderId}`;

  try {
    const existing = await prisma.creditTransaction.findFirst({
      where: { note: { startsWith: idempotencyPrefix } },
    });
    if (existing) {
      return res.json({ ok: true, alreadyGranted: true, credited: true });
    }

    // Do not create an account solely to deliver a trial. If the user has
    // already signed in to Zeflash, their shared Clerk ID identifies them and
    // we credit the wallet. Otherwise the purchase becomes a guest coupon.
    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      if (!couponCode) return res.status(400).json({ error: 'couponCode is required for a guest grant' });
      try {
        await prisma.partnerCoupon.create({
          data: {
            code: String(couponCode).toUpperCase(),
            orderId,
            clerkUserId,
            quantity: Number(quantity),
            remaining: Number(quantity),
          },
        });
      } catch (err: any) {
        if (err.code !== 'P2002') throw err;
      }
      return res.json({ ok: true, couponIssued: true });
    }

    const note = `${idempotencyPrefix} — ${quantity} ${unitType || 'credit(s)'} via EVChamp purchase`;
    await addCredits(user.id, Number(quantity), note);

    console.log(`✅ [partner-credits] +${quantity} (${unitType || 'credits'}) for ${clerkUserId} via EVChamp order ${orderId}`);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[partner-credits] Grant error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});
