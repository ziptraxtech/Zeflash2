import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND = process.env.EC2_BACKEND_URL!;

export const config = { api: { bodyParser: false } };

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rawBody = await getRawBody(req);
    const response = await fetch(`${BACKEND}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': (req.headers['x-razorpay-signature'] as string) || '',
      },
      body: rawBody,
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Backend unreachable', detail: err.message });
  }
}
