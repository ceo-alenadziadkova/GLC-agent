const FALLBACK_API_URL = 'http://localhost:3001';

/**
 * Normalize API base URL from env and guard against missing protocol.
 * If VITE_API_URL is configured as "host.tld" (without https://), browsers
 * treat fetch targets as relative paths ("/host.tld/..."), which breaks API calls.
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL ?? FALLBACK_API_URL).trim();
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return `https://${raw.replace(/^\/+|\/+$/g, '')}`;
}
