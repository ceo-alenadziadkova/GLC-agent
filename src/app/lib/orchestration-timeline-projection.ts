import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';

export type OrchestrationTimelineBucketId = 'near' | 'mid' | 'far';

export interface OrchestrationTimelineBucket {
  id: OrchestrationTimelineBucketId;
  title: string;
  nodeIds: string[];
}

/**
 * Splits critical path ids into three ordered buckets for a simple seasonal projection (MVP).
 */
export function projectCriticalPathToTimelineBuckets(
  pack: GlcOrchestrationPackView,
  bucketTitles: Record<OrchestrationTimelineBucketId, string>,
): OrchestrationTimelineBucket[] {
  const ids = [...pack.critical_path];
  if (ids.length === 0) {
    return [
      { id: 'near', title: bucketTitles.near, nodeIds: [] },
      { id: 'mid', title: bucketTitles.mid, nodeIds: [] },
      { id: 'far', title: bucketTitles.far, nodeIds: [] },
    ];
  }
  const n = ids.length;
  const a = Math.ceil(n / 3);
  const b = Math.ceil((2 * n) / 3);
  return [
    { id: 'near', title: bucketTitles.near, nodeIds: ids.slice(0, a) },
    { id: 'mid', title: bucketTitles.mid, nodeIds: ids.slice(a, b) },
    { id: 'far', title: bucketTitles.far, nodeIds: ids.slice(b) },
  ];
}

export function orchestrationNodeTitleMap(pack: GlcOrchestrationPackView): Map<string, string> {
  const m = new Map<string, string>();
  for (const node of pack.graph.nodes) {
    m.set(node.id, node.title);
  }
  return m;
}
