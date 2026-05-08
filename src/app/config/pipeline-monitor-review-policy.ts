/**
 * Consultant review follow-up policy for Pipeline Monitor (static product config).
 * Keeps substantive-note thresholds out of page components.
 * Keep `substantiveNotesCombinedMinTrimChars` aligned with
 * `PIPELINE_CONSULTANT_REVIEW_POLICY` (`server/src/config/pipeline-consultant-review-policy.ts`).
 */

import { plannedExecutionPhaseIdSet } from '../lib/audit-execution-plan';
import { AUTO_WING_IDS } from '../lib/pipeline-monitor-helpers';

export const PIPELINE_MONITOR_REVIEW_POLICY = {
  /**
   * Consultant + interview notes (trimmed), combined character length, before we treat
   * post-review actions as intentional (modal + Strategy re-run trigger).
   */
  substantiveNotesCombinedMinTrimChars: 16,
} as const;

export function reviewNotesMeetSubstantiveMinimum(
  consultantNotes: string | undefined,
  interviewNotes: string | undefined,
): boolean {
  const c = consultantNotes?.trim().length ?? 0;
  const i = interviewNotes?.trim().length ?? 0;
  return c + i >= PIPELINE_MONITOR_REVIEW_POLICY.substantiveNotesCombinedMinTrimChars;
}

/**
 * Domain phases in the auto wing already completed at this review gate that may be re-run
 * (`POST .../pipeline/retry`) without advancing the block first.
 */
export function selectableAutoWingDomainPhasesForReviewRerun(
  meta: { execution_plan?: import('../data/auditTypes').AuditMeta['execution_plan'] } | null | undefined,
  reviewAfterPhase: number,
): number[] {
  const cap = Math.min(Math.max(reviewAfterPhase, 1), 4);
  let phases = AUTO_WING_IDS.filter((p) => p <= cap);
  const planned = meta ? plannedExecutionPhaseIdSet(meta) : null;
  if (planned != null) {
    phases = phases.filter((p) => planned.has(p));
  }
  return phases;
}
