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

/**
 * Narrow-profile Decision Layer (recon/strategy): no claim-bucket / feasibility gates.
 * Uses confidence.overall, structural errors, and human_attention_required only.
 */
export const SYSTEM_DEFAULTS_DECISION_LAYER_NARROW = {
  accept: { minOverallConfidence: 85 },
  acceptWithWarnings: { minOverallConfidence: 70 },
  maxStructuralErrors: 0,
  /** Appended to `active_error_types` when narrow CONTROL_OBJECT fails basic invariants. */
  activeErrorTypeInvariantFailed: 'narrow_invariant_failed',
} as const;

/**
 * Heuristics for strategy narrow CONTROL_OBJECT (Phase A — before full cross-domain claim checks).
 */
export const SYSTEM_DEFAULTS_STRATEGY_NARROW_GOVERNANCE = {
  /** On 1–5 scale: if |model overall_score − weighted aggregate| exceeds this, emit structural mismatch. */
  maxModelVsWeightedScoreDelta: 0.75,
  errorCodes: {
    modelVsWeightedScoreMismatch: 'strategy_model_vs_weighted_score_mismatch',
    noCompletedDomainScores: 'strategy_no_completed_domain_scores',
    governanceIncomplete: 'narrow_governance_incomplete',
  },
  /** Penalties applied to `confidence.overall` (0–100) when building narrow strategy CONTROL_OBJECT. */
  confidence: {
    baselineOverall: 100,
    overallClampMin: 0,
    overallClampMax: 100,
    penaltyPointsPerStructural: 25,
    penaltyPointsPerDataGap: 20,
    /** Cap when `governanceIncomplete` structural code is added after invariant failure. */
    invariantFailureMaxOverall: 40,
  },
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
  narrow: SYSTEM_DEFAULTS_DECISION_LAYER_NARROW,
  feasibilityForceRefineThreshold: 0.5,
  feasibilityGatedDomains: ['tech_infrastructure', 'automation_processes'] as const,
  onErrorFallback: {
    /**
     * Safe fallback when `DecisionLayer.decide()` throws.
     * Must never imply clean pass-through.
     */
    hint: 'accept_with_warnings' as const,
    reasonCode: 'decision_layer_error_fallback' as const,
  },
} as const;
