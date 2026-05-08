/**
 * URL query keys and localStorage keys for Portal roadmap Gantt view (P2+).
 * Keep tunables here per no-hardcode layering.
 */

/** Toolbar "More options" opens on mount when URL encodes `more=1` or filters needing it — see readRoadmapToolbarExpandedFromSearchParams. */

/** Calendar day length aligned with UTC schedule math (`server/src/config/time.ts` DAY_MS). */
export const ROADMAP_GANTT_DAY_MS = 86_400_000;

/** Primary toolbar horizontal scroll: fraction of visible timeline width per click. */
export const ROADMAP_GANTT_TIMELINE_SCROLL_VIEWPORT_RATIO = 0.72;
/** Minimum pixel step for toolbar horizontal scroll (narrow viewports). */
export const ROADMAP_GANTT_TIMELINE_SCROLL_MIN_PX = 240;
/** Overview strip: ArrowLeft/ArrowRight step as a fraction of viewport width. */
export const ROADMAP_GANTT_OVERVIEW_KEY_STEP_VIEWPORT_RATIO = 0.15;
export const ROADMAP_GANTT_OVERVIEW_KEY_STEP_MIN_PX = 120;
/** Overview strip: PageUp/PageDown step as a fraction of viewport width (lower bound uses key-step minimum). */
export const ROADMAP_GANTT_OVERVIEW_PAGE_STEP_VIEWPORT_RATIO = 0.9;

/** Minimum zoom (~3 calendar days). */
export const ROADMAP_GANTT_TIMELINE_MIN_ZOOM_MS = 3 * ROADMAP_GANTT_DAY_MS;

/** Maximum zoom spans for day vs month scale (calendar-year style upper bound). */
export const ROADMAP_GANTT_TIMELINE_MAX_ZOOM_DAY_MS = 366 * ROADMAP_GANTT_DAY_MS;
export const ROADMAP_GANTT_TIMELINE_MAX_ZOOM_MONTH_MS = 3 * 366 * ROADMAP_GANTT_DAY_MS;

export const ROADMAP_GANTT_BASELINE_STORAGE_PREFIX = 'glc.gantt.baseline.';

export const ROADMAP_GANTT_STORAGE_SHOW_SLACK = 'roadmap-gantt-show-slack';
export const ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS = 'roadmap-gantt-show-schedule-progress';

export const ROADMAP_SEARCH_PARAM_SLACK = 'slack';
export const ROADMAP_SEARCH_PARAM_SCHED = 'sched';

/** Dependency SVG overlay lane pitch — keep aligned with timeline group row sizing. */
export const ROADMAP_GANTT_DEPENDENCY_LANE_ROW_PX = 54 as const;

/** Default `react-calendar-timeline` `lineHeight` for roadmap items. */
export const ROADMAP_GANTT_TIMELINE_LINE_HEIGHT_PX = 52 as const;

/**
 * When the number of visible (filtered) Gantt tasks is at or above this threshold,
 * skip building dependency-arrow paths on the graph (main cost is geometry × edges).
 * Timeline rows still render; users can narrow via filters or use the Dependencies table tab.
 */
export const ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD = 100 as const;

/** When the dependency pair table exceeds this row count, use a fixed-height virtual list. */
export const ROADMAP_GANTT_DEPS_TABLE_VIRTUALIZE_ROW_THRESHOLD = 80 as const;

export const ROADMAP_GANTT_DEPS_TABLE_ROW_HEIGHT_PX = 36 as const;

export const ROADMAP_GANTT_DEPS_TABLE_VIRTUAL_VIEWPORT_MAX_PX = 480 as const;
