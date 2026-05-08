import type { RoadmapGanttTask } from './roadmap-gantt-mapper';

/**
 * Per-task timeline override storing the user-edited dates and lane while the
 * Plan Board PATCH is in flight. Persisted only in memory inside the controller hook.
 */
export type RoadmapGanttTimelineTaskOverride = {
  start_time: number;
  end_time: number;
  group: string;
};

export type RoadmapGanttTimelineTaskOverrides = Readonly<Record<string, RoadmapGanttTimelineTaskOverride>>;

/**
 * Apply pending timeline overrides on top of the filtered task list.
 *
 * Milestones are returned untouched; the lane id is validated by the caller before
 * an override is recorded, so we trust it here and cast to the lane union.
 */
export function mergeTimelineTaskOverrides(
  filteredTasks: readonly RoadmapGanttTask[],
  overrides: RoadmapGanttTimelineTaskOverrides,
): RoadmapGanttTask[] {
  return filteredTasks.map((task) => {
    if (task.kind !== 'task') return task;
    const override = overrides[task.id];
    if (!override) return task;
    return {
      ...task,
      start_time: override.start_time,
      end_time: override.end_time,
      // Lane id is validated by the caller (rejects milestone lane).
      group: override.group as RoadmapGanttTask['group'],
    };
  });
}

/**
 * Functional updater that records (or replaces) an override for a single task id.
 */
export function applyTimelineTaskOverride(
  prev: RoadmapGanttTimelineTaskOverrides,
  target: { taskId: string; startMs: number; endMs: number; groupId: string },
): RoadmapGanttTimelineTaskOverrides {
  return {
    ...prev,
    [target.taskId]: {
      start_time: target.startMs,
      end_time: target.endMs,
      group: target.groupId,
    },
  };
}

/**
 * Functional updater that reverts an override on rollback. If `restored` is provided
 * the override is replaced with it (e.g. previous in-flight value); otherwise the entry
 * is removed entirely so the task falls back to projection data.
 */
export function revertTimelineTaskOverride(
  prev: RoadmapGanttTimelineTaskOverrides,
  taskId: string,
  restored: RoadmapGanttTimelineTaskOverride | null | undefined,
): RoadmapGanttTimelineTaskOverrides {
  const next = { ...prev };
  if (restored) {
    next[taskId] = restored;
  } else {
    delete next[taskId];
  }
  return next;
}
