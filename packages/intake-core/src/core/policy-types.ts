/** Intake policy artifact v1 (see intake-policy.v1.json). */
export type AskStrategy = 'always' | 'if_needed' | 'progressive' | 'consultant_only';

export interface ModeRequirednessOverride {
  requiredAlways?: string[];
  requiredIfVisible?: string[];
  syntheticRequired?: string[];
}

export interface PolicyRichnessV1 {
  /** Optional mode-level override matrix (takes precedence over legacy fields when present). */
  requirednessByMode?: Partial<
    Record<'full' | 'express' | 'discovery' | 'pre_brief' | 'free_snapshot', ModeRequirednessOverride>
  >;
  /** Optional per-question ask strategy hints for resolver/layout explainability. */
  askStrategyById?: Record<string, AskStrategy>;
}

export interface FullModePolicyV1 extends PolicyRichnessV1 {
  participation: 'all_eligible';
  requiredness: 'from_canon';
  syntheticRequired: string[];
}

export interface ExpressModePolicyV1 extends PolicyRichnessV1 {
  participation: 'all_eligible';
  requiredAlways: string[];
  requiredIfVisible: string[];
}

export interface DiscoveryModePolicyV1 extends PolicyRichnessV1 {
  participation: 'explicit';
  /** Ordered bank ids for public Discovery UI fragment (before `included` filter). Omitted in frozen policy bundles → runtime uses default order. */
  publicWizardOrder?: string[];
  included: string[];
  requiredness: 'from_canon';
  syntheticRequired: string[];
}

export interface PreBriefModePolicyV1 extends PolicyRichnessV1 {
  participation: 'express_plus_identity';
  identityFieldIds: string[];
  identitySpecifyFieldId: string;
  identitySpecifyWhenIndustryEquals: string;
  inheritExpressRequired: true;
  /** Omitted in frozen policy bundles before 1.1.0 — resolver treats pre_brief as full bank visibility (legacy). */
  bankIncluded?: string[];
}

export interface FreeSnapshotModePolicyV1 extends PolicyRichnessV1 {
  participation: 'all_eligible';
  requiredness: 'none';
}

export type IntakePolicyFollowupRuleDefinitionV1 = {
  /** Stop follow-up when mapped signal confidence is in this set. */
  stopWhenSignalConfidenceIn?: Array<'low' | 'medium' | 'high' | 'unknown'>;
  /** Ask deeper when mapped signal confidence is in this set. */
  deeperWhenSignalConfidenceIn?: Array<'low' | 'medium' | 'high' | 'unknown'>;
  /** When true, treat explicit unknown / empty response as stop for this question. */
  treatEmptyOrUnknownResponseAsStop?: boolean;
};

/**
 * Configurable intelligence behavior (no magic numbers in services — thresholds live in JSON).
 */
export interface IntakePolicyIntelligenceV1 {
  casePatternsEnabled?: boolean;
  followupRuleDefinitions?: Record<string, IntakePolicyFollowupRuleDefinitionV1>;
  /**
   * When true (default), remove unanswered optional overlay bank ids from `nextRecommended` after a
   * matched case’s `stopCondition` is met and `minOverlayAnswered` is satisfied. Required bank ids
   * from policy are never removed.
   */
  caseStopPrunesOptionalOverlay?: boolean;
  /**
   * When true (default), after an answered question’s follow-up policy evaluates to `stop`, drop
   * subsequent unanswered questions that share the same primary `signalContribution[0].signalKey`
   * unless they are in the policy required set.
   */
  followupStopPrunesSameSignalOptional?: boolean;
  /**
   * F1: deterministic “minimum sufficient context” for `decideIntakeNextQuestion` (ADR-INTAKE-NEXT-QUESTION-V1).
   * When enabled with no sub-flags, an empty `nextRecommended` is treated as sufficient to stop.
   */
  minimumSufficientContext?: {
    enabled?: boolean;
    requirePilotCriticalSatisfied?: boolean;
    requireMatchedCaseStops?: boolean;
    requireConfidenceFloor?: boolean;
    confidenceTarget?: 'low' | 'medium' | 'high';
  };
}

export interface IntakePolicyV1 {
  version: string;
  modes: {
    full: FullModePolicyV1;
    express: ExpressModePolicyV1;
    discovery: DiscoveryModePolicyV1;
    pre_brief: PreBriefModePolicyV1;
    free_snapshot: FreeSnapshotModePolicyV1;
  };
  /** Optional: adaptive case overlays + follow-up rule registry (Diagnostic Adaptive Intake). */
  intelligence?: IntakePolicyIntelligenceV1;
}
