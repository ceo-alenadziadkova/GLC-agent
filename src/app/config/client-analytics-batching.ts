/**
 * Default batching for client-side analytics POSTs (discovery, brief wizard, trace tool).
 * Tune in this module; values are static config (no `VITE_*`).
 */

export const CLIENT_ANALYTICS_FLUSH_MS_DEFAULT = 3200;
export const CLIENT_ANALYTICS_MAX_BATCH_DEFAULT = 24;

/** Debounce for `GET /brief` execution-readiness refresh (New Audit wizard step 1). */
export const BRIEF_EXECUTION_DIAGNOSTIC_DEBOUNCE_MS = 450;

/**
 * Max `next_recommended` ids per analytics event batch row.
 * Keep aligned with `REQUEST_FIELD_LIMITS.intakeAnalyticsNextRecommendedMaxIds` on the server.
 */
export const BRIEF_ANALYTICS_NEXT_RECOMMENDED_IDS_MAX = 80;
