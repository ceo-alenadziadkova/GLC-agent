import {
  ORCHESTRATION_PLAN_GOVERNANCE_POLICY,
  ORCHESTRATION_PLAN_GOVERNANCE_REASON_MESSAGES,
  type OrchestrationPlanGovernanceReasonCode,
} from '../../config/orchestration-plan-governance-policy.js';
import type { OrchestrationPlanGovernanceRolloutMode } from '../../config/orchestration-plan-governance-rollout-policy.js';
import {
  OrchestrationPlanGovernanceSchema,
  type OrchestrationPlanGovernance,
} from '../../schemas/orchestration-plan-governance.js';
import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import { ORCHESTRATION_LANE_IDS } from '../../config/orchestration-lanes.js';
import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-graph-policy.js';

function countCycles(pack: GlcOrchestrationPack): number {
  const adjacency = new Map<string, string[]>();
  const nodes = new Set(pack.graph.nodes.map(node => node.id));
  for (const node of nodes) adjacency.set(node, []);
  for (const edge of pack.graph.edges) {
    if (nodes.has(edge.from) && nodes.has(edge.to)) {
      adjacency.get(edge.from)?.push(edge.to);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  let cycles = 0;

  const dfs = (node: string) => {
    if (visiting.has(node)) {
      cycles += 1;
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const to of adjacency.get(node) ?? []) {
      dfs(to);
    }
    visiting.delete(node);
    visited.add(node);
  };

  for (const node of nodes) {
    dfs(node);
  }
  return cycles;
}

function computeDependencyIntegrityScore(pack: GlcOrchestrationPack): number {
  if (pack.graph.edges.length === 0) return 1;
  const nodeIds = new Set(pack.graph.nodes.map(node => node.id));
  let valid = 0;
  for (const edge of pack.graph.edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) valid += 1;
  }
  return valid / pack.graph.edges.length;
}

function computeConfidenceCoverageScore(pack: GlcOrchestrationPack): number {
  if (pack.graph.nodes.length === 0) return 1;
  const confidenceMap = pack.confidence_map?.node_confidence ?? {};
  if (Object.keys(confidenceMap).length === 0) return 0;
  const covered = pack.graph.nodes.filter(node => confidenceMap[node.id] !== undefined).length;
  return covered / pack.graph.nodes.length;
}

function computeRiskCoverageScore(pack: GlcOrchestrationPack): number {
  if (pack.graph.nodes.length === 0) return 1;
  const riskMap = pack.risk_layer?.node_risk ?? {};
  if (Object.keys(riskMap).length === 0) return 0;
  const covered = pack.graph.nodes.filter(node => riskMap[node.id] !== undefined).length;
  return covered / pack.graph.nodes.length;
}

function countInvalidLaneAssignments(pack: GlcOrchestrationPack): number {
  const allowed = new Set(ORCHESTRATION_LANE_IDS);
  return pack.graph.nodes.reduce((acc, node) => (allowed.has(node.lane) ? acc : acc + 1), 0);
}

function countDanglingDepsFromConflicts(pack: GlcOrchestrationPack): number {
  return pack.conflicts_resolved.filter(row => row.id.startsWith('orphan-dep:')).length;
}

function computeCoverageIntegrityScore(pack: GlcOrchestrationPack): number {
  const selected = pack.graph.nodes.length;
  if (selected === 0) return 1;
  const ratio = pack.critical_path.length / selected;
  return Math.min(1, Math.max(0, ratio));
}

function computeConfidenceIntegrityScore(pack: GlcOrchestrationPack): number {
  if (pack.graph.nodes.length === 0) return 1;
  const map = pack.confidence_map?.node_confidence ?? {};
  const values = Object.values(map);
  if (values.length === 0) return 0;
  const highOrMedium = values.filter(v => v === 'high' || v === 'medium').length;
  return highOrMedium / values.length;
}

function resolveBlockingReasons(
  reasons: readonly OrchestrationPlanGovernanceReasonCode[],
  rolloutMode: OrchestrationPlanGovernanceRolloutMode,
): OrchestrationPlanGovernanceReasonCode[] {
  const structural = new Set(ORCHESTRATION_PLAN_GOVERNANCE_POLICY.structuralReasonCodes);
  if (rolloutMode === 'shadow') return [];
  if (rolloutMode === 'hard_structure_soft_quality') {
    return reasons.filter(reason => structural.has(reason));
  }
  const tightened = new Set(ORCHESTRATION_PLAN_GOVERNANCE_POLICY.tightenedQualityBlockerReasonCodes);
  return reasons.filter(reason => structural.has(reason) || tightened.has(reason));
}

export function evaluateOrchestrationPlanGovernance(
  pack: GlcOrchestrationPack,
  opts?: { rolloutMode?: OrchestrationPlanGovernanceRolloutMode },
): OrchestrationPlanGovernance {
  const rolloutMode = opts?.rolloutMode ?? 'hard_structure_soft_quality';
  const nodeCount = Array.isArray(pack.graph?.nodes) ? pack.graph.nodes.length : 0;
  const criticalPathCount = Array.isArray(pack.critical_path) ? pack.critical_path.length : 0;
  const unresolvedConflicts = pack.conflicts_resolved.filter(
    row => row.resolution === 'synthesis_pending',
  ).length;
  const cyclesDetected = countCycles(pack);
  const danglingDepsCount = countDanglingDepsFromConflicts(pack);
  const invalidLaneAssignments = countInvalidLaneAssignments(pack);
  const dependencyIntegrityScore = computeDependencyIntegrityScore(pack);
  const coverageIntegrityScore = computeCoverageIntegrityScore(pack);
  const confidenceIntegrityScore = computeConfidenceIntegrityScore(pack);
  const confidenceCoverageScore = computeConfidenceCoverageScore(pack);
  const riskCoverageScore = computeRiskCoverageScore(pack);
  const criticalPathNodeRatio =
    nodeCount === 0 ? 0 : criticalPathCount / nodeCount;
  const hasEmptyCriticalPath = nodeCount > 0 && criticalPathCount === 0;

  const reason_codes: OrchestrationPlanGovernanceReasonCode[] = [];
  if (unresolvedConflicts > ORCHESTRATION_PLAN_GOVERNANCE_POLICY.unresolvedConflictBudget) {
    reason_codes.push('unresolved_conflict_budget_exceeded');
  }
  if (cyclesDetected > 0) {
    reason_codes.push('dependency_cycles_detected');
  }
  if (pack.version !== GLC_ORCHESTRATION_PACK_SCHEMA_VERSION) {
    reason_codes.push('pack_schema_invalid');
  }
  if (danglingDepsCount > ORCHESTRATION_PLAN_GOVERNANCE_POLICY.danglingDependencyBudget) {
    reason_codes.push('dangling_dependencies_detected');
  }
  if (dependencyIntegrityScore < ORCHESTRATION_PLAN_GOVERNANCE_POLICY.dependencyIntegrityScoreFloor) {
    reason_codes.push('dependency_integrity_below_floor');
  }
  if (coverageIntegrityScore < ORCHESTRATION_PLAN_GOVERNANCE_POLICY.coverageIntegrityScoreFloor) {
    reason_codes.push('coverage_integrity_below_floor');
  }
  if (confidenceIntegrityScore < ORCHESTRATION_PLAN_GOVERNANCE_POLICY.confidenceIntegrityScoreFloor) {
    reason_codes.push('confidence_integrity_below_floor');
  }
  if (confidenceCoverageScore < ORCHESTRATION_PLAN_GOVERNANCE_POLICY.confidenceCoverageScoreFloor) {
    reason_codes.push('confidence_coverage_below_floor');
  }
  if (riskCoverageScore < ORCHESTRATION_PLAN_GOVERNANCE_POLICY.riskCoverageScoreFloor) {
    reason_codes.push('risk_coverage_below_floor');
  }
  if (invalidLaneAssignments > ORCHESTRATION_PLAN_GOVERNANCE_POLICY.invalidLaneAssignmentBudget) {
    reason_codes.push('invalid_lane_assignments_detected');
  }
  if (hasEmptyCriticalPath && !ORCHESTRATION_PLAN_GOVERNANCE_POLICY.allowEmptyCriticalPath) {
    reason_codes.push('empty_critical_path');
  }
  if (criticalPathNodeRatio < ORCHESTRATION_PLAN_GOVERNANCE_POLICY.minCriticalPathNodeRatio) {
    reason_codes.push('critical_path_coverage_below_floor');
  }
  const expectedStrategyOnlyNoDirector =
    pack.input_quality?.input_mode === 'strategy_fallback' &&
    pack.input_quality?.fallback_reason_code === 'director_slice_missing';

  if (pack.input_quality?.input_gate_status === 'degraded' && !expectedStrategyOnlyNoDirector) {
    reason_codes.push('input_gate_degraded');
  }
  if (
    !expectedStrategyOnlyNoDirector &&
    typeof pack.input_quality?.director_input_coverage_ratio === 'number' &&
    pack.input_quality.director_input_coverage_ratio <
      ORCHESTRATION_PLAN_GOVERNANCE_POLICY.directorInputCoverageRatioFloor
  ) {
    reason_codes.push('director_input_coverage_below_floor');
  }

  const uniqueReasonCodes = [...new Set(reason_codes)];
  const blocking_reasons = resolveBlockingReasons(uniqueReasonCodes, rolloutMode);
  const blockingSet = new Set(blocking_reasons);
  const warnings_soft = uniqueReasonCodes.filter(code => !blockingSet.has(code));
  const warnings = warnings_soft.map(code => ORCHESTRATION_PLAN_GOVERNANCE_REASON_MESSAGES[code]);
  const integrity_score = dependencyIntegrityScore;
  const coverage_score = Math.min(1, (confidenceCoverageScore + riskCoverageScore) / 2);
  const confidence_score = confidenceCoverageScore;

  const status =
    blocking_reasons.length > 0
      ? 'fail'
      : warnings_soft.length > 0
        ? 'pass_with_warnings'
        : 'pass';
  const decision = blocking_reasons.length > 0 ? 'reject' : 'persist';

  const refine_reasons = new Set(ORCHESTRATION_PLAN_GOVERNANCE_POLICY.refineReasonCodes);
  const decision_hint =
    uniqueReasonCodes.some(code => refine_reasons.has(code))
      ? 'refine_plan'
      : warnings_soft.length > 0
        ? 'accept_with_warnings'
        : 'accept_plan';
  const plan_gate_outcome =
    decision_hint === 'refine_plan'
      ? 'refine'
      : decision_hint === 'accept_with_warnings'
        ? 'accept_with_warnings'
        : 'accept';

  return OrchestrationPlanGovernanceSchema.parse({
    unresolved_conflicts: unresolvedConflicts,
    cycles_detected: cyclesDetected,
    dangling_deps_count: danglingDepsCount,
    invalid_lane_assignments: invalidLaneAssignments,
    dependency_integrity_score: dependencyIntegrityScore,
    coverage_integrity_score: coverageIntegrityScore,
    confidence_integrity_score: confidenceIntegrityScore,
    confidence_coverage_score: confidenceCoverageScore,
    risk_coverage_score: riskCoverageScore,
    critical_path_node_ratio: criticalPathNodeRatio,
    integrity_score,
    coverage_score,
    confidence_score,
    status,
    decision,
    rollout_mode: rolloutMode,
    decision_hint,
    plan_gate_outcome,
    reason_codes: uniqueReasonCodes,
    blocking_reasons,
    warnings_soft,
    warnings,
  });
}
