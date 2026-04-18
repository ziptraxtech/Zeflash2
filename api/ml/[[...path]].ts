// Vercel API Proxy for ML Backend
// Forwards all /api/ml/* requests to ECS ALB
// This prevents mixed content errors (HTTPS -> HTTP)

export default async function handler(req, res) {
  const ML_URL = process.env.ML_API_URL || 'http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com';
  
  // Get the path from the catch-all route
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
  
  // Build the full URL to the ML backend
  const url = `${ML_URL}/${path}`;
  
  console.log(`[ML Proxy] ${req.method} ${url}`);
  
  try {
    // Forward the request to the ML backend
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers if present
        ...(req.headers.authorization && {
          'Authorization': req.headers.authorization
        }),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });

    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    res.status(response.status).json({
      status: response.status,
      data
    });
  } catch (error) {
    console.error(`[ML Proxy Error] ${error}`);
    res.status(502).json({
      error: 'Failed to reach ML server',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
