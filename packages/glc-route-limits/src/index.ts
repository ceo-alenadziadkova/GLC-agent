/**
 * Shared API list caps for server `SYSTEM_DEFAULTS` and client fetch params.
 * Single source of truth for route pagination (audits, audit-requests, notifications, etc.).
 */

export const GLC_AUDITS_AND_AUDIT_REQUESTS_LIST = { defaultLimit: 50, maxLimit: 200 } as const;

export const GLC_NOTIFICATIONS_LIST = { defaultLimit: 30, maxLimit: 100, minLimit: 1 } as const;

export const GLC_DISCOVER_SESSIONS_LIST_MAX = 100;

export const GLC_INTAKE_SUBMISSIONS_LIST_MAX = 100;

export const GLC_PIPELINE_STATUS_EVENTS_LIMIT = 50;
