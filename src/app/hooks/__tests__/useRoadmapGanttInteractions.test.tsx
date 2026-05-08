import dayjs from 'dayjs';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttTask,
} from '../../lib/roadmap-gantt-mapper';
import type { PlanBoardCardDto } from '../../data/api/audits-orchestration';
import type { RoadmapGanttPlanBoardHydration } from '../../components/roadmap-gantt/types';
import type { RoadmapGanttTimelineTaskOverrides } from '../../lib/roadmap-gantt-timeline-overrides';

const mutateAsyncMock = vi.fn();
const toastErrorMock = vi.fn();
const invalidateMock = vi.fn();

vi.mock('../../data/api/plan-board-queries', () => ({
  usePatchPlanBoardCardMutation: () => ({
    mutateAsync: (...args: unknown[]) => mutateAsyncMock(...args),
    isPending: false,
  }),
}));

vi.mock('../../lib/tanstack-react-query', () => ({
  useQueryClient: () => ({}),
}));

vi.mock('../../lib/plan-workspace-queries', () => ({
  invalidatePlanWorkspaceQueries: (...args: unknown[]) => {
    invalidateMock(...args);
    return Promise.resolve([]);
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

import { useRoadmapGanttInteractions } from '../useRoadmapGanttInteractions';

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

const TASK_A = buildTask({ id: 'a' });
const BOARD_ROW: PlanBoardCardDto = {
  id: 'card-a',
  source: 'pack',
  column_id: 'col-todo',
  position: 0,
  pinned: false,
  delivery_area: 'tech_delivery',
  canonical_node_key: 'cn-a',
  pack_graph_node_id: 'a',
  orphaned_reason: null,
  title: 'a',
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
};
const HYDRATION: NonNullable<RoadmapGanttPlanBoardHydration> = {
  enabled: true,
  pending: false,
  fetchFailed: false,
  blockedNoPack: false,
  blockedGovernance: false,
  cards: [BOARD_ROW],
  packVersionUsed: 7,
  role: 'consultant',
};

const GROUPS: TimelineGroupBase[] = [
  { id: 'tech_delivery', title: 'Tech delivery' },
  { id: 'marketing_narrative', title: 'Marketing narrative' },
  { id: ROADMAP_GANTT_MILESTONE_LANE_ID, title: 'Milestones' },
];

let overrides: RoadmapGanttTimelineTaskOverrides = {};
const setOverridesMock = vi.fn((updater: (prev: RoadmapGanttTimelineTaskOverrides) => RoadmapGanttTimelineTaskOverrides) => {
  overrides = updater(overrides);
});
const setSelectedMock = vi.fn();
const setFocusedMock = vi.fn();

beforeEach(() => {
  overrides = {};
  setOverridesMock.mockClear();
  setSelectedMock.mockClear();
  setFocusedMock.mockClear();
  mutateAsyncMock.mockReset();
  toastErrorMock.mockClear();
  invalidateMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderInteractions(overridesArgs?: { editableIds?: ReadonlySet<string> }) {
  return renderHook(() =>
    useRoadmapGanttInteractions({
      auditId: 'audit-1',
      planBoardHydration: HYDRATION,
      timelineTasks: [TASK_A],
      groups: GROUPS,
      timelineEditableTaskIds: overridesArgs?.editableIds ?? new Set(['a']),
      boardRowByPackNodeId: new Map([['a', BOARD_ROW]]),
      timelineBoardEditEnabled: true,
      setTimelineTaskOverrides: setOverridesMock as unknown as React.Dispatch<
        React.SetStateAction<RoadmapGanttTimelineTaskOverrides>
      >,
      setSelectedTaskId: setSelectedMock,
      setFocusedTaskId: setFocusedMock,
    }),
  );
}

describe('useRoadmapGanttInteractions', () => {
  it('handleTimelineItemMove fires PATCH with the optimistic override applied', async () => {
    mutateAsyncMock.mockResolvedValueOnce({ ok: true });
    const { result } = renderInteractions();
    const newStart = dayjs('2026-02-01').valueOf();

    await act(async () => {
      result.current.handleTimelineItemMove('a', newStart, 1); // index 1 = marketing_narrative
    });

    expect(setOverridesMock).toHaveBeenCalled();
    expect(overrides.a?.start_time).toBe(newStart);
    expect(overrides.a?.group).toBe('marketing_narrative');
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card-a',
        body: expect.objectContaining({
          expected_pack_version: 7,
          lane: 'marketing_narrative',
        }),
      }),
    );
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('handleTimelineItemMove rejects moves into the milestone lane', async () => {
    const { result } = renderInteractions();
    await act(async () => {
      result.current.handleTimelineItemMove('a', 0, 2); // index 2 = milestone lane
    });
    expect(setOverridesMock).not.toHaveBeenCalled();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('reverts the override when the PATCH rejects', async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderInteractions();
    const newStart = dayjs('2026-02-01').valueOf();

    await act(async () => {
      result.current.handleTimelineItemMove('a', newStart, 0);
    });

    expect(toastErrorMock).toHaveBeenCalled();
    expect(overrides.a).toBeUndefined();
  });

  it('handleTimelineItemResize ignores tasks outside timelineEditableTaskIds', async () => {
    const { result } = renderInteractions({ editableIds: new Set() });
    await act(async () => {
      result.current.handleTimelineItemResize('a', 0, 'right');
    });
    expect(setOverridesMock).not.toHaveBeenCalled();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('selectTask updates both selected and focused state', () => {
    const { result } = renderInteractions();
    act(() => {
      result.current.selectTask('a');
    });
    expect(setSelectedMock).toHaveBeenCalledWith('a');
    expect(setFocusedMock).toHaveBeenCalledWith('a');
  });
});
