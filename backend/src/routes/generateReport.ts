import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrCreateUser, deductCredit } from '../services/userService';
import { prisma } from '../lib/prisma';

// ML Backend URL - from environment variable or sensible defaults
const ML_BACKEND_URL = 
  process.env.ML_BACKEND_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com'  // ECS ML ALB endpoint (listens on port 80)
    : 'http://127.0.0.1:8000');       // Local development

// Backend API URL - for report URLs returned to frontend
const BACKEND_API_URL = 
  process.env.BACKEND_API_URL || 
  (process.env.NODE_ENV === 'production'
    ? 'http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com'  // ALB endpoint (port 80)
    : 'http://localhost:3000');       // Local development

console.log(`[generateReport] ML Backend: ${ML_BACKEND_URL}`);
console.log(`[generateReport] API Backend: ${BACKEND_API_URL}`);
console.log(`[generateReport] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[generateReport] ML_BACKEND_URL env var: ${process.env.ML_BACKEND_URL || 'not set'}`);
console.log(`[generateReport] BACKEND_API_URL env var: ${process.env.BACKEND_API_URL || 'not set'}`);
if (!process.env.ML_BACKEND_URL) {
  console.log(`[generateReport] Using default ML endpoint for NODE_ENV=${process.env.NODE_ENV || 'development'}`);
}
if (!process.env.BACKEND_API_URL) {
  console.log(`[generateReport] Using default API endpoint for NODE_ENV=${process.env.NODE_ENV || 'development'}`);
}

/**
 * Trigger inference job on ML service
 */
async function triggerInference(evseId: string, connectorId: number, stationName?: string) {
  try {
    const url = `${ML_BACKEND_URL}/api/v1/inference/trigger`;
    console.log(`\n========================================`);
    console.log(`[generateReport] TRIGGERING INFERENCE`);
    console.log(`[generateReport] Using ML Backend: ${ML_BACKEND_URL}`);
    console.log(`[generateReport] Endpoint: POST ${url}`);
    console.log(`========================================\n`);
    
    const body: any = { 
      evse_id: evseId, 
      connector_id: connectorId, 
      limit: 60 
    };
    
    // Add station name if provided
    if (stationName) {
      body.station_name = stationName;
    }
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`[generateReport] ML trigger failed: ${res.status} — ${text}`);
      throw new Error(
        `ML trigger failed (${res.status}). ` +
        `Is the ML backend running at ${ML_BACKEND_URL}? ` +
        `Error: ${text}`
      );
    }
    
    const data = await res.json() as { job_id: string };
    console.log(`[generateReport] ✅ Job created: ${data.job_id}`);
    return data as { job_id: string };
  } catch (error: any) {
    console.error('[generateReport] ❌ Trigger error:', error.message);
    // Check if it's a connection error
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error(
        `Cannot connect to ML backend at ${ML_BACKEND_URL}. ` +
        `Please ensure the ML server is running: python run_server_local.py`
      );
    }
    throw error;
  }
}

/**
 * Poll job until completion
 */
async function pollJob(jobId: string): Promise<{
  status: string;
  anomalies: { critical: number; high: number; medium: number; low: number };
  total_samples: number;
  total_anomalies: number;
  s3_path?: string;
  s3_bucket?: string;
  recommendations?: string[];
}> {
  const deadline = Date.now() + 120_000; // 2 minute timeout
  const pollInterval = 3000; // 3 seconds
  
  while (Date.now() < deadline) {
    try {
      const url = `${ML_BACKEND_URL}/api/v1/inference/status/${jobId}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Poll failed: ${res.status}`);
      }
      
      const data = await res.json() as { status: string; result?: { status: string; anomalies: { critical: number; high: number; medium: number; low: number }; total_samples: number; total_anomalies: number; s3_path?: string; s3_bucket?: string; recommendations?: string[] }};
      console.log(`[generateReport] Job ${jobId} status: ${data.status}`);
      
      if (data.status === 'completed' && data.result) {
        return data.result;
      }
      
      if (data.status === 'failed') {
        throw new Error('ML job failed');
      }
      
      // Wait before next poll
      await new Promise(r => setTimeout(r, pollInterval));
    } catch (error) {
      console.error(`[generateReport] Poll error: ${error}`);
      throw error;
    }
  }
  
  throw new Error('ML job timed out after 120s');
}

/**
 * Validate and check coupon for free report generation
 */
function validateCoupon(couponCode?: string): { valid: boolean; isFree: boolean } {
  if (!couponCode) return { valid: false, isFree: false };
  
  const code = couponCode.toUpperCase();
  
  // Free coupons that grant reports without credit deduction
  const freeCoupons = ['ZEFLASHCODERS', 'TESTCHARJ', 'ZIPTRAX'];
  
  if (freeCoupons.includes(code)) {
    return { valid: true, isFree: true };
  }
  
  return { valid: false, isFree: false };
}

export const generateReportRouter = Router();

