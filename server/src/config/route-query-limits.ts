/**
 * List route caps — source of truth: `SYSTEM_DEFAULTS.routeQueries`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const R = SYSTEM_DEFAULTS.routeQueries;

export const NOTIFICATIONS_LIST_DEFAULT_LIMIT = R.notifications.defaultLimit;

export const NOTIFICATIONS_LIST_MAX_LIMIT = R.notifications.maxLimit;

export const NOTIFICATIONS_LIST_MIN_LIMIT = R.notifications.minLimit;

export const DISCOVER_SESSIONS_LIST_MAX = R.discoverSessionsMaxRows;

export const INTAKE_SUBMISSIONS_LIST_MAX = R.intakeSubmissionsMaxRows;

export const PIPELINE_STATUS_EVENTS_LIMIT = R.pipelineStatusEventsLimit;

/** Same object as `auditsList` / `AUDITS_LIST_*` — GET /api/audit-requests. */
export const AUDIT_REQUESTS_LIST_DEFAULT_LIMIT = R.auditRequestsList.defaultLimit;

export const AUDIT_REQUESTS_LIST_MAX_LIMIT = R.auditRequestsList.maxLimit;
