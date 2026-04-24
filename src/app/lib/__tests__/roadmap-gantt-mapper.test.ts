import { describe, expect, it } from 'vitest';

import type { AuditTimelineDto } from '../../data/api/audits-orchestration';
import { buildRoadmapGanttProjection } from '../roadmap-gantt-mapper';

function buildTimelineFixture(): AuditTimelineDto {
  return {
    status: 'ready',
    version: {
      roadmap_version: 1,
      manifest_snapshot_id: 'snap-1',
      latest_manifest_snapshot_id: 'snap-1',
      stale_manifest: false,
      manifest_state: 'confirmed',
      season_preset: 'rolling_90d',
      plan_horizon: {
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      },
    },
    seasons: [
      { id: 'near', node_ids: ['a'] },
      { id: 'mid', node_ids: ['b'] },
      { id: 'far', node_ids: [] },
    ],
    lanes: [
      {
        lane_id: 'tech_delivery',
        items: [
          {
            id: 'a',
            title: 'Ship core API',
            domain: 'tech_infrastructure',
            lane: 'tech_delivery',
            season_index: 0,
            time_bucket: 'now',
            source: 'director',
            explain: {
              why: ['API latency target achieved'],
              how: { description: 'Deploy API gateway' },
              impact: { label: 'high' },
            },
          },
        ],
      },
      {
        lane_id: 'marketing_narrative',
        items: [
          {
            id: 'b',
            title: 'Launch campaign',
            domain: 'marketing_utp',
            lane: 'marketing_narrative',
            season_index: 1,
            time_bucket: 'next',
            source: 'sub_agent:cmo.agent_1_market',
          },
        ],
      },
    ],
    dependencies: [
      { from: 'a', to: 'b', relation: 'direct_blocker', blocking: true, cross_lane: true },
    ],
    top_7d: ['a'],
    top_30d: ['b'],
    waiting_list_domains: [],
    data_gaps: null,
  };
}

describe('buildRoadmapGanttProjection', () => {
  it('maps lanes, tasks, and typed dependencies', () => {
    const projection = buildRoadmapGanttProjection(buildTimelineFixture());
    expect(projection.lanes).toHaveLength(2);
    expect(projection.tasks).toHaveLength(2);
    expect(projection.dependencies).toEqual([
      expect.objectContaining({
        from: 'a',
        to: 'b',
        kind: 'FS',
        blocking: true,
        crossLane: true,
      }),
    ]);
    expect(projection.tasks.find((task) => task.id === 'b')?.dependencyIds).toEqual(['a']);
  });
});
