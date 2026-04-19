import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { creditsRouter } from './routes/credits';
import { createOrderRouter } from './routes/createOrder';
import { confirmPaymentRouter } from './routes/confirmPayment';
import { webhookRouter } from './routes/webhook';
import { generateReportRouter } from './routes/generateReport';
import { reportsRouter } from './routes/reports';
import inferenceResultsRouter from './routes/inferenceResults';

const app = express();
const PORT = process.env.PORT || 3001;

const S3_BUCKET = process.env.S3_BUCKET || 'battery-ml-results-test';
const ALLOWED_REPORT_FILES = new Set([
  'battery_health_report.png',
  'voltage_analysis.png',
  'current_analysis.png',
  'temperature_analysis.png',
  'soc_analysis.png',
  'anomaly_detection.png',
]);

// CORS — allow Vercel frontend
app.use(cors({
  origin: ['https://zeflash.app', 'https://zeflash.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Raw body parser for webhook (must come BEFORE express.json)
app.use('/webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'zeflash-backend', timestamp: new Date().toISOString() });
});

// Clear all cached reports (for local testing)
app.post('/debug/clear-reports', async (_req, res) => {
  try {
    const { prisma } = await import('./lib/prisma');
    const deleted = await prisma.report.deleteMany();
    res.json({ success: true, deleted: deleted.count, message: 'All cached reports cleared. Next requests will generate fresh reports.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ML Backend connectivity test
app.get('/health/ml', async (_req, res) => {
  try {
    const ml_url = process.env.ML_BACKEND_URL || 'http://44.197.181.236:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${ml_url}/docs`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return res.json({ status: 'connected', ml_backend: ml_url, ml_status: 'healthy' });
    } else {
      return res.status(502).json({ status: 'error', ml_backend: ml_url, error: `ML returned ${response.status}` });
    }
  } catch (error: any) {
    return res.status(502).json({ 
      status: 'error', 
      ml_backend: process.env.ML_BACKEND_URL || 'http://44.197.181.236:8000',
      error: error.message 
    });
  }
});

// Serve report images from the public S3 bucket
app.get('/api/reports/:deviceId/:filename', async (req: Request, res: Response) => {
  try {
    const deviceId = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;

    if (!/^[A-Za-z0-9_-]+$/.test(deviceId) || !ALLOWED_REPORT_FILES.has(filename)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const s3Key = `battery-reports/${deviceId}/${filename}`;
    const publicUrl = `https://${S3_BUCKET}.s3.us-east-1.amazonaws.com/${s3Key}`;

    console.log(`[API] Redirecting report image to ${publicUrl}`);
    return res.redirect(publicUrl);
  } catch (error: any) {
    console.error('[API] Report image redirect error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve report image',
      detail: error.message,
    });
  }
});

// Routes
app.use('/credits', creditsRouter);
app.use('/create-order', createOrderRouter);
app.use('/confirm-payment', confirmPaymentRouter);
app.use('/webhook', webhookRouter);
app.use('/generate-report', generateReportRouter);
app.use('/reports', reportsRouter);
app.use('/api/inference', inferenceResultsRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Zeflash backend running on port ${PORT}`);
});

export default app;
