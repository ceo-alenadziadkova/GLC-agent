import { ORCHESTRATION_LANE_IDS } from '../../config/orchestration-lanes.js';
import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { OrchestrationActionNode } from '../../types/orchestration/index.js';

function createEmptyLaneIndex(): GlcOrchestrationPack['lanes'] {
  return Object.fromEntries(ORCHESTRATION_LANE_IDS.map((laneId) => [laneId, []])) as GlcOrchestrationPack['lanes'];
}

/**
 * Deterministic projection from action graph nodes to timeline lanes.
 * Keeps a stable lane order and stable node order inside each lane.
 */
export function projectOrchestrationLanes(nodes: readonly OrchestrationActionNode[]): GlcOrchestrationPack['lanes'] {
  const lanes = createEmptyLaneIndex();
  for (const node of nodes) {
    const laneBucket = lanes[node.lane];
    if (laneBucket) laneBucket.push(node.id);
  }
  for (const laneId of ORCHESTRATION_LANE_IDS) {
    const laneItems = lanes[laneId];
    if (laneItems) laneItems.sort();
  }
  return lanes;
}
