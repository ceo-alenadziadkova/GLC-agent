/**
 * Machine `error_code` values written to `pipeline_events.data` by the orchestrator.
 * Keep in sync with consumers (dashboards, alerts); not HTTP API `code` (see API_ERROR_CODES).
 */

export const PIPELINE_EVENT_ERROR_CODES = {
  ALL_PARALLEL_PHASES_FAILED: 'ALL_PARALLEL_PHASES_FAILED',
  SNAPSHOT_AT_CAPACITY: 'SNAPSHOT_AT_CAPACITY',
  FREE_SNAPSHOT_FAILED: 'FREE_SNAPSHOT_FAILED',
} as const;

export type PipelineEventErrorCode =
  (typeof PIPELINE_EVENT_ERROR_CODES)[keyof typeof PIPELINE_EVENT_ERROR_CODES];
