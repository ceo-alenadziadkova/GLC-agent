/**
 * Default batching for client-side analytics POSTs (discovery, brief wizard, trace tool).
 * Optional Vite env overrides live next to each consumer (`VITE_*`).
 */

export const CLIENT_ANALYTICS_FLUSH_MS_DEFAULT = 3200;
export const CLIENT_ANALYTICS_MAX_BATCH_DEFAULT = 24;
