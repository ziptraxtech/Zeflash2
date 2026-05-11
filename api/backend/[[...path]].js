// Vercel API Proxy for Backend
// Forwards all /api/backend/* requests to EC2 backend
// ML inference runs on ECS, backend services on EC2

// Helper to parse request body in Vercel serverless
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
        // Try to parse as JSON
        resolve(JSON.parse(body));
      } catch (e) {
        // If not JSON, return as string
        resolve(body);
      }
    });
    
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://3.90.162.23:3001';
    
    // Extract path from URL pathname
    // In Vercel catch-all routes, req.url includes the dynamic parameters
    // We need to extract just the path part before any Vercel-added query params
    let path = req.url || '';
    
    // Remove Vercel catch-all parameters like ?[...path]=...
    path = path.replace(/\?\[\.\.\.path\]=[^&]*/g, '');
    
    // Remove the /api/backend prefix
    if (path.startsWith('/api/backend/')) {
      path = path.substring('/api/backend'.length);
    } else if (path.startsWith('/api/backend')) {
      path = path.substring('/api/backend'.length) || '/';
    }
    
    // Clean up any remaining double slashes
    path = path.replace(/^\/+/, '/');
    
    // Build the full URL (query string already preserved)
    const url = `${BACKEND_URL}${path}`;
    
    console.log(`[Backend Proxy] ${req.method} ${url}`);
    let body;
    let parsedBody;
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Try req.body first (if already parsed by middleware)
      if (req.body) {
        if (typeof req.body === 'string') {
          body = req.body;
          parsedBody = req.body;
        } else if (Buffer.isBuffer(req.body)) {
          body = req.body.toString('utf-8');
          parsedBody = body;
        } else if (typeof req.body === 'object') {
          parsedBody = req.body;
          body = JSON.stringify(req.body);
        }
        console.log(`[Backend Proxy] Body already parsed:`, parsedBody);
      } else {
        // If req.body is undefined, try to parse from stream
        console.log(`[Backend Proxy] ℹ️  req.body is undefined, attempting to parse request stream...`);
        parsedBody = await parseBody(req);
        
        if (parsedBody) {
          if (typeof parsedBody === 'string') {
            body = parsedBody;
          } else {
            body = JSON.stringify(parsedBody);
          }
          console.log(`[Backend Proxy] Parsed body from stream:`, parsedBody);
        } else {
          console.log(`[Backend Proxy] ⚠️  No body found in request`);
        }
      }
    }
    
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
    
    // Forward request to backend
    console.log(`[Backend Proxy] Sending to ${url} with body: ${body ? 'yes' : 'no'}`);
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
    console.error(`[Backend Proxy Error]`, error.message, error.stack);
    res.status(502).json({
      error: 'Backend service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

// Force rebuild: 2026-05-11 10:59:28
