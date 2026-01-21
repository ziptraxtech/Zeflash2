import type { VercelRequest, VercelResponse } from '@vercel/node';

const ML_BACKEND_URL = 'http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the path from query parameter
    const path = (req.query.path as string) || '';
    const url = `${ML_BACKEND_URL}${path}`;

    console.log('Proxying request:', req.method, url);

    const https = require('https');
    const http = require('http');
    
    const options: any = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Use http module for the request
    return new Promise((resolve) => {
      const httpReq = http.request(url, options, (httpRes: any) => {
        let data = '';
        
        httpRes.on('data', (chunk: any) => {
          data += chunk;
        });
        
        httpRes.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            res.status(httpRes.statusCode).json(jsonData);
          } catch (e) {
            res.status(httpRes.statusCode).send(data);
          }
          resolve(null);
        });
      });

      httpReq.on('error', (error: any) => {
        console.error('Proxy error:', error);
        res.status(500).json({ 
          error: 'Failed to reach backend',
          details: error.message 
        });
        resolve(null);
      });

      // Send body for POST requests
      if (req.method === 'POST' && req.body) {
        httpReq.write(JSON.stringify(req.body));
      }

      httpReq.end();
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to reach backend',
      details: error.message 
    });
  }
}
