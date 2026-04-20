import { describe, expect, it } from 'vitest';

import {
  orchestrationNodeTitleMap,
  partitionCriticalPathNodeIds,
  prioritizeCrossLaneEdges,
  projectCriticalPathToTimelineBuckets,
  projectRoadmapNodesFromCriticalPath,
} from '../orchestration-timeline-projection';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';

const pack = (critical_path: string[]): GlcOrchestrationPackView => ({
  version: 1,
  graph: {
    nodes: critical_path.map((id, i) => ({
      id,
      title: `T${i}`,
      domain: 'marketing_utp',
      lane: 'marketing_narrative',
    })),
    edges: [],
  },
  lanes: {
    product_change: [],
    tech_delivery: [],
    marketing_narrative: critical_path,
    seo: [],
    processes_automation: [],
    risk_compliance: [],
  },
  critical_path,
  conflicts_resolved: [],
  manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
});

describe('orchestration-timeline-projection', () => {
  it('splits critical path across three buckets', () => {
    const p = pack(['a', 'b', 'c', 'd', 'e', 'f']);
    const buckets = projectCriticalPathToTimelineBuckets(p, { near: 'N', mid: 'M', far: 'F' });
    expect(buckets.map(b => b.nodeIds.join(','))).toEqual(['a,b', 'c,d', 'e,f']);
  });

  it('partitionCriticalPathNodeIds matches seasonal thirds', () => {
    const p = pack(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(partitionCriticalPathNodeIds(p)).toEqual({
      near: ['a', 'b'],
      mid: ['c', 'd'],
      far: ['e', 'f'],
    });
  });

  it('projects roadmap node metadata for rolling windows', () => {
    const p = pack(['a', 'b', 'c']);
    const projected = projectRoadmapNodesFromCriticalPath({
      pack: p,
      seasonPreset: 'rolling_180d',
    });
    expect(projected).toEqual([
      { node_id: 'a', season_index: 1, time_bucket: 'now', target_window_days: 180 },
      { node_id: 'b', season_index: 2, time_bucket: 'next', target_window_days: 180 },
      { node_id: 'c', season_index: 3, time_bucket: 'later', target_window_days: 180 },
    ]);
  });

  it('builds title map', () => {
    const p = pack(['x']);
    p.graph.nodes[0]!.title = 'Hello';
    const m = orchestrationNodeTitleMap(p);
    expect(m.get('x')).toBe('Hello');
  });

  it('prioritizeCrossLaneEdges lists cross-lane edges first', () => {
    const p: GlcOrchestrationPackView = {
      version: 1,
      graph: {
        nodes: [
          { id: 'a', title: 'A', domain: 'marketing_utp', lane: 'marketing_narrative' },
          { id: 'b', title: 'B', domain: 'tech_infrastructure', lane: 'tech_delivery' },
          { id: 'c', title: 'C', domain: 'marketing_utp', lane: 'marketing_narrative' },
        ],
        edges: [
          { from: 'a', to: 'c', weight: 1 },
          { from: 'a', to: 'b', weight: 1 },
        ],
      },
      lanes: {
        product_change: [],
        tech_delivery: ['b'],
        marketing_narrative: ['a', 'c'],
        seo: [],
        processes_automation: [],
        risk_compliance: [],
      },
      critical_path: ['a', 'b', 'c'],
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000002',
    };
    const ordered = prioritizeCrossLaneEdges(p);
    expect(ordered[0]).toEqual({ from: 'a', to: 'b', weight: 1 });
    expect(ordered[1]).toEqual({ from: 'a', to: 'c', weight: 1 });
  });

  it('returns three empty buckets when critical path is empty', () => {
    const p = pack([]);
    const buckets = projectCriticalPathToTimelineBuckets(p, { near: 'N', mid: 'M', far: 'F' });
    expect(buckets.map((b) => b.nodeIds)).toEqual([[], [], []]);
    expect(partitionCriticalPathNodeIds(p)).toEqual({ near: [], mid: [], far: [] });
  });
});
