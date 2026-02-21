import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { evse_id, connector_id, limit = 60 } = req.body;

    if (!evse_id) {
      return res.status(400).json({ error: 'evse_id is required' });
    }

    // For demo: return a placeholder response
    // In production, this should call your Lambda/ECS service
    if (evse_id === '032300130C03065' && connector_id === 2) {
      return res.status(200).json({
        image_url: 'https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/032300130C03065_2/battery_health_report.png',
        s3_url: 'https://battery-ml-results-test.s3.us-east-1.amazonaws.com/battery-reports/032300130C03065_2/battery_health_report.png',
        device_id: `${evse_id}_${connector_id}`,
        status: 'Immediate Action Required',
        anomalies: {
          critical: 0,
          high: 56,
          medium: 0,
          low: 0
        },
        generated_at: '2026-01-14T17:49:49Z',
        data_points: 60
      });
    }

    // For other EVSEs, call the actual inference service
    // Get fresh token
    const tokenRes = await fetch('https://cms.charjkaro.in/admin/api/v1/zipbolt/token');
    if (!tokenRes.ok) {
      throw new Error('Failed to get authorization token');
    }
    const tokenData = await tokenRes.json();
    const token = tokenData.token;

    // TODO: Call your deployed Lambda/ECS inference endpoint
    // const lambdaUrl = process.env.INFERENCE_API_URL;
    // For now, return error for other EVSEs
    
    return res.status(501).json({ 
      error: 'Inference service not yet deployed for this EVSE. Currently only supports 032300130C03065 connector 2.' 
    });

  } catch (error: any) {
    console.error('Generate report error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate report' 
    });
  }
}
