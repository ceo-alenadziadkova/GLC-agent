import { ORCHESTRATION_LANE_IDS, type OrchestrationLaneId } from '../../config/orchestration-lanes.js';
import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';

/** Minimal shape for lane bucketing (pack graph nodes, normalized action nodes, etc.). */
export type OrchestrationLaneProjectableNode = { readonly id: string; readonly lane: OrchestrationLaneId };

function createEmptyLaneIndex(): GlcOrchestrationPack['lanes'] {
  return Object.fromEntries(ORCHESTRATION_LANE_IDS.map((laneId) => [laneId, []])) as GlcOrchestrationPack['lanes'];
}

/**
 * Deterministic projection from graph nodes to timeline lanes.
 * Keeps a stable lane order and stable node order inside each lane.
 */
export function projectOrchestrationLanes(nodes: readonly OrchestrationLaneProjectableNode[]): GlcOrchestrationPack['lanes'] {
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
