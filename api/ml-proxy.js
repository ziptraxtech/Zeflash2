// ML Backend Proxy - Supports local and production environments
// Switches based on environment variables during build time or runtime

const getMLBackendUrl = () => {
  // Check if we're in development mode
  const isDev = import.meta.env.DEV;
  const envBackendUrl = import.meta.env.VITE_ML_BACKEND_URL;
  
  if (isDev && (!envBackendUrl || envBackendUrl === 'auto')) {
    // Local development - use localhost
    return 'http://localhost:8000';
  }
  
  if (envBackendUrl) {
    return envBackendUrl;
  }
  
  // Production - use AWS load balancer
  return 'http://battery-ml-alb-1652817744.us-east-1.elb.amazonaws.com';
};

const ML_BACKEND_URL = getMLBackendUrl();

console.log(`🚀 ML Backend configured: ${ML_BACKEND_URL}`);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const path = req.query.path || '';
    const url = `${ML_BACKEND_URL}${path}`;
    
    console.log('🔄 Proxy:', req.method, url);

    const options = {
      method: req.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (req.method === 'POST' && req.body) {
      options.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`✅ Response status: ${response.status}`);
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      error: 'Proxy failed',
      message: error.message 
    });
  }
}

export { ML_BACKEND_URL };
