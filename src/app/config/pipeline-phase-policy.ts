import { REVIEW_AFTER_PHASES_FULL } from '../lib/pipeline-monitor-helpers';

/**
 * Strategy synthesis phase index and Gate 3 `after_phase` (full audits).
 * Taken as the last full-audit review gate (highest phase), matching
 * `server/src/config/audit-phase-constants.ts` (`REVIEW_AFTER_PHASES`) and
 * `server/src/config/pipeline-phases.ts` (`PIPELINE_MAX_PHASE_INDEX`).
 */
const FULL_REVIEW_GATES = REVIEW_AFTER_PHASES_FULL;
const lastReviewGatePhase = FULL_REVIEW_GATES[FULL_REVIEW_GATES.length - 1];
if (lastReviewGatePhase == null) {
  throw new Error('pipeline_phase_policy: REVIEW_AFTER_PHASES_FULL must not be empty');
}
if (lastReviewGatePhase !== Math.max(...FULL_REVIEW_GATES)) {
  throw new Error('pipeline_phase_policy: full-audit review gates must be sorted and end at the strategy phase');
}
export const PIPELINE_STRATEGY_PHASE_INDEX = lastReviewGatePhase;

export function isPipelineStrategyReviewGateAfterPhase(afterPhase: number): boolean {
  return afterPhase === PIPELINE_STRATEGY_PHASE_INDEX;
}

export function hasNonEmptyReviewNotesForRerun(
  consultantNotes: string | undefined,
  interviewNotes: string | undefined,
): boolean {
  return Boolean(consultantNotes?.trim()) || Boolean(interviewNotes?.trim());
}
