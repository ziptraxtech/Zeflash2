// Catch-all Vercel API proxy for direct /api/* requests
// Handles any /api/* requests not matched by specific handlers
// Forwards to EC2 backend on port 3001

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      if (!body) {
        resolve(undefined);
        return;
      }
      
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve(body);
      }
    });
    
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://3.90.162.23:3001';
    
    // Extract path - req.url format: /api/reports/...
    let path = req.url || '';
    
    // Remove query string
    const [pathOnly, queryString] = path.split('?');
    
    // Build the full URL
    const url = queryString 
      ? `${BACKEND_URL}${pathOnly}?${queryString}` 
      : `${BACKEND_URL}${pathOnly}`;
    
    console.log(`[API Catch-all Proxy] ${req.method} ${url}`);
    
    // Prepare request body
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        // Try to parse from stream
        const parsedBody = await parseBody(req);
        if (parsedBody) {
          body = typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody);
        }
      }
    }
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    
    // Forward request
    const response = await fetch(url, {
      method: req.method,
      headers: headers,
      body: body || undefined,
      timeout: 30000
    });

    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else if (contentType?.includes('image')) {
      // For images, return as binary
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(Buffer.from(buffer));
    } else {
      responseData = await response.text();
    }

    res.status(response.status);
    
    if (typeof responseData === 'string') {
      res.send(responseData);
    } else {
      res.json(responseData);
    }
  } catch (error) {
    console.error(`[API Catch-all Proxy Error]`, error.message);
    res.status(502).json({
      error: 'Backend service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
