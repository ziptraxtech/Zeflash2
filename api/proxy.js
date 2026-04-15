// Vercel Serverless Function - Backend Proxy
// Route: /api/backend/* → EC2 backend

const https = require('https');
const http = require('http');
const { URL } = require('url');

module.exports = async function handler(req, res) {
  // Always set CORS headers first — OPTIONS preflight must always return 200
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight before any other logic
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Backend URL - use server-side env var only (VITE_ vars are frontend-only)
  const BACKEND_URL = process.env.BACKEND_API_URL || 'http://3.90.162.23:3000';

  if (!BACKEND_URL || BACKEND_URL.includes('vercel.app')) {
    console.error('❌ BACKEND_API_URL not set or pointing to Vercel (loop!)');
    return res.status(500).json({
      error: 'Backend API URL not configured',
      message: 'Set BACKEND_API_URL in Vercel env vars to your EC2 IP (e.g. http://3.90.162.23:3001)'
    });
  }

  try {
    // Extract path - strip /api/backend prefix, support both query param and URL
    let path;
    const urlPath = req.url ? req.url.split('?')[0] : '';
    if (urlPath.startsWith('/api/backend')) {
      path = urlPath.replace('/api/backend', '') || '/health';
    } else if (urlPath.startsWith('/api/proxy')) {
      path = urlPath.replace('/api/proxy', '') || '/health';
    } else {
      const pathArray = Array.isArray(req.query.path) ? req.query.path : (req.query.path ? [req.query.path] : []);
      path = pathArray.length > 0 ? '/' + pathArray.join('/') : '/health';
    }
    const targetUrl = BACKEND_URL + path;

    console.log(`Proxy: ${req.method} ${targetUrl}`);

    // Build body
    let bodyStr;
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Forward request using Node's built-in http/https (no fetch dependency)
    const result = await new Promise((resolve, reject) => {
      const parsed = new URL(targetUrl);
      const lib = parsed.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // Forward Authorization header if present
      if (req.headers.authorization) {
        options.headers['Authorization'] = req.headers.authorization;
        console.log(`[Proxy] Authorization header forwarded`);
      } else {
        console.log(`[Proxy] ⚠️  No Authorization header found`);
      }
      
      if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

      const proxyReq = lib.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => resolve({ status: proxyRes.statusCode, body: data }));
      });
      proxyReq.on('error', reject);
      if (bodyStr) proxyReq.write(bodyStr);
      proxyReq.end();
    });

    // Try to parse as JSON, fall back to text
    let responseData;
    try { responseData = JSON.parse(result.body); }
    catch { responseData = { raw: result.body }; }

    return res.status(result.status).json(responseData);

  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(502).json({ error: 'Proxy failed', message: error.message, backend: BACKEND_URL });
  }
}
