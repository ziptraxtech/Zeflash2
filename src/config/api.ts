// API Configuration
// DEV: http://localhost:3000
// PROD: Uses Vercel API proxy (HTTPS) to avoid mixed content errors
// The proxy forwards requests to the EC2 backend
export const API_URL = import.meta.env.DEV 
  ? 'http://localhost:3000' 
  : (import.meta.env.VITE_API_BASE || '/api/backend');

export const buildReportImageUrl = (
  deviceId: string,
  filename = 'battery_health_report.png'
) => `${API_URL}/api/reports/${encodeURIComponent(deviceId)}/${encodeURIComponent(filename)}`;

export const resolveReportImageUrl = (
  rawUrl: string | null | undefined,
  deviceId: string,
  filename = 'battery_health_report.png'
) => {
  const fallback = buildReportImageUrl(deviceId, filename);

  if (!rawUrl) {
    return fallback;
  }

  if (rawUrl.startsWith('/')) {
    return rawUrl.endsWith('.png')
      ? `${API_URL}${rawUrl}`
      : `${API_URL}${rawUrl}${rawUrl.endsWith('/') ? '' : '/'}${filename}`;
  }

  try {
    const parsed = new URL(rawUrl);
    const path = parsed.pathname;

    if (parsed.hostname.includes('amazonaws.com')) {
      if (path.endsWith('.png')) {
        return filename === 'battery_health_report.png'
          ? `${parsed.origin}${path}`
          : `${parsed.origin}${path.replace(/[^/]+$/, filename)}`;
      }

      return `${parsed.origin}${path}${path.endsWith('/') ? '' : '/'}${filename}`;
    }

    const match = path.match(/(?:battery-reports|reports)\/([^/]+)\/([^/?#]+)/i);
    if (match) {
      const [, matchedDeviceId, matchedFilename] = match;
      return buildReportImageUrl(
        matchedDeviceId,
        filename === 'battery_health_report.png' ? matchedFilename : filename
      );
    }

    if (path.endsWith('.png')) {
      return `${parsed.origin}${path}`;
    }

    return `${parsed.origin}${path}${path.endsWith('/') ? '' : '/'}${filename}`;
  } catch {
    return fallback;
  }
};
