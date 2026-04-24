export const ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES = [
  'shadow',
  'hard_structure_soft_quality',
  'tightened_quality',
] as const;

export type OrchestrationPlanGovernanceRolloutMode =
  (typeof ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES)[number];

export interface OrchestrationPlanGovernanceRolloutReadinessInput {
  dependencyIntegrityScore: number;
  confidenceCoverageScore: number;
  riskCoverageScore: number;
}

export interface OrchestrationPlanGovernanceRolloutTransitionDecision {
  currentMode: OrchestrationPlanGovernanceRolloutMode;
  recommendedMode: OrchestrationPlanGovernanceRolloutMode;
  readyForPromotion: boolean;
}

export const ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_POLICY = {
  defaultMode: 'hard_structure_soft_quality' as OrchestrationPlanGovernanceRolloutMode,
  tightenedQualityReadinessFloors: {
    dependencyIntegrityScore: 0.9,
    confidenceCoverageScore: 0.75,
    riskCoverageScore: 0.6,
  },
} as const;

/**
 * Rollout helper for telemetry dashboards:
 * allows controlled promotion to tightened_quality only when quality floors are met.
 */
export function isTightenedQualityRolloutReady(
  input: OrchestrationPlanGovernanceRolloutReadinessInput,
): boolean {
  const floors = ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_POLICY.tightenedQualityReadinessFloors;
  return (
    input.dependencyIntegrityScore >= floors.dependencyIntegrityScore &&
    input.confidenceCoverageScore >= floors.confidenceCoverageScore &&
    input.riskCoverageScore >= floors.riskCoverageScore
  );
}

/**
 * Rollout transition helper:
 * shadow -> hard_structure_soft_quality -> tightened_quality.
 * Promotion requires readiness floors; otherwise current mode is kept.
 */
export function resolveOrchestrationPlanGovernanceRolloutTransition(args: {
  currentMode: OrchestrationPlanGovernanceRolloutMode;
  readiness: OrchestrationPlanGovernanceRolloutReadinessInput;
}): OrchestrationPlanGovernanceRolloutTransitionDecision {
  const readyForPromotion = isTightenedQualityRolloutReady(args.readiness);
  if (!readyForPromotion) {
    return {
      currentMode: args.currentMode,
      recommendedMode: args.currentMode,
      readyForPromotion,
    };
  }

  if (args.currentMode === 'shadow') {
    return {
      currentMode: args.currentMode,
      recommendedMode: 'hard_structure_soft_quality',
      readyForPromotion,
    };
  }
  if (args.currentMode === 'hard_structure_soft_quality') {
    return {
      currentMode: args.currentMode,
      recommendedMode: 'tightened_quality',
      readyForPromotion,
    };
  }
  return {
    currentMode: args.currentMode,
    recommendedMode: args.currentMode,
    readyForPromotion,
  };
}
