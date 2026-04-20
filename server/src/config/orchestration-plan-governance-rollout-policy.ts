export const ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES = [
  'shadow',
  'hard_structure_soft_quality',
  'tightened_quality',
] as const;

export type OrchestrationPlanGovernanceRolloutMode =
  (typeof ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES)[number];

export const ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_POLICY = {
  defaultMode: 'hard_structure_soft_quality' as OrchestrationPlanGovernanceRolloutMode,
} as const;
