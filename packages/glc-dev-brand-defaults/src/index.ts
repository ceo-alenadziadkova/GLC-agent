/**
 * Single source for GLC development-only brand defaults (public site origin + contact email).
 * Forks or white-label installs change values here (or override via production env vars).
 */

/** Persisted `audits.company_url` when the client has no public site (dev default; override with NO_PUBLIC_WEBSITE_URL in production Node). */
export const GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL =
  'https://glc-audit.placeholder/no-public-website' as const;

export const GLC_DEV_BRAND_ORIGIN = 'https://glctech.es' as const;

export const GLC_DEV_SUPPORT_EMAIL = 'contact@glctech.es' as const;

/** Local API server (Express) — keep in sync with `PORT` default and Vite `/api` proxy. */
export const GLC_DEV_API_PORT = 3001 as const;
export const GLC_DEV_API_ORIGIN = `http://localhost:${GLC_DEV_API_PORT}` as const;

/** Vite dev server default. */
export const GLC_DEV_SPA_PORT = 5173 as const;
export const GLC_DEV_SPA_ORIGIN = `http://localhost:${GLC_DEV_SPA_PORT}` as const;

/**
 * Playwright / e2e use loopback host so the dev server binds predictably.
 * Prefer `GLC_DEV_SPA_ORIGIN` for CORS and human-facing dev URLs.
 */
export const GLC_DEV_SPA_HOST_FOR_E2E = '127.0.0.1' as const;
export const GLC_DEV_SPA_ORIGIN_E2E = `http://${GLC_DEV_SPA_HOST_FOR_E2E}:${GLC_DEV_SPA_PORT}` as const;

/** Additional browser origins merged into server CORS allowlist in development. */
export const GLC_DEV_CORS_EXTRA_ORIGINS = ['http://localhost:5174', 'http://localhost:3000'] as const;

export {
  GLC_DEV_BRAND_NAME,
  GLC_DEV_BRAND_LEGAL_LINE,
  GLC_DEV_MARKETING_FOOTER_EN,
  type MarketingFooterCopyEn,
} from './marketing-footer-en.js';
