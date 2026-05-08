import dayjs from 'dayjs';

import type { RoadmapGanttTask } from './roadmap-gantt-mapper';

/**
 * Compute the right edge of the visible viewport based on the current time scale.
 * For the day scale, clamps the window to {@link dayRangeDays} after `defaultTimeStart`,
 * but never extends past the projection end.
 */
export function computeRoadmapGanttViewportEnd(args: {
  defaultTimeStart: number;
  defaultTimeEnd: number;
  isMonthScale: boolean;
  dayRangeDays: 30 | 60 | 90;
}): number {
  if (args.isMonthScale) return args.defaultTimeEnd;
  const dayViewEnd = dayjs(args.defaultTimeStart).add(args.dayRangeDays, 'day').endOf('day').valueOf();
  return Math.min(dayViewEnd, args.defaultTimeEnd);
}

/**
 * Pick the timeline task whose date range is closest to {@link targetTs}.
 * Tasks that contain the target time take priority over neighbouring ones.
 */
export function pickNearestTimelineTaskForTime(
  tasks: readonly RoadmapGanttTask[],
  targetTs: number,
): RoadmapGanttTask | null {
  if (tasks.length === 0) return null;
  const sorted = [...tasks].sort((a, b) => {
    const aInside = a.start_time <= targetTs && targetTs <= a.end_time;
    const bInside = b.start_time <= targetTs && targetTs <= b.end_time;
    if (aInside && !bInside) return -1;
    if (!aInside && bInside) return 1;
    const aDistance = Math.min(Math.abs(a.start_time - targetTs), Math.abs(a.end_time - targetTs));
    const bDistance = Math.min(Math.abs(b.start_time - targetTs), Math.abs(b.end_time - targetTs));
    return aDistance - bDistance;
  });
  return sorted[0] ?? null;
}
