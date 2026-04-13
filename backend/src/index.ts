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
    const ml_url = process.env.ML_BACKEND_URL || 'http://127.0.0.1:8000';
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
      ml_backend: process.env.ML_BACKEND_URL || 'http://127.0.0.1:8000',
      error: error.message 
    });
  }
});

// Serve local report images
app.get('/api/reports/:deviceId/:filename', (req: Request, res: Response) => {
  const deviceId = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;
  const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  
  // Security: only allow battery_health_report.png
  if (filename !== 'battery_health_report.png') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Construct path to ML backend reports directory
  const reportPath = path.join(
    __dirname,
    '../../battery-ml-lambda/reports',
    deviceId,
    filename
  );
  
  // Verify file exists
  if (!fs.existsSync(reportPath)) {
    console.log(`[API] Report not found: ${reportPath}`);
    return res.status(404).json({ error: 'Report not found' });
  }
  
  // Serve the file
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.sendFile(reportPath);
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
