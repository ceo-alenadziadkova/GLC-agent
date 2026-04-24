/**
 * Display limits for client post-audit cockpit (no magic numbers in TSX).
 */

export const CLIENT_POST_AUDIT_COCKPIT_UI = {
  executiveSummaryPreviewMaxChars: 360,
  /** Client cockpit timeline hint query — align with light polling, not hot reload. */
  timelineStatusQueryStaleTimeMs: 60_000,
} as const;
