import type { TimelineGroupBase } from 'react-calendar-timeline';

import type { RoadmapGanttLane, RoadmapGanttTask } from '../../../lib/roadmap-gantt-mapper';
import { ROADMAP_GANTT_MILESTONE_LANE_ID } from '../../../lib/roadmap-gantt-mapper';

/**
 * Build `react-calendar-timeline` groups from projection lanes, dropping ones that have no
 * visible tasks after filtering. The milestone lane title is supplied by the caller (copy
 * lives in the locale module).
 */
export function buildGanttTimelineGroups(args: {
  projectionLanes: readonly RoadmapGanttLane[];
  timelineTasks: readonly RoadmapGanttTask[];
  milestoneLaneTitle: string;
}): TimelineGroupBase[] {
  const { projectionLanes, timelineTasks, milestoneLaneTitle } = args;
  const availableLaneIds = new Set(timelineTasks.map((task) => task.group));
  return projectionLanes
    .filter((lane) => availableLaneIds.has(lane.id))
    .map((lane) => ({
      id: lane.id,
      title: lane.id === ROADMAP_GANTT_MILESTONE_LANE_ID ? milestoneLaneTitle : lane.title,
    }));
}
