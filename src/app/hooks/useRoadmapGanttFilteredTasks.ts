import { useMemo } from 'react';

import type { RoadmapGanttProjection, RoadmapGanttTask } from '../lib/roadmap-gantt-mapper';

export type RoadmapGanttTaskFilterInputs = {
  titleQuery: string;
  criticalPathOnly: boolean;
  ownerFilter: string;
  statusFilter: 'all' | 'planned' | 'in-progress' | 'done';
  laneFilter: string;
  blockedOnly: boolean;
};

export function useRoadmapGanttFilteredTasks(projection: RoadmapGanttProjection, filters: RoadmapGanttTaskFilterInputs): {
  blockedTaskIds: ReadonlySet<string>;
  filteredTasks: RoadmapGanttTask[];
  filteredTaskIds: ReadonlySet<string>;
} {
  const blockedTaskIds = useMemo(() => {
    const taskIds = new Set<string>();
    for (const dep of projection.dependencies) {
      if (!dep.blocking) continue;
      taskIds.add(dep.to);
      taskIds.add(dep.from);
    }
    return taskIds;
  }, [projection.dependencies]);

  const filteredTasks = useMemo(() => {
    const q = filters.titleQuery.trim().toLowerCase();
    return projection.tasks.filter((task) => {
      if (filters.criticalPathOnly && !task.onCriticalPath) return false;
      if (q.length > 0 && !task.title.toLowerCase().includes(q)) return false;
      if (filters.ownerFilter !== 'all' && task.owner !== filters.ownerFilter) return false;
      if (filters.statusFilter !== 'all' && task.status !== filters.statusFilter) return false;
      if (filters.laneFilter !== 'all' && task.group !== filters.laneFilter) return false;
      if (filters.blockedOnly && !blockedTaskIds.has(task.id)) return false;
      return true;
    });
  }, [
    blockedTaskIds,
    filters.blockedOnly,
    filters.criticalPathOnly,
    filters.laneFilter,
    filters.ownerFilter,
    filters.statusFilter,
    filters.titleQuery,
    projection.tasks,
  ]);

  const filteredTaskIds = useMemo(() => new Set(filteredTasks.map((task) => task.id)), [filteredTasks]);

  return { blockedTaskIds, filteredTasks, filteredTaskIds };
}
