import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const EC2_URL = 'http://3.90.162.23:3001';
  
  try {
    const response = await fetch(`${EC2_URL}/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    res.status(response.status);
    if (contentType.includes('application/json')) {
      try {
        return res.json(text ? JSON.parse(text) : {});
      } catch {
        return res.json({ error: 'Invalid JSON from upstream', raw: text.slice(0, 500) });
      }
    }

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    return res.send(text);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy failed' });
  }
}
