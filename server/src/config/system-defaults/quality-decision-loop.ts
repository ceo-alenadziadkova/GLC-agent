/**
 * Quality gate rules (`ConsistencyChecker`) — score/confidence checks before review approval.
 */
export const SYSTEM_DEFAULTS_QUALITY_GATE = {
  /** Low-confidence issues share above which we warn (Rule: low_confidence_majority). */
  lowConfidenceRatioWarn: 0.5,
  /** `unknown_items` length above which we flag excessive data gaps (Rule: excessive_data_gaps). */
  maxUnknownItemsForInfo: 4,
  /**
   * Score threshold for Rule 1 (`score_severity_mismatch`):
   * - if domain.score >= this value AND there is at least one `critical` issue => emit a warning.
   */
  scoreSeverityMismatchCriticalMinScore: 4,
  /**
   * Score threshold for Rule 1 (`score_severity_mismatch`):
   * - if domain.score <= this value AND there are issues but none are `critical`/`high` => emit an info flag.
   */
  scoreSeverityMismatchLowMaxScore: 2,
} as const;

/**
 * Auto-loop: targeted agent rerun when Decision Layer returns 'refine'.
 * Master on/off and allowed modes: `isAutoLoopEnabled()`, `getAutoLoopAllowedModes()` in `feature-flags.ts`.
 *
 * See ADR-AUTO-LOOP-RULE-ENGINE.md for full design rationale.
 */
export const SYSTEM_DEFAULTS_AUTO_LOOP = {
  /** Maximum rerun iterations per phase. Hard cap — no infinite loops. */
  maxIterations: 2,
  /**
   * Minimum confidence gain (points, 0–100) required to accept a rerun result.
   * If the rerun scores ≤ original + minConfidenceGain, auto-loop stops and escalates.
   */
  minConfidenceGain: 5,
  /**
   * Estimated cost guardrail in USD. If the projected rerun cost exceeds this
   * threshold AND expected confidence gain is below minConfidenceGain, skip the rerun.
   */
  costGuardrailThresholdUsd: 2.5,
  allowedModesDefault: ['sandbox', 'internal'] as const,
} as const;

export const SYSTEM_DEFAULTS_DECISION_LAYER = {
  accept: {
    minOverallConfidence: 85,
    maxHallucinationFraction: 0.05,
  },
  acceptWithWarnings: {
    minOverallConfidence: 70,
    maxHallucinationCount: 3,
    maxStructuralErrors: 0,
  },
  feasibilityForceRefineThreshold: 0.5,
  feasibilityGatedDomains: ['tech_infrastructure', 'automation_processes'] as const,
} as const;
