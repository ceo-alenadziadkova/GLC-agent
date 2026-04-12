/**
 * Supabase REST fallback when the JS client fails (pipeline error path).
 * Table names and path suffix match PostgREST conventions.
 */

export const SUPABASE_REST_V1_SUFFIX = '/rest/v1';

export const PIPELINE_EVENTS_TABLE = 'pipeline_events';

export const AUDITS_TABLE = 'audits';

export const PIPELINE_PHASE_ERROR_DEFAULT_MESSAGE = 'Phase failed unexpectedly';

export const PIPELINE_PHASE_NOTIFICATION_FALLBACK_MESSAGE = 'Pipeline phase failed unexpectedly';
