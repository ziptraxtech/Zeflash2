import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { creditsRouter } from './routes/credits';
import { createOrderRouter } from './routes/createOrder';
import { webhookRouter } from './routes/webhook';
import { generateReportRouter } from './routes/generateReport';
import { reportsRouter } from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow Vercel frontend
app.use(cors({
  origin: ['https://zeflash.app', 'https://zeflash.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
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

// Routes
app.use('/credits', creditsRouter);
app.use('/create-order', createOrderRouter);
app.use('/webhook', webhookRouter);
app.use('/generate-report', generateReportRouter);
app.use('/reports', reportsRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Zeflash backend running on port ${PORT}`);
});

export default app;
