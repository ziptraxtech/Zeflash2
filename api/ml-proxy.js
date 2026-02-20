// ML Backend Proxy - Vercel Serverless Function
// Routes requests to AWS ECS backend with proper CORS handling

export default async function handler(req, res) {
  // Get backend URL from environment variable
  const ML_BACKEND_URL = process.env.VITE_ML_BACKEND_URL || 'http://localhost:8000';
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // In Vercel, req.url is the full path like /api/ml-proxy/api/v1/inference/trigger
    // We need to extract everything after /api/ml-proxy
    let path = req.url || '/';
    
    // Remove /api/ml-proxy prefix if present
    if (path.startsWith('/api/ml-proxy')) {
      path = path.substring('/api/ml-proxy'.length);
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    const targetUrl = `${ML_BACKEND_URL}${path}`;
    
    console.log('🔄 ML Proxy Request:', {
      method: req.method,
      originalUrl: req.url,
      extractedPath: path,
      targetUrl: targetUrl,
      backend: ML_BACKEND_URL,
      hasBody: !!req.body,
      bodyType: typeof req.body
    });

    const options = {
      method: req.method || 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, image/png, */*'
      }
    };
    
    // Handle request body
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      console.log('📦 Request body:', options.body);
    }
    
    const response = await fetch(targetUrl, options);
    
    console.log('📡 Backend response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });
    
    // Handle image responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('image')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(Buffer.from(buffer));
    }
    
    // Handle JSON responses
    const data = await response.json();
    console.log(`✅ Response data:`, data);
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('❌ ML Proxy error:', {
      message: error.message,
      stack: error.stack,
      backend: ML_BACKEND_URL,
      envVarSet: !!process.env.VITE_ML_BACKEND_URL
    });
    return res.status(500).json({ 
      error: 'Cannot reach ML backend server',
      message: error.message,
      backend: process.env.VITE_ML_BACKEND_URL ? 'Configured' : 'Not configured (using localhost fallback)',
      hint: 'Check Vercel environment variable VITE_ML_BACKEND_URL'
    });
  }
}
