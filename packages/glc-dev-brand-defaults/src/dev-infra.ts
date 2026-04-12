/**
 * Local development infrastructure defaults (ports, CORS). Not product copy.
 */

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
