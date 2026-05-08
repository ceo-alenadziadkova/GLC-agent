import type { RoadmapGanttTask } from './roadmap-gantt-mapper';

/**
 * Build a stable signature for a focused task used to dedupe live-region announcements.
 * Returns an empty string when there is no focused task, so the consumer can clear the
 * previous announcement without re-firing it.
 *
 * The unit separator (`\u001f`) is intentionally outside any user-visible character set
 * to avoid accidental collisions in titles.
 */
export function buildFocusedTaskLiveRegionSig(task: RoadmapGanttTask | null | undefined): string {
  if (!task) return '';
  return `${task.title}\u001f${task.group}\u001f${task.start_time}\u001f${task.end_time}`;
}
