import express, { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * POST /api/inference/results
 * Save inference result to database
 */
router.post("/results", async (req: Request, res: Response) => {
  try {
    const {
      device_id,
      evse_id,
      connector_id,
      status,
      anomalies,
      total_samples,
      total_anomalies,
      generated_at,
      data_points,
      s3_url,
      s3_key,
      timing,
    } = req.body;

    // Validate required fields
    if (!device_id || !evse_id || !status || !s3_url) {
      return res.status(400).json({
        error: "Missing required fields: device_id, evse_id, status, s3_url",
      });
    }

    // Save to database (upsert - create or update if exists)
    const result = await prisma.inferenceResult.upsert({
      where: { deviceId: device_id },
      update: {
        evseId: evse_id,
        connectorId: connector_id,
        status,
        anomalies: anomalies || {},
        totalSamples: total_samples || 0,
        totalAnomalies: total_anomalies || 0,
        generatedAt: new Date(generated_at),
        dataPoints: data_points || 0,
        s3Url: s3_url,
        s3Key: s3_key,
        timing: timing || {},
      },
      create: {
        deviceId: device_id,
        evseId: evse_id,
        connectorId: connector_id,
        status,
        anomalies: anomalies || {},
        totalSamples: total_samples || 0,
        totalAnomalies: total_anomalies || 0,
        generatedAt: new Date(generated_at),
        dataPoints: data_points || 0,
        s3Url: s3_url,
        s3Key: s3_key,
        timing: timing || {},
      },
    });

    return res.status(201).json({
      success: true,
      message: "Inference result saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error saving inference result:", error);
    return res.status(500).json({
      error: "Failed to save inference result",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/inference/results
 * Get all inference results (with optional filters)
 */
router.get("/results", async (req: Request, res: Response) => {
  try {
    const { evse_id, status, limit = 100, offset = 0 } = req.query;

    const where: any = {};
    if (evse_id) where.evseId = Array.isArray(evse_id) ? evse_id[0] : evse_id;
    if (status) where.status = Array.isArray(status) ? status[0] : status;

    const results = await prisma.inferenceResult.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.inferenceResult.count({ where });

    return res.status(200).json({
      success: true,
      data: results,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error("Error fetching inference results:", error);
    return res.status(500).json({
      error: "Failed to fetch inference results",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/inference/results/:device_id
 * Get specific inference result by device ID
 */
router.get("/results/:device_id", async (req: Request, res: Response) => {
  try {
    const device_id = Array.isArray(req.params.device_id) ? req.params.device_id[0] : req.params.device_id;

    const result = await prisma.inferenceResult.findUnique({
      where: { deviceId: device_id },
    });

    if (!result) {
      return res.status(404).json({
        error: "Inference result not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching inference result:", error);
    return res.status(500).json({
      error: "Failed to fetch inference result",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/inference/evse/:evse_id
 * Get all inference results for a specific EVSE ID
 */
router.get("/evse/:evse_id", async (req: Request, res: Response) => {
  try {
    const evse_id = Array.isArray(req.params.evse_id) ? req.params.evse_id[0] : req.params.evse_id;
    const { limit = 50, offset = 0 } = req.query;

    const results = await prisma.inferenceResult.findMany({
      where: { evseId: evse_id },
      orderBy: { updatedAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.inferenceResult.count({
      where: { evseId: evse_id },
    });

    return res.status(200).json({
      success: true,
      data: results,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error("Error fetching EVSE inference results:", error);
    return res.status(500).json({
      error: "Failed to fetch EVSE inference results",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/inference/stats
 * Get statistics on inference results
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const totalCount = await prisma.inferenceResult.count();

    const statusBreakdown = await prisma.inferenceResult.groupBy({
      by: ["status"],
      _count: true,
    });

    const latestResults = await prisma.inferenceResult.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalInferences: totalCount,
        statusBreakdown: statusBreakdown.map((stat: any) => ({
          status: stat.status,
          count: stat._count,
        })),
        latestResults,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({
      error: "Failed to fetch statistics",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/inference/results/:device_id
 * Delete inference result by device ID
 */
router.delete("/results/:device_id", async (req: Request, res: Response) => {
  try {
    const device_id = Array.isArray(req.params.device_id) ? req.params.device_id[0] : req.params.device_id;

    const result = await prisma.inferenceResult.delete({
      where: { deviceId: device_id },
    });

    return res.status(200).json({
      success: true,
      message: "Inference result deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error deleting inference result:", error);
    return res.status(500).json({
      error: "Failed to delete inference result",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
