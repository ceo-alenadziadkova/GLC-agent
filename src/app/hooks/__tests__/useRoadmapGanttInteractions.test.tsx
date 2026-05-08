import dayjs from 'dayjs';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttProjection,
  type RoadmapGanttTask,
} from '../../lib/roadmap-gantt-mapper';
import type { PlanBoardCardDto } from '../../data/api/orchestration-types';
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
// Place B close enough that an ArrowDown (+7 days) from A's midpoint lands inside B's range.
const TASK_B = buildTask({
  id: 'b',
  group: 'marketing_narrative',
  start_time: dayjs('2026-01-12').valueOf(),
  end_time: dayjs('2026-01-15').valueOf(),
});
const MILESTONE = buildTask({
  id: 'mile',
  kind: 'milestone',
  group: ROADMAP_GANTT_MILESTONE_LANE_ID,
  start_time: dayjs('2026-01-15').valueOf(),
  end_time: dayjs('2026-01-15').valueOf(),
});

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

const PROJECTION: Pick<RoadmapGanttProjection, 'lanes'> = {
  lanes: [
    { id: 'tech_delivery', title: 'Tech delivery' },
    { id: 'marketing_narrative', title: 'Marketing narrative' },
    { id: ROADMAP_GANTT_MILESTONE_LANE_ID, title: 'Milestones' },
  ],
};

let overrides: RoadmapGanttTimelineTaskOverrides = {};
const applyOverrideMock = vi.fn((target: { taskId: string; startMs: number; endMs: number; groupId: string }) => {
  overrides[target.taskId] = {
    start_time: target.startMs,
    end_time: target.endMs,
    group: target.groupId,
  };
});
const revertOverrideMock = vi.fn((taskId: string, restored: RoadmapGanttTimelineTaskOverrides[string] | null | undefined) => {
  if (restored == null) {
    delete overrides[taskId];
    return;
  }
  overrides[taskId] = restored;
});
const setSelectedMock = vi.fn();
const setFocusedMock = vi.fn();
const setLaneFilterMock = vi.fn();
const setLaneMoveMenuOpenMock = vi.fn();
const setGridNavAnnouncementMock = vi.fn();
const setMainPanelTabAnnouncementMock = vi.fn();
const setActivePanelMock = vi.fn();
const setDependenciesTabMock = vi.fn();
const setShowAdvancedControlsMock = vi.fn();
const setRoadmapToolbarMoreOpenMock = vi.fn();
const setDependencySortMock = vi.fn();
const focusTaskBarElMock = vi.fn();
const resetViewMock = vi.fn();

