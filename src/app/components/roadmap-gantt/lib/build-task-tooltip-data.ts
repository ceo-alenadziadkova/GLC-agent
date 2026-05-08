import { ROADMAP_GANTT_DAY_MS } from '../../../config/roadmap-gantt-view-preferences';
import type {
  RoadmapGanttDependency,
  RoadmapGanttTask,
} from '../../../lib/roadmap-gantt-mapper';
import type { RoadmapGanttBaselineSnapshot } from '../../../lib/roadmap-gantt-baseline-storage';

export type RoadmapGanttBaselineGhost = {
  /** Left offset of the ghost bar within the current task bar, percent (0..100). */
  leftPct: number;
  /** Width of the ghost bar within the current task bar, percent (0..100). */
  widthPct: number;
};

export type RoadmapGanttTaskTooltipData = {
  durationDays: number;
  /** Fraction of schedule elapsed for the task (0..1). 0 for milestones. */
  scheduleElapsedPct: number;
  /** Flex-grow value applied to the slack tail (0 when slack is hidden or not applicable). */
  slackFlexGrow: number;
  /** Total-float days, rounded down. `null` when float data is unavailable or task is a milestone. */
  floatDays: number | null;
  /** Number of dependencies blocked directly downstream from this task. */
  blocksDirect: number;
  /** Number of dependencies that block this task directly upstream. */
  blockedByDirect: number;
  /** Geometry for the baseline overlap ghost or `null` when not applicable. */
  baselineGhost: RoadmapGanttBaselineGhost | null;
};

/**
 * Compute pure tooltip/visual data for a Gantt task bar.
 *
 * Time-dependent (`scheduleElapsedPct`) is derived from {@link nowMs}, which the caller
 * is expected to memoize per render to keep this helper deterministic and testable.
 */
export function buildTaskTooltipData(args: {
  task: RoadmapGanttTask;
  baselineSnapshot: RoadmapGanttBaselineSnapshot | null;
  projectionDependencies: readonly RoadmapGanttDependency[];
  showSlack: boolean;
  nowMs: number;
}): RoadmapGanttTaskTooltipData {
  const { task, baselineSnapshot, projectionDependencies, showSlack, nowMs } = args;

  const durationDays = Math.max(1, Math.ceil((task.end_time - task.start_time) / ROADMAP_GANTT_DAY_MS));

  let scheduleElapsedPct = 0;
  if (task.kind === 'task') {
    const span = Math.max(1, task.end_time - task.start_time);
    scheduleElapsedPct = Math.min(1, Math.max(0, (nowMs - task.start_time) / span));
  }

  let baselineGhost: RoadmapGanttBaselineGhost | null = null;
  if (baselineSnapshot) {
    const b = baselineSnapshot.tasks[task.id];
    if (b) {
      const curS = task.start_time;
      const curE = task.end_time;
      const barDur = Math.max(1, curE - curS);
      const oS = Math.max(curS, b.startMs);
      const oE = Math.min(curE, b.endMs);
      if (oE > oS) {
        baselineGhost = {
          leftPct: ((oS - curS) / barDur) * 100,
          widthPct: ((oE - oS) / barDur) * 100,
        };
      }
    }
  }

  const barDurForSlack = task.kind === 'task' ? Math.max(1, task.end_time - task.start_time) : 1;
  const totalFloatMs = task.kind === 'task' && task.totalFloatMs != null ? task.totalFloatMs : 0;
  const slackFlexGrow = showSlack && task.kind === 'task' && totalFloatMs > 0 ? totalFloatMs / barDurForSlack : 0;

  const blocksDirect =
    task.kind === 'task' ? projectionDependencies.filter((d) => d.from === task.id).length : 0;
  const blockedByDirect =
    task.kind === 'task' ? projectionDependencies.filter((d) => d.to === task.id).length : 0;

  const floatDays =
    task.kind === 'task' && task.totalFloatMs != null
      ? Math.max(0, Math.round(task.totalFloatMs / ROADMAP_GANTT_DAY_MS))
      : null;

  return {
    durationDays,
    scheduleElapsedPct,
    slackFlexGrow,
    floatDays,
    blocksDirect,
    blockedByDirect,
    baselineGhost,
  };
}
