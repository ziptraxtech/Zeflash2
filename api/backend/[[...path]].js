// Vercel API Proxy for Backend
// Forwards all /api/backend/* requests to EC2 backend
// ML inference runs on ECS, backend services on EC2

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
    
    // Remove query string if present (we'll add it back to the full URL)
    const [pathOnly, queryString] = path.split('?');
    
    // Build the full URL
    const url = queryString 
      ? `${BACKEND_URL}${pathOnly}?${queryString}` 
      : `${BACKEND_URL}${pathOnly}`;
    
    console.log(`[Backend Proxy] ${req.method} ${url}`);
    console.log(`[Backend Proxy] Request body:`, JSON.stringify(req.body));
    
    // Prepare request headers - preserve Authorization and Content-Type
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Copy over important headers from the original request
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    if (req.headers['x-forwarded-for']) {
      headers['x-forwarded-for'] = req.headers['x-forwarded-for'];
    }
    
    // Prepare request body
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Handle both string and object bodies
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      console.log(`[Backend Proxy] Forwarding body: ${body}`);
    }
    
    // Forward request to backend
    const response = await fetch(url, {
      method: req.method,
      headers: headers,
      body: body,
      timeout: 30000
    });

    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Pass through status and data as-is (no wrapping)
    res.status(response.status);
    
    if (typeof responseData === 'string') {
      res.send(responseData);
    } else {
      res.json(responseData);
    }
  } catch (error) {
    console.error(`[Backend Proxy Error]`, error);
    res.status(502).json({
      error: 'Backend service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};
