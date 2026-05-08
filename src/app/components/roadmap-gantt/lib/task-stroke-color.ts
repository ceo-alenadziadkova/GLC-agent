import type { DependencyKind, RoadmapGanttDependency } from '../../../lib/roadmap-gantt-mapper';

/** Resolve the stroke colour CSS variable for a dependency kind. */
export function strokeForKind(kind: DependencyKind | string): string {
  if (kind === 'FS') return 'var(--score-5)';
  if (kind === 'SS') return 'var(--glc-blue)';
  if (kind === 'FF') return 'var(--score-3)';
  return 'var(--text-tertiary)';
}

/** Resolve the dependency segment stroke; critical-path edges win over kind colour. */
export function strokeForDependencySeg(dep: RoadmapGanttDependency): string {
  if (dep.onCriticalPath) return 'var(--glc-blue)';
  return strokeForKind(dep.kind);
}
