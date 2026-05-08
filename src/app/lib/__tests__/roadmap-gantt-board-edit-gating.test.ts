import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  buildBoardRowByPackNodeId,
  computeTimelineBoardEditEnabled,
  computeTimelineEditableTaskIds,
} from '../roadmap-gantt-board-edit-gating';
import type { RoadmapGanttPlanBoardHydration } from '../../components/roadmap-gantt/types';
import type { PlanBoardCardDto } from '../../data/api/orchestration-types';
import type { RoadmapGanttTask } from '../roadmap-gantt-mapper';

function buildCard(overrides: Partial<PlanBoardCardDto>): PlanBoardCardDto {
  return {
    id: overrides.id ?? 'card-1',
    source: 'pack',
    column_id: 'col-todo',
    position: 0,
    pinned: false,
    delivery_area: 'tech_delivery',
    canonical_node_key: 'cn-1',
    pack_graph_node_id: 'pg-1',
    orphaned_reason: null,
    title: 't',
    lane: 'tech_delivery',
    ticket_description: null,
    assignee: null,
    assignee_user_id: null,
    labels: [],
    story_points: null,
    priority: null,
    start_date: null,
    due_date: null,
    end_date: null,
    updated_by_user_id: null,
    ...overrides,
  };
}

function buildTask(id: string, kind: 'task' | 'milestone' = 'task'): RoadmapGanttTask {
  return {
    id,
    group: 'tech_delivery',
    title: id,
    start_time: dayjs('2026-01-01').valueOf(),
    end_time: dayjs('2026-01-10').valueOf(),
    owner: '',
    description: '',
    impact: '',
    status: 'planned',
    deliverables: [],
    dependencyIds: [],
    isEstimated: false,
    kind,
    onCriticalPath: false,
    isOverdue: false,
    topPriorityBucket: null,
    confidence: null,
    earlyStartMs: null,
    earlyFinishMs: null,
    lateStartMs: null,
    lateFinishMs: null,
    totalFloatMs: null,
    freeFloatMs: null,
  };
}

describe('buildBoardRowByPackNodeId', () => {
  it('returns an empty map for undefined or empty input', () => {
    expect(buildBoardRowByPackNodeId(undefined).size).toBe(0);
    expect(buildBoardRowByPackNodeId([]).size).toBe(0);
  });

  it('skips rows with null pack_graph_node_id', () => {
    const cards: PlanBoardCardDto[] = [
      buildCard({ id: 'a', pack_graph_node_id: null }),
      buildCard({ id: 'b', pack_graph_node_id: 'pg-b' }),
    ];
    const map = buildBoardRowByPackNodeId(cards);
    expect(map.size).toBe(1);
    expect(map.get('pg-b')?.id).toBe('b');
  });

  it('keeps the last row when duplicates appear', () => {
    const cards: PlanBoardCardDto[] = [
      buildCard({ id: 'a', pack_graph_node_id: 'pg-1' }),
      buildCard({ id: 'b', pack_graph_node_id: 'pg-1' }),
    ];
    expect(buildBoardRowByPackNodeId(cards).get('pg-1')?.id).toBe('b');
  });
});

describe('computeTimelineBoardEditEnabled', () => {
  const baseHydration: NonNullable<RoadmapGanttPlanBoardHydration> = {
    enabled: true,
    pending: false,
    fetchFailed: false,
    blockedNoPack: false,
    blockedGovernance: false,
    cards: [],
    packVersionUsed: 1,
    role: 'consultant',
  };

  it('returns false for clients regardless of hydration', () => {
    expect(computeTimelineBoardEditEnabled({ isClient: true, planBoardHydration: baseHydration })).toBe(false);
  });

  it('returns false when hydration is undefined or disabled', () => {
    expect(computeTimelineBoardEditEnabled({ isClient: false, planBoardHydration: undefined })).toBe(false);
    expect(
      computeTimelineBoardEditEnabled({
        isClient: false,
        planBoardHydration: { ...baseHydration, enabled: false },
      }),
    ).toBe(false);
  });

  it.each([
    ['pending', { pending: true }],
    ['fetchFailed', { fetchFailed: true }],
    ['blockedGovernance', { blockedGovernance: true }],
    ['blockedNoPack', { blockedNoPack: true }],
  ] as const)('returns false when %s blocks edits', (_label, override) => {
    expect(
      computeTimelineBoardEditEnabled({
        isClient: false,
        planBoardHydration: { ...baseHydration, ...override },
      }),
    ).toBe(false);
  });

  it('returns true when all gates are open', () => {
    expect(computeTimelineBoardEditEnabled({ isClient: false, planBoardHydration: baseHydration })).toBe(true);
  });
});

describe('computeTimelineEditableTaskIds', () => {
  it('returns an empty set when the gate is closed', () => {
    const tasks = [buildTask('a')];
    const map = new Map<string, PlanBoardCardDto>([['a', buildCard({ pack_graph_node_id: 'a' })]]);
    expect(computeTimelineEditableTaskIds(false, tasks, map).size).toBe(0);
  });

  it('only marks tasks that have a matching pack node row', () => {
    const tasks = [buildTask('a'), buildTask('b'), buildTask('m', 'milestone')];
    const map = new Map<string, PlanBoardCardDto>([['a', buildCard({ pack_graph_node_id: 'a' })]]);
    const result = computeTimelineEditableTaskIds(true, tasks, map);
    expect([...result]).toEqual(['a']);
  });

  it('excludes milestones even when a row matches', () => {
    const tasks = [buildTask('m', 'milestone')];
    const map = new Map<string, PlanBoardCardDto>([['m', buildCard({ pack_graph_node_id: 'm' })]]);
    expect(computeTimelineEditableTaskIds(true, tasks, map).size).toBe(0);
  });
});
