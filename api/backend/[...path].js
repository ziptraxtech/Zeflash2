/**
 * Vercel Serverless Function - Backend Proxy
 * Proxies all requests to EC2 backend
 * Route: /api/backend/* → EC2 backend:3000/*
 */

export default async function handler(req, res) {
  // Backend URL - use server-side env var, not VITE_ (which is frontend-only)
  const BACKEND_URL = process.env.BACKEND_API_URL || process.env.VITE_API_BASE || 'http://3.90.162.23:3000';
  
  if (!BACKEND_URL || BACKEND_URL.includes('vercel.app')) {
    console.error('❌ BACKEND_API_URL not set or pointing to Vercel (loop!)');
    console.error('   Set BACKEND_API_URL in Vercel env vars to your EC2 IP');
    return res.status(500).json({
      error: 'Backend API URL not configured',
      message: 'BACKEND_API_URL environment variable must point to EC2 backend'
    });
  }
  
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
    // Extract path from Vercel catch-all route
    // For /api/backend/generate-report -> req.query.path = ['generate-report']
    let pathArray = req.query.path || [];
    
    // Ensure it's an array
    if (!Array.isArray(pathArray)) {
      pathArray = [pathArray];
    }
    
    // Construct full path
    const path = pathArray.length > 0 
      ? '/' + pathArray.join('/') 
      : '/health';

    const targetUrl = `${BACKEND_URL}${path}`;

    console.log(`🔄 Backend Proxy: ${req.method} ${targetUrl}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Path: ${path}`);
    console.log(`   Backend: ${BACKEND_URL}`);

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
    
    console.log(`   Response Status: ${response.status}`);

    // Get response content type
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Forward status and data
    if (response.ok) {
      res.status(response.status).json(data);
    } else {
      console.error(`   Error: ${response.status}`, data);
      res.status(response.status).json(data);
    }

  } catch (error) {
    console.error('❌ Backend Proxy Error:', error.message);
    console.error('   Error Details:', error);
    
    res.status(500).json({
      error: 'Backend proxy error',
      message: error.message,
      details: error.toString(),
      backend_url: BACKEND_URL,
      note: 'Check that backend is running and accessible'
    });
  }
}
