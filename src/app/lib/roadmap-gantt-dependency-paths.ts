import type { DependencyKind } from './roadmap-gantt-mapper';

/** Shared layout for Bézier arrows in roadmap dependency overlays (timeline + SVG graph). */
export type RoadmapGanttDependencyPathLayout = {
  defaultTimeStart: number;
  defaultTimeEnd: number;
  laneIndexById: Map<string, number>;
  laneHeight: number;
};

type TaskSpan = {
  id: string;
  start_time: number;
  end_time: number;
  group: string;
};

/**
 * Computes a cubic Bézier path between two roadmap tasks on a normalized 0–100 X axis,
 * keyed by timestamps and lane stacking order.
 */
export function pathForRoadmapDependency(
  dep: { from: string; to: string; kind: DependencyKind },
  taskById: Map<string, TaskSpan>,
  layout: RoadmapGanttDependencyPathLayout,
): string | null {
  const from = taskById.get(dep.from);
  const to = taskById.get(dep.to);
  if (!from || !to) return null;

  const range = Math.max(layout.defaultTimeEnd - layout.defaultTimeStart, 1);
  const mapXLocal = (ts: number) => ((ts - layout.defaultTimeStart) / range) * 100;

  const { laneHeight, laneIndexById } = layout;
  const mapYLocal = (laneId: string) => (laneIndexById.get(laneId) ?? 0) * laneHeight + laneHeight * 0.5 + 12;

  const k = dep.kind;
  const startX = k === 'SS' || k === 'SF' ? mapXLocal(from.start_time) : mapXLocal(from.end_time);
  const endX = k === 'SS' || k === 'FS' ? mapXLocal(to.start_time) : mapXLocal(to.end_time);
  const y1 = mapYLocal(from.group);
  const y2 = mapYLocal(to.group);
  const controlX = startX + (endX - startX) * 0.4;
  return `M ${startX} ${y1} C ${controlX} ${y1}, ${controlX} ${y2}, ${endX} ${y2}`;
}

/** Memo-friendly map keyed by dependency id (skips unresolved endpoints). */
export function buildDependencySvgPathMap<
  Dep extends { id: string; from: string; to: string; kind: DependencyKind },
>(deps: Dep[], taskById: Map<string, TaskSpan>, layout: RoadmapGanttDependencyPathLayout): Map<string, string> {
  const m = new Map<string, string>();
  for (const dep of deps) {
    const d = pathForRoadmapDependency(dep, taskById, layout);
    if (d) m.set(dep.id, d);
  }
  return m;
}