beforeEach(() => {
  overrides = {};
  applyOverrideMock.mockClear();
  revertOverrideMock.mockClear();
  setSelectedMock.mockClear();
  setFocusedMock.mockClear();
  setLaneFilterMock.mockClear();
  setLaneMoveMenuOpenMock.mockClear();
  setGridNavAnnouncementMock.mockClear();
  setMainPanelTabAnnouncementMock.mockClear();
  setActivePanelMock.mockClear();
  setDependenciesTabMock.mockClear();
  setShowAdvancedControlsMock.mockClear();
  setRoadmapToolbarMoreOpenMock.mockClear();
  setDependencySortMock.mockClear();
  focusTaskBarElMock.mockClear();
  resetViewMock.mockClear();
  mutateAsyncMock.mockReset();
  toastErrorMock.mockClear();
  invalidateMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderInteractions(overridesArgs?: {
  editableIds?: ReadonlySet<string>;
  timelineTasks?: ReadonlyArray<RoadmapGanttTask>;
  focusedTask?: RoadmapGanttTask | null;
  activePanel?: 'timeline' | 'dependencies';
  dependencySort?: { key: 'from' | 'to' | 'type'; direction: 'asc' | 'desc' };
}) {
  return renderHook(() =>
    useRoadmapGanttInteractions({
      auditId: 'audit-1',
      planBoardHydration: HYDRATION,
      projection: PROJECTION,
      data: {
        timelineTasks: overridesArgs?.timelineTasks ?? [TASK_A, TASK_B],
        groups: GROUPS,
        timelineEditableTaskIds: overridesArgs?.editableIds ?? new Set(['a']),
        boardRowByPackNodeId: new Map([['a', BOARD_ROW]]),
        timelineBoardEditEnabled: true,
        focusedTask: overridesArgs?.focusedTask ?? TASK_A,
        applyOverride: applyOverrideMock,
        revertOverride: revertOverrideMock,
        timelineTaskOverrides: overrides,
      },
      viewport: { focusTaskBarEl: focusTaskBarElMock },
      state: {
        activePanel: overridesArgs?.activePanel ?? 'timeline',
        dependencySort: overridesArgs?.dependencySort ?? { key: 'from', direction: 'asc' },
      },
      ids: { mainTabTimelineId: 'tab-timeline', mainTabDependenciesId: 'tab-deps' },
      resetView: resetViewMock,
      setters: {
        setSelectedTaskId: setSelectedMock,
        setFocusedTaskId: setFocusedMock,
        setLaneFilter: setLaneFilterMock,
        setLaneMoveMenuOpen: setLaneMoveMenuOpenMock,
        setGridNavAnnouncement: setGridNavAnnouncementMock,
        setMainPanelTabAnnouncement: setMainPanelTabAnnouncementMock,
        setActivePanel: setActivePanelMock,
        setDependenciesTab: setDependenciesTabMock,
        setShowAdvancedControls: setShowAdvancedControlsMock,
        setRoadmapToolbarMoreOpen: setRoadmapToolbarMoreOpenMock,
        setDependencySort: setDependencySortMock,
      },
    }),
  );
}

function makeKeyEvent(key: string): React.KeyboardEvent<HTMLDivElement> {
  const target = document.createElement('div');
  return {
    key,
    target,
    currentTarget: target,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLDivElement>;
}

function makeTablistKeyEvent(key: string, opts: { tabInside: boolean } = { tabInside: true }) {
  const tablist = document.createElement('div');
  const tab = document.createElement('button');
  tab.setAttribute('role', 'tab');
  if (opts.tabInside) {
    tablist.appendChild(tab);
  }
  return {
    key,
    target: opts.tabInside ? tab : tablist,
    currentTarget: tablist,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLDivElement>;
}

describe('useRoadmapGanttInteractions — DnD/select (existing)', () => {
  it('handleTimelineItemMove fires PATCH with the optimistic override applied', async () => {
    mutateAsyncMock.mockResolvedValueOnce({ ok: true });
    const { result } = renderInteractions();
    const newStart = dayjs('2026-02-01').valueOf();

    await act(async () => {
      result.current.handleTimelineItemMove('a', newStart, 1); // index 1 = marketing_narrative
    });

    expect(applyOverrideMock).toHaveBeenCalled();
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
    expect(applyOverrideMock).not.toHaveBeenCalled();
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
    expect(applyOverrideMock).not.toHaveBeenCalled();
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

describe('useRoadmapGanttInteractions — lane focus & sort', () => {
  it('applyLaneFocusFilter writes lane id, closes menu, announces lane label', () => {
    const { result } = renderInteractions();
    act(() => {
      result.current.applyLaneFocusFilter({ id: 'tech_delivery', title: 'Tech delivery' });
    });
    expect(setLaneFilterMock).toHaveBeenCalledWith('tech_delivery');
    expect(setLaneMoveMenuOpenMock).toHaveBeenCalledWith(false);
    expect(setGridNavAnnouncementMock).toHaveBeenCalledOnce();
    const ann = setGridNavAnnouncementMock.mock.calls[0]?.[0] as string;
    expect(ann).toContain('Tech delivery');
  });

  it('toggleDependencySort resets direction to asc when key changes', () => {
    const { result } = renderInteractions({ dependencySort: { key: 'from', direction: 'desc' } });
    act(() => {
      result.current.toggleDependencySort('to');
    });
    const updater = setDependencySortMock.mock.calls[0]?.[0] as (
      prev: { key: 'from' | 'to' | 'type'; direction: 'asc' | 'desc' },
    ) => { key: 'from' | 'to' | 'type'; direction: 'asc' | 'desc' };
    expect(updater({ key: 'from', direction: 'desc' })).toEqual({ key: 'to', direction: 'asc' });
  });

  it('sortArrow returns ▲ for matching ascending key', () => {
    const { result } = renderInteractions({ dependencySort: { key: 'from', direction: 'asc' } });
    expect(result.current.sortArrow('from')).toBe(' ▲');
    expect(result.current.sortArrow('to')).toBe('');
  });
});

describe('useRoadmapGanttInteractions — timeline grid keyboard', () => {
  it('"?" shortcut shows advanced controls', () => {
    const { result } = renderInteractions();
    const event = makeKeyEvent('?');
    act(() => result.current.handleTimelineGridKeyDown(event));
    expect(setShowAdvancedControlsMock).toHaveBeenCalledWith(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('"r" shortcut calls resetView', () => {
    const { result } = renderInteractions();
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('r')));
    expect(resetViewMock).toHaveBeenCalledOnce();
  });

  it('"t"/"d" shortcuts switch active panel', () => {
    const { result } = renderInteractions();
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('t')));
    expect(setActivePanelMock).toHaveBeenLastCalledWith('timeline');
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('d')));
    expect(setActivePanelMock).toHaveBeenLastCalledWith('dependencies');
  });

  it('Enter on a focused task opens task details and announces it', () => {
    const { result } = renderInteractions({ focusedTask: TASK_A });
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('Enter')));
    expect(setSelectedMock).toHaveBeenLastCalledWith('a');
    const ann = setGridNavAnnouncementMock.mock.calls[0]?.[0] as string;
    expect(ann).toContain('a');
  });

  it('Enter on a milestone is a no-op', () => {
    const { result } = renderInteractions({ focusedTask: MILESTONE, timelineTasks: [MILESTONE] });
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('Enter')));
    expect(setSelectedMock).not.toHaveBeenCalled();
  });

  it('ArrowDown moves focus to the nearest task and focuses its bar element', () => {
    const { result } = renderInteractions({ focusedTask: TASK_A });
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('ArrowDown')));
    expect(setFocusedMock).toHaveBeenLastCalledWith('b');
    expect(focusTaskBarElMock).toHaveBeenCalledWith('b');
  });

  it('ArrowRight on the last task announces a navigation boundary', () => {
    const { result } = renderInteractions({ focusedTask: TASK_A, timelineTasks: [TASK_A] });
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('ArrowRight')));
    const ann = setGridNavAnnouncementMock.mock.calls[0]?.[0] as string;
    expect(ann).toBeTruthy();
    expect(setFocusedMock).not.toHaveBeenCalled();
  });

  it('"m" shortcut opens lane move menu when eligible', () => {
    const { result } = renderInteractions({ focusedTask: TASK_A });
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('m')));
    expect(setLaneMoveMenuOpenMock).toHaveBeenCalledWith(true);
  });

  it('"m" shortcut is a no-op for milestones', () => {
    const { result } = renderInteractions({ focusedTask: MILESTONE, timelineTasks: [MILESTONE] });
    act(() => result.current.handleTimelineGridKeyDown(makeKeyEvent('m')));
    expect(setLaneMoveMenuOpenMock).not.toHaveBeenCalled();
  });
});

