// ML Backend Proxy - Vercel Serverless Function (Catch-all Route)
// Handles /api/ml-proxy/* requests and forwards to AWS ECS backend

export default async function handler(req, res) {
  // Get backend URL from environment variable
  // Try ML_BACKEND_URL first (runtime), then VITE_ML_BACKEND_URL (build-time fallback)
  const ML_BACKEND_URL = process.env.ML_BACKEND_URL || process.env.VITE_ML_BACKEND_URL || 'http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com';
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract path from query params (Vercel catch-all route)
    // For /api/ml-proxy/api/v1/inference/trigger
    // req.query.path will be ['api', 'v1', 'inference', 'trigger']
    const pathArray = req.query.path || [];
    const path = Array.isArray(pathArray) && pathArray.length > 0
      ? '/' + pathArray.join('/')
      : '/health';
    
    const targetUrl = `${ML_BACKEND_URL}${path}`;
    
    console.log('🔄 ML Proxy (Catch-all):', {
      method: req.method,
      pathArray: pathArray,
      extractedPath: path,
      targetUrl: targetUrl,
      backend: ML_BACKEND_URL,
      envML_BACKEND_URL: !!process.env.ML_BACKEND_URL,
      envVITE_ML_BACKEND_URL: !!process.env.VITE_ML_BACKEND_URL,
      hasBody: !!req.body
    });

    // Prepare fetch options
    const options = {
      method: req.method,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, image/png, */*'
      }
    };
    
    // Handle request body for POST/PUT
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      console.log('📦 Forwarding body:', options.body);
    }
    
    // Forward request to backend
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
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      return res.status(response.status).json({
        error: 'Backend request failed',
        status: response.status,
        statusText: response.statusText,
        details: errorText
      });
    }
    
    const data = await response.json();
    console.log('✅ Success:', data);
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('❌ Proxy error:', {
      message: error.message,
      stack: error.stack,
      backend: ML_BACKEND_URL,
      envML_BACKEND_URL: !!process.env.ML_BACKEND_URL,
      envVITE_ML_BACKEND_URL: !!process.env.VITE_ML_BACKEND_URL
    });
    
    return res.status(500).json({ 
      error: 'ML Proxy Failed',
      message: error.message,
      backend: process.env.ML_BACKEND_URL || process.env.VITE_ML_BACKEND_URL
        ? 'Configured (ALB)' 
        : 'Using hardcoded default',
      hint: process.env.ML_BACKEND_URL || process.env.VITE_ML_BACKEND_URL
        ? 'Check if ALB is accessible and ECS service is running'
        : 'Set ML_BACKEND_URL in Vercel environment variables'
    });
  }
}
