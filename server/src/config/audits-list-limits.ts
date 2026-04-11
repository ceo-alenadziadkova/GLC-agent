/**
 * GET /api/audits pagination defaults (env-tunable).
 */

import { parsePositiveIntFromEnv } from './rate-limits.js';
import { SYSTEM_DEFAULTS } from './system-defaults.js';

const A = SYSTEM_DEFAULTS.auditsList;

export const AUDITS_LIST_DEFAULT_LIMIT = parsePositiveIntFromEnv(
  process.env.AUDITS_LIST_DEFAULT_LIMIT,
  A.defaultLimit,
);

export const AUDITS_LIST_MAX_LIMIT = parsePositiveIntFromEnv(process.env.AUDITS_LIST_MAX_LIMIT, A.maxLimit);
