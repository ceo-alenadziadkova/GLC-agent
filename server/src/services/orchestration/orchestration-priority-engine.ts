import { ORCHESTRATION_PRIORITY_ENGINE_POLICY } from '../../config/orchestration-graph-policy.js';
import type { OrchestrationActionNode } from '../../types/orchestration/index.js';

function clampBlockingFactor(v: number | undefined): 0 | 1 | 2 | 3 {
  if (v === undefined || !Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  if (v === 1) return 1;
  if (v === 2) return 2;
  return 3;
}

export function computeOrchestrationPriorityScore(node: OrchestrationActionNode): number {
  const impact = Math.max(1, node.impact_score ?? 3);
  const confidence = ORCHESTRATION_PRIORITY_ENGINE_POLICY.confidenceNumeric[node.confidence ?? 'medium'];
  const domainWeight = Math.max(0.5, node.domain_weight ?? 1);
  const blocking = ORCHESTRATION_PRIORITY_ENGINE_POLICY.blockingMultiplier[clampBlockingFactor(node.blocking_factor)];
  const effort = Math.max(1, node.effort_score ?? 3);
  const risk = Math.max(1, node.risk_score ?? ORCHESTRATION_PRIORITY_ENGINE_POLICY.defaultRiskScore);
  const timePenalty = ORCHESTRATION_PRIORITY_ENGINE_POLICY.timePenalty[node.time_to_value ?? 'medium'];

  return Number(((impact * confidence * domainWeight * blocking) / (effort * risk * timePenalty)).toFixed(6));
}
