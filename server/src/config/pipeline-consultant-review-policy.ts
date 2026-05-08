/**
 * Consultant review policy defaults (server).
 * Keep `substantiveNotesCombinedMinTrimChars` aligned with
 * `PIPELINE_MONITOR_REVIEW_POLICY.substantiveNotesCombinedMinTrimChars` in
 * `src/app/config/pipeline-monitor-review-policy.ts`. The threshold is enforced in the Pipeline
 * Monitor SPA today; this module is the server-side single source for future API hints or logging.
 */
export const PIPELINE_CONSULTANT_REVIEW_POLICY = {
  substantiveNotesCombinedMinTrimChars: 16,
} as const;
