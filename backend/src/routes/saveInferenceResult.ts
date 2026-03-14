import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

interface InferenceResultPayload {
  device_id: string;
  evse_id: string;
  connector_id: number;
  status: string;
  anomalies: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  total_samples: number;
  total_anomalies: number;
  generated_at: string;
  data_points: number;
  s3_url: string;
  s3_key: string;
  timing: {
    inference_time_ms: number;
    total_time_ms: number;
  };
}

/**
 * POST /api/inference/save-result
 * Save inference result to Neon database
 */
router.post('/save-result', async (req: Request, res: Response) => {
  try {
    const payload: InferenceResultPayload = req.body;

    // Validate required fields
    if (!payload.device_id || !payload.evse_id) {
      return res.status(400).json({
        error: 'Missing required fields: device_id, evse_id'
      });
    }

    // Save to database
    const result = await prisma.inferenceResult.upsert({
      where: {
        deviceId: payload.device_id
      },
      create: {
        deviceId: payload.device_id,
        evseId: payload.evse_id,
        connectorId: payload.connector_id,
        status: payload.status,
        anomalies: payload.anomalies,
        totalSamples: payload.total_samples,
        totalAnomalies: payload.total_anomalies,
        generatedAt: new Date(payload.generated_at),
        dataPoints: payload.data_points,
        s3Url: payload.s3_url,
        s3Key: payload.s3_key,
        timing: payload.timing
      },
      update: {
        status: payload.status,
        anomalies: payload.anomalies,
        totalSamples: payload.total_samples,
        totalAnomalies: payload.total_anomalies,
        generatedAt: new Date(payload.generated_at),
        dataPoints: payload.data_points,
        s3Url: payload.s3_url,
        s3Key: payload.s3_key,
        timing: payload.timing
      }
    });

    res.json({
      success: true,
      message: 'Inference result saved',
      data: result
    });

  } catch (error) {
    console.error('Error saving inference result:', error);
    res.status(500).json({
      error: 'Failed to save inference result',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/inference/results/:evseId
 * Get all inference results for an EVSE
 */
router.get('/results/:evseId', async (req: Request, res: Response) => {
  try {
    const evseId = Array.isArray(req.params.evseId) ? req.params.evseId[0] : req.params.evseId;

    const results = await prisma.inferenceResult.findMany({
      where: {
        evseId: evseId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error('Error fetching inference results:', error);
    res.status(500).json({
      error: 'Failed to fetch inference results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/inference/latest/:evseId
 * Get latest inference result for an EVSE
 */
router.get('/latest/:evseId', async (req: Request, res: Response) => {
  try {
    const evseId = Array.isArray(req.params.evseId) ? req.params.evseId[0] : req.params.evseId;

    const result = await prisma.inferenceResult.findFirst({
      where: {
        evseId: evseId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No inference results found for this EVSE'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching latest inference result:', error);
    res.status(500).json({
      error: 'Failed to fetch inference result',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/inference/all
 * Get all inference results with pagination
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      prisma.inferenceResult.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.inferenceResult.count()
    ]);

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error('Error fetching all inference results:', error);
    res.status(500).json({
      error: 'Failed to fetch inference results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
