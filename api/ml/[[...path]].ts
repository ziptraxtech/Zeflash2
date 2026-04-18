// Vercel API Proxy for ML Backend
// Forwards all /api/ml/* requests to ECS ALB

module.exports = async (req, res) => {
  try {
    const ML_URL = process.env.ML_API_URL || 'http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com';
    
    // Get the path from the catch-all route
    let path = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
    
    // Remove leading slash if present
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    // Build the full URL, preserving query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const url = queryString 
      ? `${ML_URL}/${path}?${queryString}` 
      : `${ML_URL}/${path}`;
    
    console.log(`[ML Proxy] ${req.method} ${url}`);
    
    // Prepare request body
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    // Forward request to ML backend
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...Object.keys(req.headers)
          .filter(key => !['host', 'connection', 'content-length'].includes(key.toLowerCase()))
          .reduce((acc, key) => {
            acc[key] = req.headers[key];
            return acc;
          }, {})
      },
      body: body,
      timeout: 30000
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
    console.error(`[ML Proxy Error]`, error);
    res.status(502).json({
      error: 'ML service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};