/**
 * POST /generate-report
 * Generate an AI battery report for a charger
 * 
 * Request: { evse_id: string, connector_id: number }
 * Response: { reportId, status, anomalies, s3Url?, ... }
 */
generateReportRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { evse_id, connector_id, email, coupon_code, station_name } = req.body as {
      evse_id: string;
      connector_id: number;
      email?: string;
      coupon_code?: string;
      station_name?: string;
    };

    // Validate input
    if (!evse_id || connector_id === undefined) {
      return res.status(400).json({ 
        error: 'evse_id and connector_id are required' 
      });
    }

    // Get or create user
    const user = await getOrCreateUser(req.clerkUserId!, email).catch(() => null);
    if (!user) {
      return res.status(500).json({ error: 'Failed to resolve user' });
    }

    // Check if using a valid coupon (skips credit requirement)
    const coupon = validateCoupon(coupon_code);
    
    // Check credits (skip if using valid coupon)
    if (!coupon.isFree) {
      const credits = await prisma.credit.findUnique({ where: { userId: user.id } });
      if (!credits || credits.remaining < 1) {
        return res.status(402).json({
          error: 'Insufficient credits. Please purchase a report pack.',
          remaining: credits?.remaining ?? 0,
        });
      }
    }

    // Deduct credit and create report record
    let report: { id: string };
    try {
      // Only deduct credit if not using a valid free coupon
      if (!coupon.isFree) {
        await deductCredit(user.id, `Report for ${evse_id} connector ${connector_id}`);
      } else {
        console.log(`[generateReport] ✅ Using free coupon: ${coupon_code}`);
      }
      
      report = await prisma.report.create({
        data: {
          userId: user.id,
          evseId: evse_id,
          connector: connector_id,
          status: 'processing',
        },
      });
      console.log(`[generateReport] Created report: ${report.id}`);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }

    // Call ML service
    try {
      // Trigger inference
      const { job_id } = await triggerInference(evse_id, connector_id, station_name);
      
      // Poll for completion
      const result = await pollJob(job_id);
      
      console.log(`\n========================================`);
      console.log(`[generateReport] ✅ ML INFERENCE COMPLETE`);
      console.log(`[generateReport] Anomaly Results:`);
      console.log(`  - Total Samples: ${result.total_samples}`);
      console.log(`  - Total Anomalies: ${result.total_anomalies}`);
      console.log(`  - Breakdown: ${JSON.stringify(result.anomalies)}`);
      console.log(`  - Source: ${ML_BACKEND_URL}`);
      console.log(`  - s3_path from ML: ${result.s3_path}`);
      console.log(`========================================\n`);

      // Construct report URL - return relative path that INCLUDES /api prefix
      // Backend endpoint is at /api/reports/:deviceId/:filename
      // Vercel proxy will forward /api/backend/api/reports/... → /api/reports/...
      let s3Url: string | undefined;
      if (result.s3_path) {
        const pathParts = result.s3_path.split('/');
        const deviceId = pathParts[1]; // Should be like "032300130C03074_1"
        // Return relative URL with /api prefix - frontend will combine with /api/backend
        s3Url = `/api/reports/${deviceId}/battery_health_report.png`;
        console.log(`[generateReport] Report URL (relative with /api): ${s3Url}`);
      }
      
      // Fallback: use relative URL with /api prefix
      if (!s3Url || s3Url.includes('amazonaws')) {
        s3Url = `/api/reports/${evse_id}_${connector_id}/battery_health_report.png`;
        console.log(`[generateReport] ⚠️  Constructed fallback URL (relative with /api): ${s3Url}`);
      }

      // Update report in database
      const completed = await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'completed',
          s3Url: s3Url,
          anomalies: result.anomalies,
          totalSamples: result.total_samples,
          totalAnomalies: result.total_anomalies,
          updatedAt: new Date(),
        },
      });

      // Return comprehensive response
      const response = {
        reportId: completed.id,
        status: result.status,
        anomalies: result.anomalies,
        totalSamples: result.total_samples,
        totalAnomalies: result.total_anomalies,
        s3Url: completed.s3Url,
        evseId: evse_id,
        connector: connector_id,
        generatedAt: completed.updatedAt,
        recommendations: result.recommendations || [],
      };
      
      console.log('[generateReport] Final response:', JSON.stringify(response));
      console.log('[generateReport] Recommendations count:', response.recommendations?.length);
      return res.json(response);
    } catch (err: any) {
      console.error('[generateReport] Inference error:', err);
      
      // Mark report as failed
      await prisma.report.update({
        where: { id: report.id },
        data: { status: 'failed' },
      }).catch(() => {});

      return res.status(502).json({
        error: 'Report generation failed. Contact support for a credit refund.',
        detail: err.message,
        reportId: report.id,
      });
    }
  } catch (error: any) {
    console.error('[generateReport] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      detail: error.message,
    });
  }
});
