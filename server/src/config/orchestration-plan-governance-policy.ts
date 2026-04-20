export const ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES = [
  'unresolved_conflict_budget_exceeded',
  'dependency_cycles_detected',
  'dangling_dependencies_detected',
  'dependency_integrity_below_floor',
  'coverage_integrity_below_floor',
  'confidence_integrity_below_floor',
  'pack_schema_invalid',
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
  dangling_dependencies_detected: 'Dangling dependency ids detected',
  dependency_integrity_below_floor: 'Dependency integrity score below policy floor',
  coverage_integrity_below_floor: 'Coverage integrity score below policy floor',
  confidence_integrity_below_floor: 'Confidence integrity score below policy floor',
  pack_schema_invalid: 'Pack schema/version is invalid',
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
  danglingDependencyBudget: 0,
  dependencyIntegrityScoreFloor: 0.9,
  coverageIntegrityScoreFloor: 0.6,
  confidenceIntegrityScoreFloor: 0.6,
  confidenceCoverageScoreFloor: 0.75,
  riskCoverageScoreFloor: 0.6,
  invalidLaneAssignmentBudget: 0,
  allowEmptyCriticalPath: false,
  minCriticalPathNodeRatio: 0.1,
  blockPersistOnRefinePlan: true,
  refineReasonCodes: [
    'dependency_cycles_detected',
    'dangling_dependencies_detected',
    'pack_schema_invalid',
    'dependency_integrity_below_floor',
    'invalid_lane_assignments_detected',
    'empty_critical_path',
  ] as OrchestrationPlanGovernanceReasonCode[],
  structuralReasonCodes: [
    'dependency_cycles_detected',
    'dangling_dependencies_detected',
    'pack_schema_invalid',
    'dependency_integrity_below_floor',
    'invalid_lane_assignments_detected',
    'empty_critical_path',
    'critical_path_coverage_below_floor',
  ] as OrchestrationPlanGovernanceReasonCode[],
  qualityReasonCodes: [
    'unresolved_conflict_budget_exceeded',
    'coverage_integrity_below_floor',
    'confidence_integrity_below_floor',
    'confidence_coverage_below_floor',
    'risk_coverage_below_floor',
  ] as OrchestrationPlanGovernanceReasonCode[],
  tightenedQualityBlockerReasonCodes: [
    'confidence_coverage_below_floor',
    'risk_coverage_below_floor',
  ] as OrchestrationPlanGovernanceReasonCode[],
} as const;
