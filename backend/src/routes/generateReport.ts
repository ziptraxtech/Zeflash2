import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser, deductCredit } from '../services/userService';
import { prisma } from '../lib/prisma';

const ML_BACKEND_URL =
  process.env.ML_BACKEND_URL ||
  'http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com';

async function triggerInference(evseId: string, connectorId: number) {
  const res = await fetch(`${ML_BACKEND_URL}/api/v1/inference/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evse_id: evseId, connector_id: connectorId, limit: 60 }),
  });
  if (!res.ok) throw new Error(`ML trigger failed: ${res.status} — ${await res.text()}`);
  return res.json() as Promise<{ job_id: string }>;
}

async function pollJob(jobId: string): Promise<{ s3_path: string; s3_bucket: string }> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${ML_BACKEND_URL}/api/v1/inference/status/${jobId}`);
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
    const data = await res.json() as { status: string; result?: { s3_path: string; s3_bucket: string } };
    if (data.status === 'completed' && data.result) return data.result;
    if (data.status === 'failed') throw new Error('ML job failed');
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('ML job timed out after 120s');
}

export const generateReportRouter = Router();

generateReportRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { evse_id, connector_id, email } = req.body as {
    evse_id: string; connector_id: number; email?: string;
  };

  if (!evse_id || connector_id === undefined) {
    return res.status(400).json({ error: 'evse_id and connector_id are required' });
  }

  const user = await getOrCreateUser(req.clerkUserId!, email).catch(() => null);
  if (!user) return res.status(500).json({ error: 'Failed to resolve user' });

  // Check credits
  const credits = await prisma.credit.findUnique({ where: { userId: user.id } });
  if (!credits || credits.remaining < 1) {
    return res.status(402).json({
      error: 'Insufficient credits. Please purchase a report pack.',
      remaining: credits?.remaining ?? 0,
    });
  }

  // Deduct + create report record BEFORE calling ML
  let report: { id: string };
  try {
    await deductCredit(user.id, `Report for ${evse_id} connector ${connector_id}`);
    report = await prisma.report.create({
      data: { userId: user.id, evseId: evse_id, connector: connector_id, status: 'processing' },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  // Call ML service
  try {
    const { job_id } = await triggerInference(evse_id, connector_id);
    const result = await pollJob(job_id);
    const s3Url = `https://${result.s3_bucket}.s3.us-east-1.amazonaws.com/${result.s3_path}`;

    const completed = await prisma.report.update({
      where: { id: report.id },
      data: { status: 'completed', s3Url },
    });

    return res.json({
      reportId: completed.id,
      status: 'completed',
      s3Url,
      evseId: evse_id,
      connector: connector_id,
      generatedAt: completed.updatedAt,
    });
  } catch (err: any) {
    await prisma.report.update({ where: { id: report.id }, data: { status: 'failed' } }).catch(() => {});
    return res.status(502).json({
      error: 'Report generation failed. Contact support for a credit refund.',
      detail: err.message,
      reportId: report.id,
    });
  }
});
