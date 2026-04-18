// Vercel API Proxy for Backend
// Forwards all /api/backend/* requests to EC2 backend

module.exports = async (req, res) => {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://3.90.162.23:3001';
    
    // Get the path from the catch-all route
    let path = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
    
    // Remove leading slash if present
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    // Build query string, excluding the 'path' parameter
    const queryParams = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value);
        }
      }
    });
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${BACKEND_URL}/${path}?${queryString}` 
      : `${BACKEND_URL}/${path}`;
    
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
