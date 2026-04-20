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
  'input_gate_degraded',
  'director_input_coverage_below_floor',
] as const;

export type OrchestrationPlanGovernanceReasonCode =
  (typeof ORCHESTRATION_PLAN_GOVERNANCE_REASON_CODES)[number];

export const ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS: Record<
  OrchestrationPlanGovernanceReasonCode,
  string
> = {
  unresolved_conflict_budget_exceeded: 'Resolve unresolved conflicts or reduce incompatible actions in current scope.',
  dependency_cycles_detected: 'Break circular dependencies in the graph before rebuilding the roadmap.',
  dangling_dependencies_detected: 'Link missing dependency IDs to valid actions or remove invalid references.',
  dependency_integrity_below_floor: 'Improve dependency mapping so edges reference existing nodes with valid relations.',
  coverage_integrity_below_floor: 'Adjust manifest scope or rebalance plan so critical path covers key scoped actions.',
  confidence_integrity_below_floor: 'Increase evidence quality to raise medium/high confidence share of actions.',
  pack_schema_invalid: 'Rebuild roadmap on latest schema-compatible data snapshot.',
  confidence_coverage_below_floor: 'Backfill confidence for actions lacking confidence classification.',
  risk_coverage_below_floor: 'Backfill risk scores for actions currently missing risk metadata.',
  invalid_lane_assignments_detected: 'Move invalid lane assignments to allowed roadmap lanes.',
  empty_critical_path: 'Ensure graph ordering can produce a non-empty critical path.',
  critical_path_coverage_below_floor: 'Increase critical path coverage for scoped actions.',
  input_gate_degraded: 'Complete missing domain outputs or accept degraded mode explicitly before final build.',
  director_input_coverage_below_floor: 'Increase director stage-2 coverage to reduce strategy fallback dependency.',
};

