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

  // If URL already starts with /api/, it's already a full API path
  // Don't add API_URL prefix (it will be added by buildReportImageUrl or this logic)
  if (rawUrl.startsWith('/api/')) {
    // In dev: /api/reports/... goes directly to localhost:3000/api/reports/...
    // In prod: /api/reports/... becomes /api/backend/api/reports/... via Vercel proxy
    // So we still need to add API_URL, but we need to check if it's already included
    
    // If API_URL ends with '/api/backend', and rawUrl starts with '/api/', we have overlap
    if (API_URL.endsWith('/api/backend') && rawUrl.startsWith('/api/')) {
      // This will create /api/backend/api/reports/... which is correct
      return `${API_URL}${rawUrl}`;
    } else if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) {
      // Full URL API_URL, just append
      return `${API_URL}${rawUrl}`;
    } else {
      // Relative API_URL like /api/backend
      return `${API_URL}${rawUrl}`;
    }
  }

  if (rawUrl.startsWith('/')) {
    // Relative path (like /reports/...) - add API_URL prefix
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
