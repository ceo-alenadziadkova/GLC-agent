/**
 * TanStack Query defaults for the SPA. Imported by `glc-query-client-defaults.ts`.
 */

export const GLC_QUERY_DEFAULT_RETRY_DEFAULT = 1;

export const GLC_QUERY_STALE_TIME_MS_DEFAULT = 120_000;
export const GLC_QUERY_STALE_TIME_MS_BRIEF = 60_000;
/** Notifications center list query. */
export const GLC_QUERY_STALE_TIME_MS_NOTIFICATIONS = 90_000;
/** Admin snapshot batch list (heavy fetch). */
export const GLC_QUERY_STALE_TIME_MS_ADMIN_SNAPSHOT_QUEUE = 180_000;
/** Admin request queue, discovery queue — infrequently changing lists. */
export const GLC_QUERY_STALE_TIME_MS_LONG_ADMIN_LISTS = 300_000;

export const GLC_QUERY_GC_TIME_MS_DEFAULT = 900_000;
