import { useMemo, useRef } from 'react';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import { ROADMAP_GANTT_DEPENDENCY_LANE_ROW_PX, ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD } from '../config/roadmap-gantt-view-preferences';
import { buildDependencySvgPathMap } from '../lib/roadmap-gantt-dependency-paths';
import type {
  RoadmapGanttDependency,
  RoadmapGanttProjection,
  RoadmapGanttTask,
} from '../lib/roadmap-gantt-mapper';

const EMPTY_TASK_MAP = new Map<string, RoadmapGanttTask>();

export type DependencySvgCoordHelpers = {
  mapX: (ts: number) => number;
  mapY: (laneId: string) => number;
  dependencyCanvasHeight: number;
  timelineRangeMs: number;
};

/**
 * Memoized dependency-edge SVG geometry for the Gantt graph tab.
 * Skips path building entirely for heavy loads (threshold in preferences).
 * When {@link args.freezeGeometry} is true, returns the last computed path map (e.g. while scrubbing the overview strip) to avoid rebuild churn.
 */
export function useRoadmapGanttDependencySvgPaths(args: {
  filteredTasks: RoadmapGanttTask[];
  groups: TimelineGroupBase[];
  projection: Pick<RoadmapGanttProjection, 'defaultTimeStart' | 'defaultTimeEnd'>;
  visibleDependencies: RoadmapGanttDependency[];
  freezeGeometry?: boolean;
}): {
  dependencySvgPathsByDepId: ReadonlyMap<string, string>;
} & DependencySvgCoordHelpers {
  const { filteredTasks, groups, projection, visibleDependencies, freezeGeometry = false } = args;

  const laneIndexById = useMemo(
    () => new Map(groups.map((lane, index) => [String(lane.id), index] as const)),
    [groups],
  );
  const laneHeight = ROADMAP_GANTT_DEPENDENCY_LANE_ROW_PX;
  const timelineRangeMs = Math.max(projection.defaultTimeEnd - projection.defaultTimeStart, 1);
  const dependencyCanvasHeight = Math.max(groups.length * laneHeight + 24, 120);

  const mapX = useMemo(
    () => (ts: number) => ((ts - projection.defaultTimeStart) / timelineRangeMs) * 100,
    [projection.defaultTimeStart, timelineRangeMs],
  );
  const mapY = useMemo(
    () => (laneId: string) => (laneIndexById.get(laneId) ?? 0) * laneHeight + laneHeight * 0.5 + 12,
    [laneHeight, laneIndexById],
  );

  const isHeavyTaskLoad = filteredTasks.length >= ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD;

  const dependencyPathLayout = useMemo(
    () => ({
      defaultTimeStart: projection.defaultTimeStart,
      defaultTimeEnd: projection.defaultTimeEnd,
      laneIndexById,
      laneHeight,
    }),
    [laneHeight, laneIndexById, projection.defaultTimeEnd, projection.defaultTimeStart],
  );

  const taskByIdForDependencyPaths = useMemo(() => {
    if (isHeavyTaskLoad) return EMPTY_TASK_MAP;
    return new Map(filteredTasks.map((task) => [task.id, task] as const));
  }, [filteredTasks, isHeavyTaskLoad]);

  const dependencySvgPathsByDepIdComputed = useMemo(
    () =>
      isHeavyTaskLoad
        ? new Map<string, string>()
        : buildDependencySvgPathMap(visibleDependencies, taskByIdForDependencyPaths, dependencyPathLayout),
    [dependencyPathLayout, isHeavyTaskLoad, taskByIdForDependencyPaths, visibleDependencies],
  );

  const frozenSnapshotRef = useRef(dependencySvgPathsByDepIdComputed);
  if (!freezeGeometry) {
    frozenSnapshotRef.current = dependencySvgPathsByDepIdComputed;
  }
  const dependencySvgPathsByDepId = freezeGeometry ? frozenSnapshotRef.current : dependencySvgPathsByDepIdComputed;

  return {
    dependencySvgPathsByDepId,
    mapX,
    mapY,
    dependencyCanvasHeight,
    timelineRangeMs,
  };
}
