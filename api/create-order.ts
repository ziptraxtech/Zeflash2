import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND = process.env.EC2_BACKEND_URL || 'http://3.90.162.23:3001';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(`${BACKEND}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization || '' },
      body: JSON.stringify(req.body),
    });
    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text.slice(0, 300) };
      }
    }
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Backend unreachable', detail: err.message });
  }
}
