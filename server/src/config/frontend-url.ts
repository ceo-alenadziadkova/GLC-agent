const DEV_FALLBACK = 'http://localhost:5173';

/**
 * Base URL for absolute intake links (no trailing slash).
 * In production, FRONTEND_URL must be set (also enforced at process startup).
 */
export function resolveFrontendBaseUrl(): string {
  const raw = process.env.FRONTEND_URL?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_URL is required when NODE_ENV=production');
  }
  return DEV_FALLBACK.replace(/\/+$/, '');
}
