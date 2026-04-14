// Vercel Serverless Function - Backend Proxy
// Route: /api/backend/* → EC2 backend

module.exports = async function handler(req, res) {
  // Always set CORS headers first — OPTIONS preflight must always return 200
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight before any other logic
  if (req.method === 'OPTIONS') {
    res.status(200);
    res.end();
    return;
  }

  // Backend URL - use server-side env var only (VITE_ vars are frontend-only)
  const BACKEND_URL = process.env.BACKEND_API_URL || 'http://3.90.162.23:3000';

  try {
    // Build target path
    const pathArray = Array.isArray(req.query.path) ? req.query.path : (req.query.path ? [req.query.path] : []);
    const path = pathArray.length > 0 ? '/' + pathArray.join('/') : '/health';
    const targetUrl = BACKEND_URL + path;

    console.log(`[Proxy] ${req.method} ${targetUrl}`);

    // Build request options
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add Authorization header if present
    if (req.headers.authorization) {
      fetchOptions.headers['Authorization'] = req.headers.authorization;
    }

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Make the request using native fetch
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json().catch(() => ({}));

    res.status(response.status);
    res.json(data);

  } catch (error) {
    console.error('[Proxy Error]', error.message);
    res.status(502).json({ 
      error: 'Proxy failed', 
      message: error.message, 
      backend: BACKEND_URL 
    });
  }
}
