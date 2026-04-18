import { getCorsAllowedOrigins } from './cors-origins.js';

/**
 * Fail fast on misconfigured production deploys.
 * Call after `dotenv/config` (see server `index.ts`).
 */
export function assertProductionRuntimeConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.FRONTEND_URL?.trim()) {
    throw new Error('[server] FRONTEND_URL is required when NODE_ENV=production');
  }
  if (!process.env.GLC_PUBLIC_SITE_URL?.trim()) {
    throw new Error(
      '[server] GLC_PUBLIC_SITE_URL is required when NODE_ENV=production (https origin for crawler UA; no trailing slash)',
    );
  }
  const cors = getCorsAllowedOrigins();
  if (cors.length === 0) {
    throw new Error(
      '[server] CORS allowlist is empty in production: set ALLOWED_ORIGINS and/or FRONTEND_URL (browser credentialed API calls will fail)',
    );
  }
}
