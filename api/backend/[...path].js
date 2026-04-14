/**
 * Vercel Serverless Function - Backend Proxy
 * Proxies all requests to EC2 backend
 * Route: /api/backend/* → EC2 backend:3000/*
 */

export default async function handler(req, res) {
  // Backend URL
  const BACKEND_URL = process.env.VITE_API_BASE || 'http://3.90.162.23:3000';
  
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract path from query params
    const pathArray = (req.query.path || []);
    const path = Array.isArray(pathArray) 
      ? '/' + pathArray.join('/') 
      : '/health';

    const targetUrl = `${BACKEND_URL}${path}`;

    console.log(`🔄 Backend Proxy: ${req.method} ${path}`);
    console.log(`   Target: ${targetUrl}`);
    console.log(`   Backend URL: ${BACKEND_URL}`);

    // Prepare request options
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    // Add Authorization header if present
    if (req.headers.authorization) {
      options.headers['Authorization'] = req.headers.authorization;
    }

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }

    // Make request to backend
    const response = await fetch(targetUrl, options);

    // Get response data
    const data = await response.json().catch(() => ({}));

    // Forward status and data
    res.status(response.status).json({
      ...data,
      _proxied: true,
      _backend: BACKEND_URL,
    });

  } catch (error) {
    console.error('❌ Backend Proxy Error:', error.message);
    res.status(500).json({
      error: 'Backend proxy failed',
      message: error.message,
      _backend: BACKEND_URL,
    });
  }
}
