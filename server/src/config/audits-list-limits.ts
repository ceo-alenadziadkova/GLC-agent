/**
 * GET /api/audits pagination defaults.
 * Source of truth: `SYSTEM_DEFAULTS.auditsList`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const A = SYSTEM_DEFAULTS.auditsList;

export const AUDITS_LIST_DEFAULT_LIMIT = A.defaultLimit;

export const AUDITS_LIST_MAX_LIMIT = A.maxLimit;
