import { GLC_DEV_API_ORIGIN } from '@glc/dev-brand-defaults';

const DEV_FALLBACK_API_URL = GLC_DEV_API_ORIGIN;

/**
 * Normalize API base URL from env and guard against missing protocol.
 * If VITE_API_URL is configured as "host.tld" (without https://), browsers
 * treat fetch targets as relative paths ("/host.tld/..."), which breaks API calls.
 */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  const trimmed = (typeof fromEnv === 'string' ? fromEnv : '').trim();
  if (import.meta.env.PROD && !trimmed) {
    throw new Error('VITE_API_URL is required in production builds');
  }
  const raw = trimmed || DEV_FALLBACK_API_URL;
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return `https://${raw.replace(/^\/+|\/+$/g, '')}`;
}
