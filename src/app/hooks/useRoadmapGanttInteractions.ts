import {
  useCallback,
  type KeyboardEvent,
} from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { ROADMAP_GANTT_DAY_MS } from '../config/roadmap-gantt-view-preferences';
import type { PlanBoardCardDto } from '../data/api/audits-orchestration';
import { usePatchPlanBoardCardMutation } from '../data/api/plan-board-queries';
import type { RoadmapGanttPlanBoardHydration } from '../components/roadmap-gantt/types';
import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttProjection,
  type RoadmapGanttTask,
} from '../lib/roadmap-gantt-mapper';
import {
  type RoadmapGanttDependencySort,
  type RoadmapGanttDependencySortKey,
} from '../lib/roadmap-gantt-dependency-filters';
import { invalidatePlanWorkspaceQueries } from '../lib/plan-workspace-queries';
import { useQueryClient } from '../lib/tanstack-react-query';
import {
  type RoadmapGanttTimelineTaskOverrides,
} from '../lib/roadmap-gantt-timeline-overrides';
import {
  pickArrowKeyMsDelta,
  pickGridShortcutAction,
} from '../lib/roadmap-gantt-keyboard-grid';
import { pickNearestTimelineTaskForTime } from '../lib/roadmap-gantt-viewport';
import {
  dependencySortReducer,
  formatDependencySortArrow,
  pickNextActivePanel,
  type RoadmapGanttActivePanel,
  type RoadmapGanttDependenciesTab,
} from '../lib/roadmap-gantt-view-model';

export type UseRoadmapGanttInteractionsArgs = {
  auditId: string;
  planBoardHydration: RoadmapGanttPlanBoardHydration;
  /** Used by the keyboard handler for lane labels and lane-move eligibility. */
  projection: Pick<RoadmapGanttProjection, 'lanes'>;
  /** Slice of the data hook the interactions need (timeline tasks, focused task, edit gating, etc.). */
  data: {
    timelineTasks: ReadonlyArray<RoadmapGanttTask>;
    groups: ReadonlyArray<TimelineGroupBase>;
    timelineEditableTaskIds: ReadonlySet<string>;
    boardRowByPackNodeId: ReadonlyMap<string, PlanBoardCardDto>;
    timelineBoardEditEnabled: boolean;
    focusedTask: RoadmapGanttTask | null;
    applyOverride: (target: { taskId: string; startMs: number; endMs: number; groupId: string }) => void;
    revertOverride: (
      taskId: string,
      restored: RoadmapGanttTimelineTaskOverrides[string] | null | undefined,
    ) => void;
    timelineTaskOverrides: RoadmapGanttTimelineTaskOverrides;
  };
  /** Imperative DOM helper used to focus a task bar after keyboard navigation. */
  viewport: { focusTaskBarEl: (taskId: string) => void };
  /** Current state read by handlers (clean separation from setters). */
  state: { activePanel: RoadmapGanttActivePanel; dependencySort: RoadmapGanttDependencySort };
  /** Tab `aria-controls` ids; the tablist keyboard handler focuses them via rAF. */
  ids: { mainTabTimelineId: string; mainTabDependenciesId: string };
  /** Reset handler is owned by `useRoadmapGanttActions`, passed in to break the dependency cycle. */
  resetView: () => void;
  setters: {
    setSelectedTaskId: Dispatch<SetStateAction<string | null>>;
    setFocusedTaskId: Dispatch<SetStateAction<string | null>>;
    setLaneFilter: Dispatch<SetStateAction<string>>;
    setLaneMoveMenuOpen: Dispatch<SetStateAction<boolean>>;
    setGridNavAnnouncement: Dispatch<SetStateAction<string>>;
    setMainPanelTabAnnouncement: Dispatch<SetStateAction<string>>;
    setActivePanel: Dispatch<SetStateAction<RoadmapGanttActivePanel>>;
    setDependenciesTab: Dispatch<SetStateAction<RoadmapGanttDependenciesTab>>;
    setShowAdvancedControls: Dispatch<SetStateAction<boolean>>;
    setRoadmapToolbarMoreOpen: Dispatch<SetStateAction<boolean>>;
    setDependencySort: Dispatch<SetStateAction<RoadmapGanttDependencySort>>;
  };
};