describe('useRoadmapGanttInteractions — main panel tablist keyboard', () => {
  it('ignores keys when target is not a tab', () => {
    const { result } = renderInteractions();
    const event = makeTablistKeyEvent('ArrowRight', { tabInside: false });
    act(() => result.current.handleMainPanelTablistKeyDown(event));
    expect(setActivePanelMock).not.toHaveBeenCalled();
  });

  it('ignores non-arrow keys', () => {
    const { result } = renderInteractions();
    const event = makeTablistKeyEvent('Enter');
    act(() => result.current.handleMainPanelTablistKeyDown(event));
    expect(setActivePanelMock).not.toHaveBeenCalled();
  });

  it('ArrowRight from timeline switches to dependencies', () => {
    const { result } = renderInteractions({ activePanel: 'timeline' });
    act(() => result.current.handleMainPanelTablistKeyDown(makeTablistKeyEvent('ArrowRight')));
    expect(setActivePanelMock).toHaveBeenLastCalledWith('dependencies');
    expect(setMainPanelTabAnnouncementMock).toHaveBeenCalledOnce();
  });

  it('Home jumps to timeline; End jumps to dependencies', () => {
    const { result } = renderInteractions({ activePanel: 'dependencies' });
    act(() => result.current.handleMainPanelTablistKeyDown(makeTablistKeyEvent('Home')));
    expect(setActivePanelMock).toHaveBeenLastCalledWith('timeline');
    act(() => result.current.handleMainPanelTablistKeyDown(makeTablistKeyEvent('End')));
    expect(setActivePanelMock).toHaveBeenLastCalledWith('dependencies');
  });
});
