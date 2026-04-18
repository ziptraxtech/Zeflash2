// Vercel API Proxy for Backend
// Forwards all /api/backend/* requests to EC2 backend
// This prevents mixed content errors (HTTPS -> HTTP)

module.exports = async (req, res) => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://3.90.162.23:3000';
  
  // Get the path from the catch-all route
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
  
  // Build the full URL to the backend
  const url = `${BACKEND_URL}/${path}`;
  
  console.log(`[Proxy] ${req.method} ${url}`);
  
  try {
    // Forward the request to the backend
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers if present
        ...(req.headers.authorization && {
          'Authorization': req.headers.authorization
        }),
        // Forward other important headers
        ...Object.keys(req.headers)
          .filter(key => !['host', 'connection'].includes(key))
          .reduce((acc, key) => {
            acc[key] = req.headers[key];
            return acc;
          }, {})
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
    console.error(`[Proxy Error] ${error}`);
    res.status(502).json({
      error: 'Failed to reach backend server',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
