import { describe, expect, it } from 'vitest';

import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-contract';
import type { AuditTimelineDto } from '../../data/api/orchestration-types';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { buildRoadmapGanttProjection, computeCpmSchedule } from '../roadmap-gantt-mapper';

const DAY_MS = 86_400_000;

function minimalPack(criticalPath: string[]): GlcOrchestrationPackView {
  return {
    version: ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: { nodes: [], edges: [] },
    lanes: {} as GlcOrchestrationPackView['lanes'],
    critical_path: criticalPath,
    conflicts_resolved: [],
    manifest_snapshot_id: 'test-snap',
  };
}

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

  it('marks tasks and consecutive critical-path edges when pack is provided', () => {
    const timeline = buildTimelineFixture();
    const projection = buildRoadmapGanttProjection(timeline, { pack: minimalPack(['a', 'b']) });
    expect(projection.tasks.find((t) => t.id === 'a')?.onCriticalPath).toBe(true);
    expect(projection.tasks.find((t) => t.id === 'b')?.onCriticalPath).toBe(true);
    expect(projection.dependencies.find((d) => d.from === 'a' && d.to === 'b')?.onCriticalPath).toBe(true);
  });

  it('maps top_priorities to topPriorityBucket', () => {
    const timeline: AuditTimelineDto = {
      ...buildTimelineFixture(),
      top_priorities: [{ bucket: '7d', action_id: 'b', reason_code: 'focus' }],
      top_7d: [],
      top_30d: [],
    };
    const projection = buildRoadmapGanttProjection(timeline);
    expect(projection.tasks.find((t) => t.id === 'b')?.topPriorityBucket).toBe('7d');
    expect(projection.tasks.find((t) => t.id === 'a')?.topPriorityBucket).toBeNull();
  });

  it('marks tasks overdue when nowMs is after window end', () => {
    const timeline = buildTimelineFixture();
    const base = buildRoadmapGanttProjection(timeline);
    const overdue = buildRoadmapGanttProjection(timeline, { nowMs: base.defaultTimeEnd + 86_400_000 });
    expect(overdue.tasks.some((t) => t.kind === 'task' && t.isOverdue)).toBe(true);
  });

  it('maps milestones from timeline using target_window_days', () => {
    const timeline: AuditTimelineDto = {
      ...buildTimelineFixture(),
      milestones: [{ id: 'm1', label: 'Gate 1', target_window_days: 15, unlocks: ['a'] }],
    };
    const projection = buildRoadmapGanttProjection(timeline);
    expect(projection.milestones).toEqual([
      expect.objectContaining({ id: 'm1', label: 'Gate 1', unlocks: ['a'] }),
    ]);
    const m = projection.milestones[0]!;
    expect(m.date).toBeGreaterThanOrEqual(projection.defaultTimeStart);
    expect(m.date).toBeLessThanOrEqual(projection.defaultTimeEnd);
    expect(projection.tasks.some((t) => t.kind === 'milestone' && t.title === 'Gate 1')).toBe(true);
  });

  it('builds transitive upstream and downstream sets', () => {
    const timeline = buildTimelineFixture();
    timeline.dependencies.push({
      from: 'b',
      to: 'c',
      relation: 'direct_blocker',
      blocking: true,
      cross_lane: false,
    });
    timeline.lanes[1]!.items.push({
      id: 'c',
      title: 'Follow-on',
      domain: 'marketing_utp',
      lane: 'marketing_narrative',
      season_index: 2,
      time_bucket: 'later',
    });

    const projection = buildRoadmapGanttProjection(timeline);
    expect([...(projection.upstreamByTask.get('c') ?? [])].sort()).toEqual(['a', 'b']);
    expect([...(projection.downstreamByTask.get('a') ?? [])].sort()).toEqual(['b', 'c']);
  });

  it('maps confidence from pack confidence_map for core tasks', () => {
    const timeline = buildTimelineFixture();
    const pack: GlcOrchestrationPackView = {
      ...minimalPack([]),
      confidence_map: { node_confidence: { a: 'high', b: 'low' } },
    };
    const projection = buildRoadmapGanttProjection(timeline, { pack });
    expect(projection.tasks.find((t) => t.id === 'a')?.confidence).toBe('high');
    expect(projection.tasks.find((t) => t.id === 'b')?.confidence).toBe('low');
  });

  it('computes CPM fields with zero total float on serial FS chain', () => {
    const projection = buildRoadmapGanttProjection(buildTimelineFixture());
    expect(projection.tasks.find((t) => t.id === 'a')?.totalFloatMs).toBe(0);
    expect(projection.tasks.find((t) => t.id === 'b')?.totalFloatMs).toBe(0);
    expect(projection.tasks.find((t) => t.id === 'a')?.earlyStartMs).not.toBeNull();
  });

  it('sets null CPM fields on milestone pseudo-tasks', () => {
    const timeline: AuditTimelineDto = {
      ...buildTimelineFixture(),
      milestones: [{ id: 'm1', label: 'Gate', target_window_days: 1, unlocks: [] }],
    };
    const projection = buildRoadmapGanttProjection(timeline);
    const m = projection.tasks.find((t) => t.kind === 'milestone');
    expect(m?.totalFloatMs).toBeNull();
    expect(m?.earlyStartMs).toBeNull();
  });

  it('returns null from computeCpmSchedule when the graph has a cycle', () => {
    const tasks = [
      { id: 'x', start_time: 0, end_time: DAY_MS },
      { id: 'y', start_time: DAY_MS, end_time: 2 * DAY_MS },
    ];
    const deps = [
      { from: 'x', to: 'y', kind: 'FS' as const },
      { from: 'y', to: 'x', kind: 'FS' as const },
    ];
    expect(computeCpmSchedule(tasks, deps)).toBeNull();
  });

  it('sets freeFloatMs equal to totalFloatMs for a sink task with no outgoing edges', () => {
    const tasks = [
      { id: 'a', start_time: 0, end_time: DAY_MS },
      { id: 'b', start_time: DAY_MS, end_time: 2 * DAY_MS },
    ];
    const deps = [{ from: 'a', to: 'b', kind: 'FS' as const }];
    const cpm = computeCpmSchedule(tasks, deps);
    expect(cpm).not.toBeNull();
    const sink = cpm!.get('b')!;
    expect(sink.freeFloatMs).toBe(sink.totalFloatMs);
  });

  it('does not set confidence on milestone pseudo-tasks', () => {
    const timeline: AuditTimelineDto = {
      ...buildTimelineFixture(),
      milestones: [{ id: 'm1', label: 'Gate', target_window_days: 1, unlocks: [] }],
    };
    const pack: GlcOrchestrationPackView = {
      ...minimalPack([]),
      confidence_map: { node_confidence: { a: 'medium' } },
    };
    const projection = buildRoadmapGanttProjection(timeline, { pack });
    expect(projection.tasks.find((t) => t.kind === 'milestone')?.confidence).toBeNull();
  });
});