export type UseRoadmapGanttInteractionsResult = {
  handleTimelineItemMove: (itemId: number | string, dragTime: number, newGroupOrder: number) => void;
  handleTimelineItemResize: (itemId: number | string, time: number, edge: 'left' | 'right') => void;
  selectTask: (taskId: string) => void;
  applyLaneFocusFilter: (lane: { id: string; title: string }) => void;
  handleTimelineGridKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleMainPanelTablistKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  toggleDependencySort: (key: RoadmapGanttDependencySortKey) => void;
  sortArrow: (key: RoadmapGanttDependencySortKey) => string;
};

/**
 * Timeline interactions for the Roadmap Gantt: drag/resize/select, lane-focus filter,
 * dependency-sort toggle, timeline-grid and main-panel tablist keyboard navigation.
 *
 * Optimistic updates (`handleTimelineItemMove` / `handleTimelineItemResize`) apply an
 * override on the data hook, fire `PATCH /plan-board/cards/:id`, and revert on rejection.
 * Edits are gated by `timelineEditableTaskIds`; the milestone lane is rejected at the move
 * boundary.
 *
 * Internal: not exported from `useRoadmapGanttView` and not used outside of it.
 */
export function useRoadmapGanttInteractions(
  args: UseRoadmapGanttInteractionsArgs,
): UseRoadmapGanttInteractionsResult {
  const {
    auditId,
    planBoardHydration,
    projection,
    data,
    viewport,
    state,
    ids,
    resetView,
    setters,
  } = args;
  const {
    timelineTasks,
    groups,
    timelineEditableTaskIds,
    boardRowByPackNodeId,
    timelineBoardEditEnabled,
    focusedTask,
    applyOverride,
    revertOverride,
    timelineTaskOverrides,
  } = data;
  const {
    setSelectedTaskId,
    setFocusedTaskId,
    setLaneFilter,
    setLaneMoveMenuOpen,
    setGridNavAnnouncement,
    setMainPanelTabAnnouncement,
    setActivePanel,
    setDependenciesTab,
    setShowAdvancedControls,
    setRoadmapToolbarMoreOpen,
    setDependencySort,
  } = setters;

  const qc = useQueryClient();
  const patchBoardCardMutation = usePatchPlanBoardCardMutation({ auditId });

  // ---------- DnD/resize helpers ----------

  const updateTaskDatesFromTimeline = useCallback(
    async (target: { taskId: string; startMs: number; endMs: number; groupId: string }) => {
      const boardRow = boardRowByPackNodeId.get(target.taskId);
      if (!boardRow || !timelineBoardEditEnabled || !planBoardHydration) return;
      const prev = timelineTaskOverrides[target.taskId];
      applyOverride(target);
      try {
        await patchBoardCardMutation.mutateAsync({
          cardId: boardRow.id,
          body: {
            expected_pack_version: planBoardHydration.packVersionUsed,
            start_date: dayjs(target.startMs).format('YYYY-MM-DD'),
            end_date: dayjs(target.endMs).format('YYYY-MM-DD'),
            due_date: dayjs(target.endMs).format('YYYY-MM-DD'),
            lane: target.groupId !== ROADMAP_GANTT_MILESTONE_LANE_ID ? target.groupId : undefined,
          },
        });
        await invalidatePlanWorkspaceQueries(qc, auditId);
      } catch {
        revertOverride(target.taskId, prev);
        toast.error(ORCHESTRATION_UI_COPY.planRoadmapTimelineQueryFailedBody);
      }
    },
    [
      auditId,
      boardRowByPackNodeId,
      patchBoardCardMutation,
      planBoardHydration,
      qc,
      applyOverride,
      revertOverride,
      timelineTaskOverrides,
      timelineBoardEditEnabled,
    ],
  );

  const handleTimelineItemMove = useCallback(
    (itemId: number | string, dragTime: number, newGroupOrder: number) => {
      const taskId = String(itemId);
      if (!timelineEditableTaskIds.has(taskId)) return;
      const current = timelineTasks.find((task) => task.id === taskId && task.kind === 'task');
      if (!current) return;
      const nextGroupId = groups[newGroupOrder]?.id;
      if (typeof nextGroupId !== 'string' || nextGroupId === ROADMAP_GANTT_MILESTONE_LANE_ID) return;
      const duration = Math.max(ROADMAP_GANTT_DAY_MS, current.end_time - current.start_time);
      void updateTaskDatesFromTimeline({
        taskId,
        startMs: dragTime,
        endMs: dragTime + duration,
        groupId: nextGroupId,
      });
    },
    [groups, timelineEditableTaskIds, timelineTasks, updateTaskDatesFromTimeline],
  );

  const handleTimelineItemResize = useCallback(
    (itemId: number | string, time: number, edge: 'left' | 'right') => {
      const taskId = String(itemId);
      if (!timelineEditableTaskIds.has(taskId)) return;
      const current = timelineTasks.find((task) => task.id === taskId && task.kind === 'task');
      if (!current) return;
      const nextStart = edge === 'left' ? Math.min(time, current.end_time - ROADMAP_GANTT_DAY_MS) : current.start_time;
      const nextEnd = edge === 'right' ? Math.max(time, current.start_time + ROADMAP_GANTT_DAY_MS) : current.end_time;
      void updateTaskDatesFromTimeline({
        taskId,
        startMs: nextStart,
        endMs: nextEnd,
        groupId: current.group,
      });
    },
    [timelineEditableTaskIds, timelineTasks, updateTaskDatesFromTimeline],
  );

  const selectTask = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      setFocusedTaskId(taskId);
    },
    [setFocusedTaskId, setSelectedTaskId],
  );

  // ---------- Lane focus + dependency sort ----------

  const applyLaneFocusFilter = useCallback(
    (lane: { id: string; title: string }) => {
      setLaneFilter(String(lane.id));
      setLaneMoveMenuOpen(false);
      setGridNavAnnouncement(
        ORCHESTRATION_UI_COPY.roadmapGanttKeyboardLaneFilterAnnouncement.replace('{lane}', lane.title),
      );
    },
    [setGridNavAnnouncement, setLaneFilter, setLaneMoveMenuOpen],
  );

  const toggleDependencySort = useCallback(
    (key: RoadmapGanttDependencySortKey) => {
      setDependencySort((prev) => dependencySortReducer(prev, key));
    },
    [setDependencySort],
  );

  const sortArrow = useCallback(
    (key: RoadmapGanttDependencySortKey) => formatDependencySortArrow(state.dependencySort, key),
    [state.dependencySort],
  );

  // ---------- Keyboard handlers ----------

  const handleTimelineGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const action = pickGridShortcutAction(event.key);
      switch (action.kind) {
        case 'help':
          event.preventDefault();
          setShowAdvancedControls(true);
          return;
        case 'panel-timeline':
          event.preventDefault();
          setActivePanel('timeline');
          return;
        case 'panel-deps':
          event.preventDefault();
          setActivePanel('dependencies');
          return;
        case 'tab-graph':
          event.preventDefault();
          setDependenciesTab('graph');
          return;
        case 'tab-table':
          event.preventDefault();
          setDependenciesTab('table');
          return;
        case 'toolbar-more':
          event.preventDefault();
          setRoadmapToolbarMoreOpen(true);
          setShowAdvancedControls((prev) => !prev);
          return;
        case 'reset':
          event.preventDefault();
          resetView();
          return;
        case 'lane-menu': {
          const t = focusedTask ?? timelineTasks[0] ?? null;
          if (
            t &&
            t.kind === 'task' &&
            t.group !== ROADMAP_GANTT_MILESTONE_LANE_ID &&
            projection.lanes.some((lane) => lane.id !== ROADMAP_GANTT_MILESTONE_LANE_ID)
          ) {
            event.preventDefault();
            setLaneMoveMenuOpen(true);
            setGridNavAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttLaneMoveMenuOpenedAnnouncement);
          }
          return;
        }
        case 'noop':
        default:
          break;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
      const anchorTask = focusedTask ?? timelineTasks[0] ?? null;
      if (!anchorTask) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (anchorTask.kind === 'milestone') return;
        setSelectedTaskId(anchorTask.id);
        const laneLabel =
          projection.lanes.find((l) => l.id === anchorTask.group)?.title ?? String(anchorTask.group);
        setGridNavAnnouncement(
          ORCHESTRATION_UI_COPY.roadmapGanttKeyboardTaskOpenedAnnouncement
            .replace('{title}', anchorTask.title)
            .replace('{lane}', laneLabel),
        );
        return;
      }

      const delta = pickArrowKeyMsDelta(event.key);
      if (delta === 0) return;

      event.preventDefault();
      const anchorTime = Math.floor((anchorTask.start_time + anchorTask.end_time) / 2);
      const nextTask = pickNearestTimelineTaskForTime(timelineTasks, anchorTime + delta);
      if (!nextTask || nextTask.id === anchorTask.id) {
        setGridNavAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttKeyboardNavigationBoundaryAnnouncement);
        return;
      }
      setFocusedTaskId(nextTask.id);
      viewport.focusTaskBarEl(nextTask.id);
    },
    [
      focusedTask,
      projection.lanes,
      resetView,
      setActivePanel,
      setDependenciesTab,
      setFocusedTaskId,
      setGridNavAnnouncement,
      setLaneMoveMenuOpen,
      setRoadmapToolbarMoreOpen,
      setSelectedTaskId,
      setShowAdvancedControls,
      timelineTasks,
      viewport,
    ],
  );

  const handleMainPanelTablistKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
        return;
      }
      const rawTarget = event.target as HTMLElement | null;
      const tabEl = rawTarget?.closest('[role="tab"]');
      if (!(tabEl instanceof HTMLElement) || !event.currentTarget.contains(tabEl)) {
        return;
      }
      event.preventDefault();
      const focusTabByPanel = (panel: RoadmapGanttActivePanel) => {
        const id = panel === 'timeline' ? ids.mainTabTimelineId : ids.mainTabDependenciesId;
        window.requestAnimationFrame(() => document.getElementById(id)?.focus());
      };
      if (event.key === 'Home') {
        setActivePanel('timeline');
        setMainPanelTabAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementTimeline);
        focusTabByPanel('timeline');
        return;
      }
      if (event.key === 'End') {
        setActivePanel('dependencies');
        setMainPanelTabAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementDependencies);
        focusTabByPanel('dependencies');
        return;
      }
      const next = pickNextActivePanel(state.activePanel, event.key === 'ArrowRight' ? 'forward' : 'backward');
      setActivePanel(next);
      setMainPanelTabAnnouncement(
        next === 'timeline'
          ? ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementTimeline
          : ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementDependencies,
      );
      focusTabByPanel(next);
    },
    [
      ids.mainTabDependenciesId,
      ids.mainTabTimelineId,
      setActivePanel,
      setMainPanelTabAnnouncement,
      state.activePanel,
    ],
  );

  return {
    handleTimelineItemMove,
    handleTimelineItemResize,
    selectTask,
    applyLaneFocusFilter,
    handleTimelineGridKeyDown,
    handleMainPanelTablistKeyDown,
    toggleDependencySort,
    sortArrow,
  };
}
