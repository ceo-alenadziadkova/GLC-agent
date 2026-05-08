import type { Dispatch, ReactNode, SetStateAction } from 'react';
import dayjs from 'dayjs';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { useRoadmapGanttData } from '../useRoadmapGanttData';
import type { UseRoadmapGanttDataArgs } from '../useRoadmapGanttData';
import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttProjection,
  type RoadmapGanttTask,
} from '../../lib/roadmap-gantt-mapper';

function buildTask(overrides: Partial<RoadmapGanttTask> & Pick<RoadmapGanttTask, 'id'>): RoadmapGanttTask {
  return {
    id: overrides.id,
    group: overrides.group ?? 'tech_delivery',
    title: overrides.title ?? overrides.id,
    start_time: overrides.start_time ?? dayjs('2026-01-01').valueOf(),
    end_time: overrides.end_time ?? dayjs('2026-01-10').valueOf(),
    owner: overrides.owner ?? '',
    description: overrides.description ?? '',
    impact: overrides.impact ?? '',
    status: overrides.status ?? 'planned',
    deliverables: overrides.deliverables ?? [],
    dependencyIds: overrides.dependencyIds ?? [],
    isEstimated: overrides.isEstimated ?? false,
    kind: overrides.kind ?? 'task',
    onCriticalPath: overrides.onCriticalPath ?? false,
    isOverdue: overrides.isOverdue ?? false,
    topPriorityBucket: overrides.topPriorityBucket ?? null,
    confidence: overrides.confidence ?? null,
    earlyStartMs: overrides.earlyStartMs ?? null,
    earlyFinishMs: overrides.earlyFinishMs ?? null,
    lateStartMs: overrides.lateStartMs ?? null,
    lateFinishMs: overrides.lateFinishMs ?? null,
    totalFloatMs: overrides.totalFloatMs ?? null,
    freeFloatMs: overrides.freeFloatMs ?? null,
  };
}

function buildProjection(): RoadmapGanttProjection {
  return {
    lanes: [
      { id: 'tech_delivery', title: 'Tech delivery' },
      { id: 'marketing_narrative', title: 'Marketing narrative' },
      { id: ROADMAP_GANTT_MILESTONE_LANE_ID, title: 'Milestones' },
    ],
    tasks: [
      buildTask({ id: 'a', owner: 'Alice' }),
      buildTask({ id: 'b', group: 'marketing_narrative', owner: 'Bob' }),
      buildTask({
        id: 'm',
        kind: 'milestone',
        group: ROADMAP_GANTT_MILESTONE_LANE_ID,
        start_time: dayjs('2026-01-15').valueOf(),
        end_time: dayjs('2026-01-15').valueOf(),
      }),
    ],
    dependencies: [
      {
        id: 'd1',
        from: 'a',
        to: 'b',
        kind: 'FS',
        strength: 'strong',
        blocking: false,
        crossLane: true,
        onCriticalPath: false,
      },
    ],
    defaultTimeStart: dayjs('2026-01-01').valueOf(),
    defaultTimeEnd: dayjs('2026-12-31').valueOf(),
    milestones: [],
    upstreamByTask: new Map(),
    downstreamByTask: new Map([
      ['a', new Set(['b'])],
      ['b', new Set()],
    ]),
  };
}

