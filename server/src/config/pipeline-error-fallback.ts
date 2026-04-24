/**
 * Supabase REST fallback when the JS client fails (pipeline error path).
 * Table names and path suffix match PostgREST conventions.
 */

import { PIPELINE_AUDIT_ORCHESTRATOR_STATUS } from './pipeline-status.js';

export const SUPABASE_REST_V1_SUFFIX = '/rest/v1';

export const PIPELINE_EVENTS_TABLE = 'pipeline_events';

export const AUDITS_TABLE = 'audits';

/** Stored on `pipeline_events.data.source` for observability (durable error path). */
export const PIPELINE_PHASE_ERROR_DATA_SOURCE = {
  phaseErrorDurable: 'phase_error_durable',
  fallbackRest: 'fallback_rest',
} as const;

/** Keys and payload strings for `emitStructuredNotification` when a phase crashes (emitPhaseErrorDurable). */
export const PIPELINE_PHASE_FAILED_NOTIFICATION_KEYS = {
  structuredEvent: 'pipeline_phase_failed',
  auditStatus: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.failed,
  actorRole: 'system',
  failureType: 'phase_failed',
} as const;

/** Logger / ops metadata when primary Supabase write fails and REST fallback runs. */
export const PIPELINE_ERROR_LOG_FALLBACK = {
  supabaseRest: 'supabase_rest',
} as const;
