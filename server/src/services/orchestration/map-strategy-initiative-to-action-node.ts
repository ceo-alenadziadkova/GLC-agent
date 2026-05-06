import {
  ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
  ORCHESTRATION_GRAPH_MAX_NODES,
  ORCHESTRATION_IMPACT_WEIGHTS,
  ORCHESTRATION_EFFORT_WEIGHTS,
  ORCHESTRATION_PRIORITY_WEIGHTS,
  orchestrationNodeWeight,
} from '../../config/orchestration-graph-policy.js';
import { ORCHESTRATION_NODE_SOURCE_STRATEGY } from '../../config/director-orchestration-policy.js';
import { mapStrategyInitiativeDomainToLane } from '../../config/orchestration-lanes.js';
import type { StrategyInitiative } from '../../schemas/domain-output.js';
import type {
  OrchestrationActionNode,
  OrchestrationConflictResolvedEntry,
} from '../../types/orchestration/index.js';
import { normalizeStrategyConfidence } from './orchestration-action-normalizers.js';

export interface MapStrategyInitiativesToActionNodesResult {
  nodes: OrchestrationActionNode[];
  /** One entry per initiative dropped because the list exceeded `ORCHESTRATION_GRAPH_MAX_NODES`. */
  conflicts_resolved: OrchestrationConflictResolvedEntry[];
}

export function mapStrategyInitiativeToActionNode(initiative: StrategyInitiative): OrchestrationActionNode {
  const lane = mapStrategyInitiativeDomainToLane(initiative.domain);
  const impact = initiative.impact as keyof typeof ORCHESTRATION_IMPACT_WEIGHTS;
  const effort = initiative.effort as keyof typeof ORCHESTRATION_EFFORT_WEIGHTS;
  const priority = initiative.priority as keyof typeof ORCHESTRATION_PRIORITY_WEIGHTS;
  const weight = orchestrationNodeWeight({
    impact,
    effort,
    priority,
  });
  const effortScore = ORCHESTRATION_EFFORT_WEIGHTS[effort];
  return {
    id: initiative.id,
    title: initiative.title,
    domain: initiative.domain,
    lane,
    ...(initiative.board_identity_key != null && initiative.board_identity_key.trim() !== ''
      ? { board_identity_key: initiative.board_identity_key.trim() }
      : {}),
    dependencies: initiative.dependencies ?? [],
    weight,
    source: ORCHESTRATION_NODE_SOURCE_STRATEGY,
    analysis_depth: 'baseline',
    confidence: normalizeStrategyConfidence(initiative.confidence),
    impact_score: ORCHESTRATION_IMPACT_WEIGHTS[impact],
    effort_score: effortScore,
    risk_score: 3,
    time_to_value: effortScore <= 1 ? 'fast' : effortScore >= 3 ? 'slow' : 'medium',
  };
}

export function mapStrategyInitiativesToActionNodes(
  initiatives: StrategyInitiative[],
): MapStrategyInitiativesToActionNodesResult {
  const conflictsResolved: OrchestrationConflictResolvedEntry[] = [];
  const capped = initiatives.slice(0, ORCHESTRATION_GRAPH_MAX_NODES);
  if (initiatives.length > ORCHESTRATION_GRAPH_MAX_NODES) {
    for (let i = ORCHESTRATION_GRAPH_MAX_NODES; i < initiatives.length; i += 1) {
      const init = initiatives[i]!;
      conflictsResolved.push({
        id: `initiative-cap-drop:${init.id}:idx${i}`,
        summary: `Initiative "${init.id}" (${init.title}) excluded: initiative list exceeds ORCHESTRATION_GRAPH_MAX_NODES (${ORCHESTRATION_GRAPH_MAX_NODES}).`,
        resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
      });
    }
  }
  return {
    nodes: capped.map(mapStrategyInitiativeToActionNode),
    conflicts_resolved: conflictsResolved,
  };
}
