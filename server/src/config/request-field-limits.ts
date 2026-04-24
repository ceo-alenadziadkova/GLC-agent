/**
 * Truncation and validation length limits for HTTP bodies and stored request metadata.
 * Static product config — use the same symbols in routes and Zod schemas to avoid drift.
 */

import { REVIEW_GATE_NOTES_MAX } from '@glc/intake-core';

export const REQUEST_FIELD_LIMITS = {
  marketingNameMax: 200,
  marketingCompanyMax: 200,
  marketingWebsiteMax: 500,
  marketingLongTextMax: 2000,
  marketingUrgencyMax: 120,
  marketingContactMethodMax: 200,

  clientNotesMax: 2000,
  /** Approve/reject notes on audit-requests (short). */
  consultantNoteMax: 1000,
  /** Quality-gate review approval: consultant_notes + interview_notes (see REVIEW_GATE_NOTES_MAX in intake-core). */
  reviewGateNotesMax: REVIEW_GATE_NOTES_MAX,

  logSourceMax: 64,
  logMessageMax: 4000,

  /** Stored User-Agent column and guest UTM-like fields */
  storedUserAgentMax: 512,

  /** Intake trace / analytics `question_id` */
  traceQuestionIdMax: 64,

  /** Intake analytics `step_index` upper bound */
  intakeAnalyticsStepIndexMax: 500,

  /** Intake analytics — diagnostic pilot `signal_key` on events */
  intakeAnalyticsSignalKeyMax: 48,

  /** Intake analytics — `transition_rule_ref` (pilot sequencing / rule id) */
  intakeAnalyticsTransitionRuleRefMax: 120,

  /** Intake analytics — max `trace_codes` entries per event */
  intakeAnalyticsTraceCodesMax: 12,

  /** Intake analytics — max bank ids in `next_recommended` snapshot on an event */
  intakeAnalyticsNextRecommendedMaxIds: 80,

  /**
   * Intake trace tool: max wording draft keys per PUT and max `question_ids` per publish/rollback batch.
   */
  intakeTraceToolWordingOperationMaxKeys: 500,

  idempotencyKeyMax: 128,

  /** Short audit id prefix in operator notifications (not a secret) */
  notificationAuditIdPrefixLen: 8,

  /** Free snapshot API: max issues / quick_wins returned in preview payload */
  freeSnapshotPreviewItemsMax: 2,

  /**
   * After `ensureHttpsUrl`, reject obviously too-short strings before async public-URL validation
   * (legacy heuristic; prefer growing this only with product input).
   */
  auditCompanyUrlMinNormalizedLength: 10,
} as const;

export type RequestFieldLimits = typeof REQUEST_FIELD_LIMITS;
