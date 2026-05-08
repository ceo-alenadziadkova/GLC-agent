import {
  ROADMAP_GANTT_OVERVIEW_KEY_STEP_MIN_PX,
  ROADMAP_GANTT_OVERVIEW_KEY_STEP_VIEWPORT_RATIO,
  ROADMAP_GANTT_OVERVIEW_PAGE_STEP_VIEWPORT_RATIO,
  ROADMAP_GANTT_TIMELINE_SCROLL_MIN_PX,
  ROADMAP_GANTT_TIMELINE_SCROLL_VIEWPORT_RATIO,
} from '../config/roadmap-gantt-view-preferences';

export function roadmapGanttToolbarScrollDeltaPx(clientWidth: number): number {
  return Math.max(
    Math.floor(clientWidth * ROADMAP_GANTT_TIMELINE_SCROLL_VIEWPORT_RATIO),
    ROADMAP_GANTT_TIMELINE_SCROLL_MIN_PX,
  );
}

export function roadmapGanttOverviewKeyboardStepPx(clientWidth: number): number {
  return Math.max(
    Math.floor(clientWidth * ROADMAP_GANTT_OVERVIEW_KEY_STEP_VIEWPORT_RATIO),
    ROADMAP_GANTT_OVERVIEW_KEY_STEP_MIN_PX,
  );
}

export function roadmapGanttOverviewPageStepPx(clientWidth: number, arrowStepPx: number): number {
  return Math.max(Math.floor(clientWidth * ROADMAP_GANTT_OVERVIEW_PAGE_STEP_VIEWPORT_RATIO), arrowStepPx);
}
