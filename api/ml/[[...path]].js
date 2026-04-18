// Vercel API Proxy for ML Backend
// Forwards all /api/ml/* requests to ECS ALB

module.exports = async (req, res) => {
  try {
    const ML_URL = process.env.ML_API_URL || 'http://zeflash-ml-alb-2095066601.us-east-1.elb.amazonaws.com';
    
    // Extract path from URL pathname
    // req.url format: /api/ml/inference?param=value
    // We need to get just: /inference
    let path = req.url || '';
    
    // Remove the /api/ml prefix
    if (path.startsWith('/api/ml/')) {
      path = path.substring('/api/ml'.length);
    } else if (path.startsWith('/api/ml')) {
      path = path.substring('/api/ml'.length) || '/';
    }
    
    // Remove query string if present
    const [pathOnly, queryString] = path.split('?');
    
    // Build the full URL
    const url = queryString 
      ? `${ML_URL}${pathOnly}?${queryString}` 
      : `${ML_URL}${pathOnly}`;
    
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
