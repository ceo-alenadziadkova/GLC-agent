import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import type { OrchestrationSeasonPreset } from '../config/orchestration-roadmap-manifest';
import { ORCHESTRATION_TIMELINE_TARGET_WINDOW_DAYS } from '../config/orchestration-ui-limits';

export type OrchestrationTimelineBucketId = 'near' | 'mid' | 'far';
export type OrchestrationTimelineTimeBucket = 'now' | 'next' | 'later';

export interface OrchestrationRoadmapNodeProjection {
  node_id: string;
  season_index: number;
  time_bucket: OrchestrationTimelineTimeBucket;
  target_window_days: number;
}

export interface OrchestrationTimelineBucket {
  id: OrchestrationTimelineBucketId;
  title: string;
  nodeIds: string[];
}

/**
 * Splits critical path ids into three ordered buckets for a simple seasonal projection (MVP).
 */
const SPLIT_PLACEHOLDER_TITLES: Record<OrchestrationTimelineBucketId, string> = {
  near: 'near',
  mid: 'mid',
  far: 'far',
};

/**
 * Same seasonal thirds as the timeline UI, without depending on display copy.
 */
export function partitionCriticalPathNodeIds(pack: GlcOrchestrationPackView): {
  near: string[];
  mid: string[];
  far: string[];
} {
  const buckets = projectCriticalPathToTimelineBuckets(pack, SPLIT_PLACEHOLDER_TITLES);
  return {
    near: buckets[0]?.nodeIds ?? [],
    mid: buckets[1]?.nodeIds ?? [],
    far: buckets[2]?.nodeIds ?? [],
  };
}

export function projectRoadmapNodesFromCriticalPath(args: {
  pack: GlcOrchestrationPackView;
  seasonPreset: OrchestrationSeasonPreset;
}): OrchestrationRoadmapNodeProjection[] {
  const ids = [...args.pack.critical_path];
  if (ids.length === 0) return [];
  const target_window_days = ORCHESTRATION_TIMELINE_TARGET_WINDOW_DAYS[args.seasonPreset];
  const n = ids.length;
  const a = Math.ceil(n / 3);
  const b = Math.ceil((2 * n) / 3);
  return ids.map((node_id, index) => {
    const season_index = index < a ? 1 : index < b ? 2 : 3;
    const time_bucket: OrchestrationTimelineTimeBucket =
      season_index === 1 ? 'now' : season_index === 2 ? 'next' : 'later';
    return {
      node_id,
      season_index,
      time_bucket,
      target_window_days,
    };
  });
}

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

/**
 * Surfaces cross-lane dependencies first (orchestrator graph projected onto lanes).
 */
export function prioritizeCrossLaneEdges(pack: GlcOrchestrationPackView): GlcOrchestrationPackView['graph']['edges'] {
  const laneOf = new Map<string, string>();
  for (const n of pack.graph.nodes) {
    laneOf.set(n.id, n.lane);
  }
  const edges = [...pack.graph.edges];
  edges.sort((a, b) => {
    const crossA = laneOf.get(a.from) !== laneOf.get(a.to);
    const crossB = laneOf.get(b.from) !== laneOf.get(b.to);
    if (crossA === crossB) return 0;
    return crossA ? -1 : 1;
  });
  return edges;
}
