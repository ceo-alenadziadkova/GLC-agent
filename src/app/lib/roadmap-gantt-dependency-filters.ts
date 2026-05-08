import { DEPENDENCY_KIND_LABEL } from './roadmap-gantt-dep-kind-labels';
import type { RoadmapGanttDependency, RoadmapGanttProjection } from './roadmap-gantt-mapper';

export type RoadmapGanttDependencyTypeFilter = 'all' | 'FS' | 'SS' | 'FF' | 'SF';
export type RoadmapGanttDependencyView = 'all' | 'selected' | 'hide-weak';
export type RoadmapGanttDependencySortKey = 'from' | 'to' | 'type';
export type RoadmapGanttDependencySortDirection = 'asc' | 'desc';
export type RoadmapGanttDependencySort = {
  key: RoadmapGanttDependencySortKey;
  direction: RoadmapGanttDependencySortDirection;
};

/** Filter dependencies for the Gantt graph and the dependency-pair table. */
export function filterRoadmapGanttVisibleDependencies(args: {
  deps: readonly RoadmapGanttDependency[];
  filteredTaskIds: ReadonlySet<string>;
  dependencyTypeFilter: RoadmapGanttDependencyTypeFilter;
  blockedOnly: boolean;
  dependencyView: RoadmapGanttDependencyView;
  selectedTaskId: string | null;
}): RoadmapGanttDependency[] {
  const { deps, filteredTaskIds, dependencyTypeFilter, blockedOnly, dependencyView, selectedTaskId } = args;
  return deps.filter((dep) => {
    if (!filteredTaskIds.has(dep.from) || !filteredTaskIds.has(dep.to)) return false;
    if (dependencyTypeFilter !== 'all' && dep.kind !== dependencyTypeFilter) return false;
    if (blockedOnly && !dep.blocking) return false;
    if (dependencyView === 'selected') {
      if (!selectedTaskId) return false;
      if (dep.from !== selectedTaskId && dep.to !== selectedTaskId) return false;
    }
    if (dependencyView === 'hide-weak' && dep.strength === 'weak') return false;
    return true;
  });
}

/** Stable, locale-aware sort over dependency rows used by the dependency-pair table. */
export function sortRoadmapGanttDependencies(args: {
  deps: readonly RoadmapGanttDependency[];
  taskTitleById: ReadonlyMap<string, string>;
  sort: RoadmapGanttDependencySort;
}): RoadmapGanttDependency[] {
  const { deps, taskTitleById, sort } = args;
  const list = [...deps];
  list.sort((a, b) => {
    const fromA = taskTitleById.get(a.from) ?? a.from;
    const fromB = taskTitleById.get(b.from) ?? b.from;
    const toA = taskTitleById.get(a.to) ?? a.to;
    const toB = taskTitleById.get(b.to) ?? b.to;
    const typeA = DEPENDENCY_KIND_LABEL[a.kind];
    const typeB = DEPENDENCY_KIND_LABEL[b.kind];

    const compareText = (x: string, y: string) => x.localeCompare(y, undefined, { sensitivity: 'base' });
    const compareId = a.id.localeCompare(b.id, undefined, { sensitivity: 'base' });
    const fromCmp = compareText(fromA, fromB);
    const toCmp = compareText(toA, toB);
    const typeCmp = compareText(typeA, typeB);

    let primary = 0;
    let secondary = 0;
    let tertiary = 0;
    if (sort.key === 'from') {
      primary = fromCmp;
      secondary = toCmp;
      tertiary = typeCmp;
    }
    if (sort.key === 'to') {
      primary = toCmp;
      secondary = fromCmp;
      tertiary = typeCmp;
    }
    if (sort.key === 'type') {
      primary = typeCmp;
      secondary = fromCmp;
      tertiary = toCmp;
    }

    const ordered = primary || secondary || tertiary || compareId;
    return sort.direction === 'asc' ? ordered : -ordered;
  });
  return list;
}

/** Highlighted task ids when the user hovers a dependency row/edge. */
export function buildHighlightedTaskIds(
  hoveredDependency: RoadmapGanttDependency | null,
): Set<string> {
  if (!hoveredDependency) return new Set<string>();
  return new Set<string>([hoveredDependency.from, hoveredDependency.to]);
}

/**
 * Compute the dependency-chain task set for the currently selected task.
 * Returns null when chain highlighting is disabled or the selection is unresolved.
 */
export function buildChainTaskIds(args: {
  projection: Pick<RoadmapGanttProjection, 'tasks' | 'upstreamByTask' | 'downstreamByTask'>;
  selectedTaskId: string | null;
  enabled: boolean;
}): Set<string> | null {
  const { projection, selectedTaskId, enabled } = args;
  if (!enabled || !selectedTaskId) return null;
  const core = projection.tasks.find((t) => t.id === selectedTaskId && t.kind === 'task');
  if (!core) return null;
  const up = projection.upstreamByTask.get(core.id) ?? new Set<string>();
  const down = projection.downstreamByTask.get(core.id) ?? new Set<string>();
  return new Set<string>([...up, ...down, core.id]);
}
