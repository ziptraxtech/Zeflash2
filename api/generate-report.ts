import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../middleware/auth';
import { getOrCreateUser, deductCredit } from '../services/userService';
import { prisma } from '../lib/prisma';

const ML_BACKEND_URL =
  process.env.ML_BACKEND_URL ||
  'http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

async function triggerInference(evseId: string, connectorId: number) {
  const res = await fetch(`${ML_BACKEND_URL}/api/v1/inference/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evse_id: evseId, connector_id: connectorId, limit: 60 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML trigger failed: ${res.status} — ${text}`);
  }
  return res.json() as Promise<{ job_id: string; status: string }>;
}

async function pollJob(jobId: string): Promise<{ s3_path: string; s3_bucket: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    const res = await fetch(`${ML_BACKEND_URL}/api/v1/inference/status/${jobId}`);
    if (!res.ok) throw new Error(`Status poll failed: ${res.status}`);

    const data = await res.json() as {
      status: string;
      result?: { s3_path: string; s3_bucket: string };
    };

    if (data.status === 'completed' && data.result) return data.result;
    if (data.status === 'failed') throw new Error('ML job failed');

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('ML job timed out after 120s');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  const { evse_id, connector_id, email } = req.body as {
    evse_id: string;
    connector_id: number;
    email?: string;
  };

  if (!evse_id || connector_id === undefined) {
    return res.status(400).json({ error: 'evse_id and connector_id are required' });
  }

  let user: Awaited<ReturnType<typeof getOrCreateUser>>;
  try {
    user = await getOrCreateUser(clerkUserId, email);
    if (!user) return res.status(500).json({ error: 'Failed to resolve user' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resolve user' });
  }

  // 1. Check credits before doing anything
  const credits = await prisma.credit.findUnique({ where: { userId: user.id } });
  if (!credits || credits.remaining < 1) {
    return res.status(402).json({
      error: 'Insufficient credits. Please purchase a report pack.',
      remaining: credits?.remaining ?? 0,
    });
  }

  // 2. Deduct credit + create report record BEFORE calling ML service
  let report: { id: string };
  try {
    await deductCredit(user.id, `Report for ${evse_id} connector ${connector_id}`);
    report = await prisma.report.create({
      data: {
        userId: user.id,
        evseId: evse_id,
        connector: connector_id,
        status: 'processing',
      },
    });
  } catch (err: any) {
    console.error('Credit deduction / report creation failed:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to start report' });
  }

  // 3. Call ML service and poll until done
  try {
    const { job_id } = await triggerInference(evse_id, connector_id);
    console.log(`✅ ML job triggered: ${job_id}`);

    const result = await pollJob(job_id);
    const s3Url = `https://${result.s3_bucket}.s3.us-east-1.amazonaws.com/${result.s3_path}`;

    // 4. Save S3 URL and mark report completed
    const completed = await prisma.report.update({
      where: { id: report.id },
      data: { status: 'completed', s3Url },
    });

    return res.status(200).json({
      reportId: completed.id,
      status: 'completed',
      s3Url,
      evseId: evse_id,
      connector: connector_id,
      generatedAt: completed.updatedAt,
    });
  } catch (err: any) {
    console.error('ML service failed:', err.message);

    await prisma.report
      .update({ where: { id: report.id }, data: { status: 'failed' } })
      .catch(() => {});

    return res.status(502).json({
      error: 'Report generation failed. Please contact support for a credit refund.',
      detail: err.message,
      reportId: report.id,
    });
  }
}
