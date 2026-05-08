import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { computeTaskPlanBoardMove } from '../roadmap-gantt-task-plan-board-move';
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

const baseHydration: NonNullable<RoadmapGanttPlanBoardHydration> = {
  enabled: true,
  pending: false,
  fetchFailed: false,
  blockedNoPack: false,
  blockedGovernance: false,
  cards: [],
  packVersionUsed: 7,
  role: 'consultant',
};

describe('computeTaskPlanBoardMove', () => {
  it('returns "off" when hydration is undefined or disabled', () => {
    expect(computeTaskPlanBoardMove({ planBoardHydration: undefined, drawerTask: null })).toEqual({ status: 'off' });
    expect(
      computeTaskPlanBoardMove({
        planBoardHydration: { ...baseHydration, enabled: false },
        drawerTask: buildTask('a'),
      }),
    ).toEqual({ status: 'off' });
  });

  it.each([
    ['query_failed', { fetchFailed: true }],
    ['loading', { pending: true }],
    ['blocked_no_pack', { blockedNoPack: true }],
    ['blocked_governance', { blockedGovernance: true }],
  ] as const)('short-circuits to %s before checking the drawer task', (status, override) => {
    expect(
      computeTaskPlanBoardMove({
        planBoardHydration: { ...baseHydration, ...override },
        drawerTask: buildTask('a'),
      }),
    ).toEqual({ status });
  });

  it('returns "off" when the drawer task is missing or a milestone', () => {
    expect(computeTaskPlanBoardMove({ planBoardHydration: baseHydration, drawerTask: null })).toEqual({ status: 'off' });
    expect(
      computeTaskPlanBoardMove({ planBoardHydration: baseHydration, drawerTask: buildTask('m', 'milestone') }),
    ).toEqual({ status: 'off' });
  });

  it('returns "no_row" when no card matches the task', () => {
    expect(
      computeTaskPlanBoardMove({
        planBoardHydration: { ...baseHydration, cards: [buildCard({ pack_graph_node_id: 'other' })] },
        drawerTask: buildTask('a'),
      }),
    ).toEqual({ status: 'no_row' });
  });

  it('matches by pack_graph_node_id first', () => {
    const card = buildCard({ pack_graph_node_id: 'a', canonical_node_key: 'wrong' });
    const result = computeTaskPlanBoardMove({
      planBoardHydration: { ...baseHydration, cards: [card] },
      drawerTask: buildTask('a'),
    });
    expect(result).toEqual({ status: 'ready', row: card, packVersion: 7, role: 'consultant' });
  });

  it('falls back to canonical_node_key if pack_graph_node_id does not match', () => {
    const card = buildCard({ pack_graph_node_id: 'pg-x', canonical_node_key: 'a' });
    const result = computeTaskPlanBoardMove({
      planBoardHydration: { ...baseHydration, cards: [card] },
      drawerTask: buildTask('a'),
    });
    expect(result.status === 'ready' && result.row.id).toBe(card.id);
  });
});
