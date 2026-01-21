import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const ML_BACKEND_URL = 'http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const path = req.query.path as string || '';
    const url = `${ML_BACKEND_URL}${path}`;
    
    console.log('Proxy request to:', url);
    console.log('Method:', req.method);
    console.log('Body:', req.body);

    // Make request to backend
    const response = await fetch(url, {
      method: req.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    console.log('Backend status:', response.status);
    
    const data = await response.json();
    console.log('Backend data:', data);
    
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Proxy failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
