/**
 * Default batching for client-side analytics POSTs (discovery, brief wizard, trace tool).
 * Tune in this module; values are static config (no `VITE_*`).
 */

export const CLIENT_ANALYTICS_FLUSH_MS_DEFAULT = 3200;
export const CLIENT_ANALYTICS_MAX_BATCH_DEFAULT = 24;

/** Debounce for `GET /brief` execution-readiness refresh (New Audit wizard step 1). */
export const BRIEF_EXECUTION_DIAGNOSTIC_DEBOUNCE_MS = 450;
