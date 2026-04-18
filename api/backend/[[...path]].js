// Vercel API Proxy for Backend
// Forwards all /api/backend/* requests to EC2 backend

module.exports = async (req, res) => {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://3.90.162.23:3001';
    
    // Extract path from URL pathname
    // req.url format: /api/backend/credits?param=value
    // We need to get just: /credits
    let path = req.url || '';
    
    // Remove the /api/backend prefix
    if (path.startsWith('/api/backend/')) {
      path = path.substring('/api/backend'.length);
    } else if (path.startsWith('/api/backend')) {
      path = path.substring('/api/backend'.length) || '/';
    }
    
    // Remove query string if present
    const [pathOnly, queryString] = path.split('?');
    
    // Build the full URL
    const url = queryString 
      ? `${BACKEND_URL}${pathOnly}?${queryString}` 
      : `${BACKEND_URL}${pathOnly}`;
    
    console.log(`[Backend Proxy] ${req.method} ${url}`);
    
    // Prepare request body
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    // Forward request to backend
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
    console.error(`[Backend Proxy Error]`, error);
    res.status(502).json({
      error: 'Backend service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};