function buildArgs(
  projection: RoadmapGanttProjection,
  selectedTaskId: string | null,
  setSelectedTaskId: Dispatch<SetStateAction<string | null>>,
  setFocusedTaskId: Dispatch<SetStateAction<string | null>>,
  overrides: Partial<UseRoadmapGanttDataArgs> = {},
): UseRoadmapGanttDataArgs {
  return {
    auditId: 'audit-1',
    projection,
    planBoardHydration: undefined,
    isClient: false,
    pathname: '/plan/audit-1/roadmap',
    search: '',
    urlTaskParam: '',
    filters: {
      titleQuery: '',
      criticalPathOnly: false,
      ownerFilter: 'all',
      statusFilter: 'all',
      laneFilter: 'all',
      blockedOnly: false,
      dependencyTypeFilter: 'all',
      dependencyView: 'all',
      dependencySort: { key: 'from', direction: 'asc' },
      highlightDependencyChain: true,
    },
    selection: {
      selectedTaskId,
      focusedTaskId: null,
      hoveredDependencyId: null,
      setSelectedTaskId,
      setFocusedTaskId,
    },
    isOverviewDragging: false,
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/plan/audit-1/roadmap']}>
      <Routes>
        <Route path="/plan/:id/roadmap" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useRoadmapGanttData', () => {
  it('exposes the filtered/normalized timeline and dependencies for the projection', () => {
    const projection = buildProjection();
    const setSelectedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();
    const setFocusedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();

    const { result } = renderHook(
      () => useRoadmapGanttData(buildArgs(projection, null, setSelectedTaskId, setFocusedTaskId)),
      { wrapper },
    );

    expect(result.current.timelineTasks.map((t) => t.id)).toEqual(['a', 'b', 'm']);
    expect(result.current.taskTitleById.get('a')).toBe('a');
    expect(result.current.visibleDependencies.map((d) => d.id)).toEqual(['d1']);
    expect(result.current.sortedVisibleDependencies).toHaveLength(1);
    expect(result.current.boardRowByPackNodeId.size).toBe(0);
    expect(result.current.timelineBoardEditEnabled).toBe(false);
    expect(result.current.timelineEditableTaskIds.size).toBe(0);
    expect(result.current.ownerOptions).toEqual(['Alice', 'Bob']);
    expect(result.current.selectableLanesForJump.map((l) => l.id)).toEqual([
      'tech_delivery',
      'marketing_narrative',
    ]);
  });

  it('applies overrides and reverts on rollback via applyOverride/revertOverride', () => {
    const projection = buildProjection();
    const setSelectedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();
    const setFocusedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();

    const { result } = renderHook(
      () => useRoadmapGanttData(buildArgs(projection, null, setSelectedTaskId, setFocusedTaskId)),
      { wrapper },
    );

    const newStart = dayjs('2026-02-01').valueOf();
    const newEnd = dayjs('2026-02-05').valueOf();

    act(() => {
      result.current.applyOverride({
        taskId: 'a',
        startMs: newStart,
        endMs: newEnd,
        groupId: 'marketing_narrative',
      });
    });
    const moved = result.current.timelineTasks.find((t) => t.id === 'a');
    expect(moved?.start_time).toBe(newStart);
    expect(moved?.group).toBe('marketing_narrative');

    act(() => {
      result.current.revertOverride('a', null);
    });
    expect(result.current.timelineTasks.find((t) => t.id === 'a')?.start_time).toBe(
      projection.tasks[0]!.start_time,
    );
  });

  it('produces a "ready" Plan Board move affordance when hydration matches the drawer task', () => {
    const projection = buildProjection();
    const setSelectedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();
    const setFocusedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();

    const planBoardHydration = {
      enabled: true,
      pending: false,
      fetchFailed: false,
      blockedNoPack: false,
      blockedGovernance: false,
      packVersionUsed: 5,
      role: 'consultant' as const,
      cards: [
        {
          id: 'card-a',
          source: 'pack' as const,
          column_id: 'col-todo',
          position: 0,
          pinned: false,
          delivery_area: 'tech_delivery',
          canonical_node_key: 'cn-a',
          pack_graph_node_id: 'a',
          orphaned_reason: null,
          title: 'A card',
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
        },
      ],
    };

    const { result } = renderHook(
      () =>
        useRoadmapGanttData(
          buildArgs(projection, 'a', setSelectedTaskId, setFocusedTaskId, { planBoardHydration }),
        ),
      { wrapper },
    );

    expect(result.current.timelineBoardEditEnabled).toBe(true);
    expect([...result.current.timelineEditableTaskIds]).toEqual(['a']);
    const move = result.current.taskPlanBoardMove;
    expect(move.status).toBe('ready');
    if (move.status === 'ready') {
      expect(move.row.id).toBe('card-a');
      expect(move.packVersion).toBe(5);
    }
  });

  it('synchronizes selection to URL focus param when present in the projection', () => {
    const projection = buildProjection();
    const setSelectedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();
    const setFocusedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();

    renderHook(
      () =>
        useRoadmapGanttData(
          buildArgs(projection, null, setSelectedTaskId, setFocusedTaskId, { urlTaskParam: 'b' }),
        ),
      { wrapper },
    );

    expect(setSelectedTaskId).toHaveBeenCalledWith('b');
    expect(setFocusedTaskId).toHaveBeenCalledWith('b');
  });
});
