import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND = process.env.EC2_BACKEND_URL!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${BACKEND}/reports`, {
      method: 'GET',
      headers: {
        'Authorization': (req.headers.authorization as string) || '',
      },
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Backend unreachable', detail: err.message });
  }
}
