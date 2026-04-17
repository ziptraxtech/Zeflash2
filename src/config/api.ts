// API configuration - uses the local backend in development and the Vercel proxy in production.
const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:3001' : '/api/backend';

export const API_URL = (configuredApiUrl || defaultApiUrl).replace(/\/$/, '');

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
