export const ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES = [
  'unresolved_conflict_budget_exceeded',
  'dependency_cycles_detected',
  'dependency_integrity_below_floor',
  'confidence_coverage_below_floor',
  'risk_coverage_below_floor',
  'invalid_lane_assignments_detected',
  'empty_critical_path',
  'critical_path_coverage_below_floor',
] as const;

export type OrchestrationPlanGovernanceReasonCode =
  (typeof ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES)[number];

export const ORCHESTRATION_PLAN_GOVERNANCE_REASON_MESSAGES: Record<
  OrchestrationPlanGovernanceReasonCode,
  string
> = {
  unresolved_conflict_budget_exceeded: 'Unresolved conflict budget exceeded',
  dependency_cycles_detected: 'Dependency cycles detected',
  dependency_integrity_below_floor: 'Dependency integrity score below policy floor',
  confidence_coverage_below_floor: 'Confidence coverage score below policy floor',
  risk_coverage_below_floor: 'Risk coverage score below policy floor',
  invalid_lane_assignments_detected: 'Invalid lane assignments detected',
  empty_critical_path: 'Critical path is empty',
  critical_path_coverage_below_floor: 'Critical path coverage below policy floor',
} as const;

/**
 * Policy thresholds for orchestration plan governance (separate from domain CONTROL_OBJECT).
 */
export const ORCHESTRATION_PLAN_GOVERNANCE_POLICY = {
  unresolvedConflictBudget: 2,
  dependencyIntegrityScoreFloor: 0.9,
  confidenceCoverageScoreFloor: 0.75,
  riskCoverageScoreFloor: 0.6,
  invalidLaneAssignmentBudget: 0,
  allowEmptyCriticalPath: false,
  minCriticalPathNodeRatio: 0.1,
  blockPersistOnRefinePlan: true,
  refineReasonCodes: [
    'dependency_cycles_detected',
    'dependency_integrity_below_floor',
    'invalid_lane_assignments_detected',
    'empty_critical_path',
  ] as OrchestrationPlanGovernanceReasonCode[],
  structuralReasonCodes: [
    'dependency_cycles_detected',
    'dependency_integrity_below_floor',
    'invalid_lane_assignments_detected',
    'empty_critical_path',
    'critical_path_coverage_below_floor',
  ] as OrchestrationPlanGovernanceReasonCode[],
  qualityReasonCodes: [
    'unresolved_conflict_budget_exceeded',
    'confidence_coverage_below_floor',
    'risk_coverage_below_floor',
  ] as OrchestrationPlanGovernanceReasonCode[],
  tightenedQualityBlockerReasonCodes: [
    'confidence_coverage_below_floor',
    'risk_coverage_below_floor',
  ] as OrchestrationPlanGovernanceReasonCode[],
} as const;
