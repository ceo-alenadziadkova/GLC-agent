/**
 * Explicit CORS allowlist. Comma-separated full origins (scheme + host + optional port).
 * Example: https://www.example.com,https://example.com
 */
import { GLC_DEV_CORS_EXTRA_ORIGINS, GLC_DEV_SPA_ORIGIN } from '@glc/dev-brand-defaults';

const DEFAULT_DEV_ORIGINS = [GLC_DEV_SPA_ORIGIN, ...GLC_DEV_CORS_EXTRA_ORIGINS] as const;

function normalizeOrigin(o: string): string {
  const t = o.trim();
  return t.endsWith('/') ? t.slice(0, -1) : t;
}

function parseCommaSeparatedOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const parts = raw.split(',').map((s) => normalizeOrigin(s)).filter(Boolean);
  return [...new Set(parts)];
}

/**
 * Origins allowed for browser cross-origin requests with credentials.
 * Production: ALLOWED_ORIGINS plus FRONTEND_URL (deduped). If both unset, list is empty (fail closed for CORS).
 * Development: defaults above plus ALLOWED_ORIGINS and FRONTEND_URL (for local prod-like checks).
 */
export function getCorsAllowedOrigins(): string[] {
  const fromAllowList = parseCommaSeparatedOrigins(process.env.ALLOWED_ORIGINS);
  const frontendRaw = process.env.FRONTEND_URL?.trim();
  const frontend = frontendRaw ? normalizeOrigin(frontendRaw) : undefined;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const set = new Set<string>(fromAllowList);
    if (frontend) set.add(frontend);
    return [...set];
  }

  const set = new Set<string>([...DEFAULT_DEV_ORIGINS, ...fromAllowList]);
  if (frontend) set.add(frontend);
  return [...set];
}
