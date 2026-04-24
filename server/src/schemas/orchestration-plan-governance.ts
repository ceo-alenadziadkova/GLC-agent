import { z } from 'zod';
import { ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES } from '../config/orchestration-plan-governance-policy.js';
import { ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES } from '../config/orchestration-plan-governance-rollout-policy.js';

export const OrchestrationPlanGovernanceDecisionHintSchema = z.enum([
  'accept_plan',
  'accept_with_warnings',
  'refine_plan',
]);
export const ORCHESTRATION_PLAN_GATE_OUTCOMES = [
  'accept',
  'accept_with_warnings',
  'refine',
] as const;
export const OrchestrationPlanGateOutcomeSchema = z.enum(ORCHESTRATION_PLAN_GATE_OUTCOMES);

export const OrchestrationPlanGovernanceStatusSchema = z.enum([
  'pass',
  'pass_with_warnings',
  'fail',
]);

export const OrchestrationPlanGovernanceDecisionSchema = z.enum([
  'persist',
  'reject',
]);

const reasonCodeTuple = [...ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES] as [
  (typeof ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES)[number],
  ...(typeof ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES)[number][],
];

export const OrchestrationPlanGovernanceSchema = z.object({
  unresolved_conflicts: z.number().int().nonnegative(),
  cycles_detected: z.number().int().nonnegative(),
  dangling_deps_count: z.number().int().nonnegative(),
  invalid_lane_assignments: z.number().int().nonnegative(),
  dependency_integrity_score: z.number().min(0).max(1),
  coverage_integrity_score: z.number().min(0).max(1),
  confidence_integrity_score: z.number().min(0).max(1),
  confidence_coverage_score: z.number().min(0).max(1),
  risk_coverage_score: z.number().min(0).max(1),
  critical_path_node_ratio: z.number().min(0).max(1),
  integrity_score: z.number().min(0).max(1),
  coverage_score: z.number().min(0).max(1),
  confidence_score: z.number().min(0).max(1),
  status: OrchestrationPlanGovernanceStatusSchema,
  decision: OrchestrationPlanGovernanceDecisionSchema,
  rollout_mode: z.enum(ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES),
  decision_hint: OrchestrationPlanGovernanceDecisionHintSchema,
  plan_gate_outcome: OrchestrationPlanGateOutcomeSchema,
  reason_codes: z.array(z.enum(reasonCodeTuple)),
  blocking_reasons: z.array(z.enum(reasonCodeTuple)),
  warnings_soft: z.array(z.enum(reasonCodeTuple)),
  warnings: z.array(z.string()),
});

export type OrchestrationPlanGovernance = z.infer<typeof OrchestrationPlanGovernanceSchema>;
export type OrchestrationPlanGovernanceDecisionHint = z.infer<
  typeof OrchestrationPlanGovernanceDecisionHintSchema
>;
