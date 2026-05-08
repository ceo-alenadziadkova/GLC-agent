import type { RoadmapGanttDependency, RoadmapGanttTask } from './roadmap-gantt-mapper';

/**
 * Build a predicate that decides whether a dependency should be visually dimmed because
 * it falls outside of the currently focused task chain.
 *
 * Dimming is only active when:
 * - chain highlighting is enabled (`chainTaskIds` is non-null), AND
 * - a task is selected and exists as a `task` kind in the projection.
 *
 * Dependencies that touch any task outside of `chainTaskIds` should be dimmed.
 */
export function buildDependencyChainShouldDim(args: {
  chainTaskIds: ReadonlySet<string> | null;
  selectedTaskId: string | null;
  projectionTasks: readonly RoadmapGanttTask[];
}): (dep: RoadmapGanttDependency) => boolean {
  const { chainTaskIds, selectedTaskId, projectionTasks } = args;
  const selectionIsValidTask = Boolean(
    selectedTaskId && projectionTasks.some((t) => t.id === selectedTaskId && t.kind === 'task'),
  );
  return (dep: RoadmapGanttDependency) =>
    chainTaskIds != null && selectionIsValidTask && (!chainTaskIds.has(dep.from) || !chainTaskIds.has(dep.to));
}
