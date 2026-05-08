export type RoadmapGanttScrollMetrics = {
  left: number;
  max: number;
  clientWidth: number;
};

export type RoadmapGanttOverviewWindowMetrics = {
  hasScrollableTimeline: boolean;
  /** Width of the overview "viewport" indicator, percent (0..100). */
  widthPct: number;
  /** Left offset of the overview "viewport" indicator, percent (0..100). */
  leftPct: number;
};

/**
 * Compute the proportional viewport indicator (width/left) shown on the overview strip,
 * given the current timeline scroll metrics.
 */
export function computeOverviewWindowMetrics(
  scrollMetrics: RoadmapGanttScrollMetrics,
): RoadmapGanttOverviewWindowMetrics {
  const hasScrollableTimeline = scrollMetrics.max > 2 && scrollMetrics.clientWidth > 0;
  if (!hasScrollableTimeline) {
    return { hasScrollableTimeline: false, widthPct: 100, leftPct: 0 };
  }
  const denom = Math.max(scrollMetrics.max + scrollMetrics.clientWidth, 1);
  const widthPct = Math.min((scrollMetrics.clientWidth / denom) * 100, 100);
  const leftPct = Math.min((scrollMetrics.left / denom) * 100, 100);
  return { hasScrollableTimeline: true, widthPct, leftPct };
}
