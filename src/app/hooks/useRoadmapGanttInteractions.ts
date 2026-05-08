import { useCallback, type Dispatch, type SetStateAction } from 'react';
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
  type RoadmapGanttTask,
} from '../lib/roadmap-gantt-mapper';
import { invalidatePlanWorkspaceQueries } from '../lib/plan-workspace-queries';
import { useQueryClient } from '../lib/tanstack-react-query';
import {
  applyTimelineTaskOverride,
  revertTimelineTaskOverride,
  type RoadmapGanttTimelineTaskOverrides,
} from '../lib/roadmap-gantt-timeline-overrides';

export type UseRoadmapGanttInteractionsArgs = {
  auditId: string;
  planBoardHydration: RoadmapGanttPlanBoardHydration;
  timelineTasks: readonly RoadmapGanttTask[];
  groups: readonly TimelineGroupBase[];
  timelineEditableTaskIds: ReadonlySet<string>;
  boardRowByPackNodeId: ReadonlyMap<string, PlanBoardCardDto>;
  timelineBoardEditEnabled: boolean;
  /**
   * Direct setter on the data hook. The interactions hook applies an optimistic override
   * before the PATCH and reverts on rejection — both via functional updaters from
   * `roadmap-gantt-timeline-overrides`.
   */
  setTimelineTaskOverrides: Dispatch<SetStateAction<RoadmapGanttTimelineTaskOverrides>>;
  setSelectedTaskId: Dispatch<SetStateAction<string | null>>;
  setFocusedTaskId: Dispatch<SetStateAction<string | null>>;
};

export type UseRoadmapGanttInteractionsResult = {
  handleTimelineItemMove: (itemId: number | string, dragTime: number, newGroupOrder: number) => void;
  handleTimelineItemResize: (itemId: number | string, time: number, edge: 'left' | 'right') => void;
  selectTask: (taskId: string) => void;
};

/**
 * Drag/resize/select interactions for the Roadmap Gantt timeline.
 *
 * `handleTimelineItemMove` and `handleTimelineItemResize` apply an optimistic override on
 * the data hook, fire `PATCH /plan-board/cards/:id`, then revert on rejection so the bar
 * snaps back to its previous range. Edits are gated by `timelineEditableTaskIds` and the
 * milestone lane is rejected at the move boundary.
 *
 * Internal: not exported from `useRoadmapGanttView` and not used outside of it.
 */
export function useRoadmapGanttInteractions(
  args: UseRoadmapGanttInteractionsArgs,
): UseRoadmapGanttInteractionsResult {
  const {
    auditId,
    planBoardHydration,
    timelineTasks,
    groups,
    timelineEditableTaskIds,
    boardRowByPackNodeId,
    timelineBoardEditEnabled,
    setTimelineTaskOverrides,
    setSelectedTaskId,
    setFocusedTaskId,
  } = args;

  const qc = useQueryClient();
  const patchBoardCardMutation = usePatchPlanBoardCardMutation({ auditId });

  const updateTaskDatesFromTimeline = useCallback(
    async (target: { taskId: string; startMs: number; endMs: number; groupId: string }) => {
      const boardRow = boardRowByPackNodeId.get(target.taskId);
      if (!boardRow || !timelineBoardEditEnabled || !planBoardHydration) return;
      let prev: RoadmapGanttTimelineTaskOverrides[string] | undefined;
      setTimelineTaskOverrides((current) => {
        prev = current[target.taskId];
        return applyTimelineTaskOverride(current, target);
      });
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
        setTimelineTaskOverrides((current) => revertTimelineTaskOverride(current, target.taskId, prev));
        toast.error(ORCHESTRATION_UI_COPY.planRoadmapTimelineQueryFailedBody);
      }
    },
    [
      auditId,
      boardRowByPackNodeId,
      patchBoardCardMutation,
      planBoardHydration,
      qc,
      setTimelineTaskOverrides,
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

  return { handleTimelineItemMove, handleTimelineItemResize, selectTask };
}
