/**
 * Pure view-model helpers for the Roadmap Gantt orchestrator hook.
 *
 * Kept free of React, side-effects (except for `applyPresetPatch` which only invokes
 * caller-provided setters), and DOM access. Storage is injected as a `Pick<Storage, 'getItem'>`
 * so the helpers stay pure-by-default and testable in any environment.
 */

import type { TimelineGroupBase } from 'react-calendar-timeline';

import {
  ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY,
  ROADMAP_TIMELINE_DENSITY_STORAGE_KEY,
  ROADMAP_TIMELINE_SCALE_STORAGE_KEY,
  ROADMAP_SEARCH_PARAM_BLOCKED,
  ROADMAP_SEARCH_PARAM_CHAIN,
  ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY,
  ROADMAP_SEARCH_PARAM_DAY_RANGE,
  ROADMAP_SEARCH_PARAM_DENSITY,
  ROADMAP_SEARCH_PARAM_DEP_TAB,
  ROADMAP_SEARCH_PARAM_DEP_VIEW,
  ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE,
  ROADMAP_SEARCH_PARAM_LANE,
  ROADMAP_SEARCH_PARAM_OWNER,
  ROADMAP_SEARCH_PARAM_PANEL,
  ROADMAP_SEARCH_PARAM_QUERY,
  ROADMAP_SEARCH_PARAM_SCALE,
  ROADMAP_SEARCH_PARAM_SORT_DIR,
  ROADMAP_SEARCH_PARAM_SORT_KEY,
  ROADMAP_SEARCH_PARAM_STATUS,
  ROADMAP_SEARCH_PARAM_TASK,
  ROADMAP_SEARCH_PARAM_TOOLBAR_MORE,
} from './roadmap-gantt-url-params';
import {
  ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS,
  ROADMAP_GANTT_STORAGE_SHOW_SLACK,
  ROADMAP_SEARCH_PARAM_SCHED,
  ROADMAP_SEARCH_PARAM_SLACK,
} from '../config/roadmap-gantt-view-preferences';
import { readPlanLaneFilterKeys } from './plan-cross-nav';
import type {
  RoadmapGanttDependencySort,
  RoadmapGanttDependencySortKey,
  RoadmapGanttDependencyView,
} from './roadmap-gantt-dependency-filters';
import type { RoadmapGanttTask } from './roadmap-gantt-mapper';

// ---------- Types shared with the orchestrator ----------

export type RoadmapGanttStatusFilter = 'all' | 'planned' | 'in-progress' | 'done';
export type RoadmapGanttActivePanel = 'timeline' | 'dependencies';
export type RoadmapGanttDependenciesTab = 'graph' | 'table';
export type RoadmapGanttTimeScale = 'day' | 'month';
export type RoadmapGanttDayRange = 30 | 60 | 90;
export type RoadmapGanttDensityMode = 'compact' | 'comfortable';
export type RoadmapGanttDependencyTypeFilter = 'all' | 'FS' | 'SS' | 'FF' | 'SF';

/** Read-only storage subset used by `readInitialShowRestoredViewNotice`. */
export type RoadmapGanttReadonlyStorage = Pick<Storage, 'getItem'>;

// ---------- Initial-state readers ----------

export function readInitialDependencySort(searchParams: URLSearchParams): RoadmapGanttDependencySort {
  const rawKey = searchParams.get(ROADMAP_SEARCH_PARAM_SORT_KEY);
  const key: RoadmapGanttDependencySortKey =
    rawKey === 'to' ? 'to' : rawKey === 'type' ? 'type' : 'from';
  const direction = searchParams.get(ROADMAP_SEARCH_PARAM_SORT_DIR) === 'desc' ? 'desc' : 'asc';
  return { key, direction };
}

export function readInitialStatusFilter(searchParams: URLSearchParams): RoadmapGanttStatusFilter {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_STATUS);
  if (value === 'planned' || value === 'in-progress' || value === 'done') return value;
  return 'all';
}

export function readInitialLaneFilter(searchParams: URLSearchParams): string {
  const lane = searchParams.get(ROADMAP_SEARCH_PARAM_LANE);
  if (lane != null && lane.trim() !== '') return lane;
  const sharedLanes = readPlanLaneFilterKeys(`?${searchParams.toString()}`);
  return sharedLanes[0] ?? 'all';
}

export function readInitialDependencyView(searchParams: URLSearchParams): RoadmapGanttDependencyView {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_DEP_VIEW);
  if (value === 'selected' || value === 'hide-weak') return value;
  return 'all';
}

export function readInitialActivePanel(searchParams: URLSearchParams): RoadmapGanttActivePanel {
  return searchParams.get(ROADMAP_SEARCH_PARAM_PANEL) === 'dependencies' ? 'dependencies' : 'timeline';
}

export function readInitialDependenciesTab(searchParams: URLSearchParams): RoadmapGanttDependenciesTab {
  return searchParams.get(ROADMAP_SEARCH_PARAM_DEP_TAB) === 'table' ? 'table' : 'graph';
}

export function readInitialShowAdvancedControls(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get(ROADMAP_SEARCH_PARAM_OWNER) != null ||
    searchParams.get(ROADMAP_SEARCH_PARAM_STATUS) != null ||
    searchParams.get(ROADMAP_SEARCH_PARAM_LANE) != null ||
    searchParams.get(ROADMAP_SEARCH_PARAM_DEP_VIEW) != null ||
    searchParams.get(ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY) === '1' ||
    (searchParams.get(ROADMAP_SEARCH_PARAM_QUERY)?.trim().length ?? 0) > 0
  );
}

/**
 * Show the "view restored from storage" notice on first render only when the URL does
 * not already encode a scale/range/density preference, AND any of those keys are persisted
 * in the injected storage. The orchestrator passes `window.localStorage` (or `null` in SSR).
 */
export function readInitialShowRestoredViewNotice(
  searchParams: URLSearchParams,
  storage: RoadmapGanttReadonlyStorage | null,
): boolean {
  const hasScaleQuery = searchParams.get(ROADMAP_SEARCH_PARAM_SCALE) != null;
  const hasRangeQuery = searchParams.get(ROADMAP_SEARCH_PARAM_DAY_RANGE) != null;
  const hasDensityQuery = searchParams.get(ROADMAP_SEARCH_PARAM_DENSITY) != null;
  if (hasScaleQuery || hasRangeQuery || hasDensityQuery) return false;
  if (!storage) return false;
  const hasStoredScale = storage.getItem(ROADMAP_TIMELINE_SCALE_STORAGE_KEY) != null;
  const hasStoredRange = storage.getItem(ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY) != null;
  const hasStoredDensity = storage.getItem(ROADMAP_TIMELINE_DENSITY_STORAGE_KEY) != null;
  return hasStoredScale || hasStoredRange || hasStoredDensity;
}

// ---------- Sort helpers ----------

/**
 * Pure reducer for the dependency sort triggered by clicking column headers. Switching
 * to a different key resets the direction to ascending; clicking the active key flips
 * the direction.
 */
export function dependencySortReducer(
  prev: RoadmapGanttDependencySort,
  key: RoadmapGanttDependencySortKey,
): RoadmapGanttDependencySort {
  if (prev.key !== key) return { key, direction: 'asc' };
  return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
}

/** Render an arrow indicator next to the active sort column header. */
export function formatDependencySortArrow(
  sort: RoadmapGanttDependencySort,
  key: RoadmapGanttDependencySortKey,
): '' | ' ▲' | ' ▼' {
  if (sort.key !== key) return '';
  return sort.direction === 'asc' ? ' ▲' : ' ▼';
}

// ---------- Live-region message ----------

export type RoadmapGanttFocusedTaskAnnouncementCopy = {
  /** Template with `{title}` and `{lane}` placeholders. */
  template: string;
};

/**
 * Build the assertive live-region message announced when keyboard focus moves to a task.
 * Returns an empty string when there is no task, so the consumer can clear the announcement
 * without re-firing it.
 */
export function buildFocusedTaskAnnouncementMessage(
  task: RoadmapGanttTask | null | undefined,
  lanes: ReadonlyArray<{ id: string; title: string }>,
  copy: RoadmapGanttFocusedTaskAnnouncementCopy,
): string {
  if (!task) return '';
  const laneLabel = lanes.find((lane) => lane.id === task.group)?.title ?? String(task.group);
  return copy.template.replace('{title}', task.title).replace('{lane}', laneLabel);
}

// ---------- View presets / reset ----------

/**
 * A patch describes the next snapshot of the view-state for a preset; missing fields keep
 * the current value. Storing these as data tables keeps preset definitions out of the hot
 * path and centralizes them for the no-hardcode rule.
 */
export type RoadmapGanttPresetPatch = {
  timeScale?: RoadmapGanttTimeScale;
  dayRangeDays?: RoadmapGanttDayRange;
  dependencyTypeFilter?: RoadmapGanttDependencyTypeFilter;
  ownerFilter?: string;
  statusFilter?: RoadmapGanttStatusFilter;
  laneFilter?: string;
  blockedOnly?: boolean;
  dependencyView?: RoadmapGanttDependencyView;
  criticalPathOnly?: boolean;
  highlightDependencyChain?: boolean;
  titleQuery?: string;
  showSlack?: boolean;
  showScheduleProgress?: boolean;
  dependencySort?: RoadmapGanttDependencySort;
  selectedTaskId?: string | null;
  /** When the patch contains the literal `'__first_timeline_task__'`, the caller substitutes the first task id. */
  focusedTaskId?: string | null | '__first_timeline_task__';
  activePanel?: RoadmapGanttActivePanel;
  dependenciesTab?: RoadmapGanttDependenciesTab;
  showAdvancedControls?: boolean;
  showRestoredViewNotice?: boolean;
};

/** Sentinel used by `RESET_VIEW_PATCH` to ask the orchestrator to focus the first timeline task. */
export const FOCUSED_FIRST_TIMELINE_TASK_SENTINEL = '__first_timeline_task__' as const;

export const RESET_VIEW_PATCH: RoadmapGanttPresetPatch = {
  dependencyTypeFilter: 'all',
  ownerFilter: 'all',
  statusFilter: 'all',
  laneFilter: 'all',
  blockedOnly: false,
  dependencyView: 'all',
  criticalPathOnly: false,
  titleQuery: '',
  highlightDependencyChain: true,
  showSlack: false,
  showScheduleProgress: true,
  dependencySort: { key: 'from', direction: 'asc' },
  selectedTaskId: null,
  focusedTaskId: FOCUSED_FIRST_TIMELINE_TASK_SENTINEL,
  activePanel: 'timeline',
  dependenciesTab: 'graph',
  showAdvancedControls: false,
  showRestoredViewNotice: false,
};

export const PRESET_BLOCKED_PATCH: RoadmapGanttPresetPatch = {
  timeScale: 'day',
  dayRangeDays: 30,
  dependencyTypeFilter: 'all',
  blockedOnly: true,
  dependencyView: 'hide-weak',
  statusFilter: 'all',
  showAdvancedControls: true,
};

export const PRESET_EXECUTION_PATCH: RoadmapGanttPresetPatch = {
  timeScale: 'day',
  dayRangeDays: 60,
  dependencyTypeFilter: 'FS',
  blockedOnly: false,
  dependencyView: 'all',
  statusFilter: 'in-progress',
  showAdvancedControls: true,
};

export const PRESET_CRITICAL_PATH_PATCH: RoadmapGanttPresetPatch = {
  timeScale: 'month',
  criticalPathOnly: true,
  blockedOnly: false,
  dependencyView: 'all',
  dependencyTypeFilter: 'all',
  statusFilter: 'all',
  showAdvancedControls: true,
};

/** Setters consumed by `applyPresetPatch`. Each is optional so callers can opt-out per field. */
export type RoadmapGanttPresetSetters = {
  setTimeScale?: (value: RoadmapGanttTimeScale) => void;
  setDayRangeDays?: (value: RoadmapGanttDayRange) => void;
  setDependencyTypeFilter?: (value: RoadmapGanttDependencyTypeFilter) => void;
  setOwnerFilter?: (value: string) => void;
  setStatusFilter?: (value: RoadmapGanttStatusFilter) => void;
  setLaneFilter?: (value: string) => void;
  setBlockedOnly?: (value: boolean) => void;
  setDependencyView?: (value: RoadmapGanttDependencyView) => void;
  setCriticalPathOnly?: (value: boolean) => void;
  setHighlightDependencyChain?: (value: boolean) => void;
  setTitleQuery?: (value: string) => void;
  setShowSlack?: (value: boolean) => void;
  setShowScheduleProgress?: (value: boolean) => void;
  setDependencySort?: (value: RoadmapGanttDependencySort) => void;
  setSelectedTaskId?: (value: string | null) => void;
  setFocusedTaskId?: (value: string | null) => void;
  setActivePanel?: (value: RoadmapGanttActivePanel) => void;
  setDependenciesTab?: (value: RoadmapGanttDependenciesTab) => void;
  setShowAdvancedControls?: (value: boolean) => void;
  setShowRestoredViewNotice?: (value: boolean) => void;
};

/**
 * Apply a preset patch to the orchestrator's setters. The `firstTimelineTaskId` is used to
 * resolve the `FOCUSED_FIRST_TIMELINE_TASK_SENTINEL` sentinel from `RESET_VIEW_PATCH`.
 */
export function applyPresetPatch(
  patch: RoadmapGanttPresetPatch,
  setters: RoadmapGanttPresetSetters,
  firstTimelineTaskId: string | null = null,
): void {
  if (patch.timeScale !== undefined) setters.setTimeScale?.(patch.timeScale);
  if (patch.dayRangeDays !== undefined) setters.setDayRangeDays?.(patch.dayRangeDays);
  if (patch.dependencyTypeFilter !== undefined)
    setters.setDependencyTypeFilter?.(patch.dependencyTypeFilter);
  if (patch.ownerFilter !== undefined) setters.setOwnerFilter?.(patch.ownerFilter);
  if (patch.statusFilter !== undefined) setters.setStatusFilter?.(patch.statusFilter);
  if (patch.laneFilter !== undefined) setters.setLaneFilter?.(patch.laneFilter);
  if (patch.blockedOnly !== undefined) setters.setBlockedOnly?.(patch.blockedOnly);
  if (patch.dependencyView !== undefined) setters.setDependencyView?.(patch.dependencyView);
  if (patch.criticalPathOnly !== undefined) setters.setCriticalPathOnly?.(patch.criticalPathOnly);
  if (patch.highlightDependencyChain !== undefined)
    setters.setHighlightDependencyChain?.(patch.highlightDependencyChain);
  if (patch.titleQuery !== undefined) setters.setTitleQuery?.(patch.titleQuery);
  if (patch.showSlack !== undefined) setters.setShowSlack?.(patch.showSlack);
  if (patch.showScheduleProgress !== undefined)
    setters.setShowScheduleProgress?.(patch.showScheduleProgress);
  if (patch.dependencySort !== undefined) setters.setDependencySort?.(patch.dependencySort);
  if (patch.selectedTaskId !== undefined) setters.setSelectedTaskId?.(patch.selectedTaskId);
  if (patch.focusedTaskId !== undefined) {
    const next =
      patch.focusedTaskId === FOCUSED_FIRST_TIMELINE_TASK_SENTINEL
        ? firstTimelineTaskId
        : patch.focusedTaskId;
    setters.setFocusedTaskId?.(next);
  }
  if (patch.activePanel !== undefined) setters.setActivePanel?.(patch.activePanel);
  if (patch.dependenciesTab !== undefined) setters.setDependenciesTab?.(patch.dependenciesTab);
  if (patch.showAdvancedControls !== undefined)
    setters.setShowAdvancedControls?.(patch.showAdvancedControls);
  if (patch.showRestoredViewNotice !== undefined)
    setters.setShowRestoredViewNotice?.(patch.showRestoredViewNotice);
}

// ---------- URL-sync builder ----------

/**
 * Snapshot of the orchestrator state mirrored to the URL. Kept flat to make `useEffect`
 * deps trivial and to allow `buildRoadmapGanttUrlSearchParams` to be a pure function.
 */
export type RoadmapGanttUrlSnapshot = {
  timeScale: RoadmapGanttTimeScale;
  dayRangeDays: RoadmapGanttDayRange;
  densityMode: RoadmapGanttDensityMode;
  dependencyTypeFilter: RoadmapGanttDependencyTypeFilter;
  ownerFilter: string;
  statusFilter: RoadmapGanttStatusFilter;
  laneFilter: string;
  blockedOnly: boolean;
  dependencyView: RoadmapGanttDependencyView;
  dependencySort: RoadmapGanttDependencySort;
  selectedTaskId: string | null;
  criticalPathOnly: boolean;
  highlightDependencyChain: boolean;
  titleQuery: string;
  showSlack: boolean;
  showScheduleProgress: boolean;
  activePanel: RoadmapGanttActivePanel;
  dependenciesTab: RoadmapGanttDependenciesTab;
  roadmapToolbarMoreOpen: boolean;
};

/**
 * Build the next `URLSearchParams` for the Gantt deep-link. Returns the same `prev`
 * reference when the resulting query string matches the previous one — the orchestrator
 * relies on this short-circuit to avoid re-renders under `setSearchParams(..., { replace: true })`.
 */
export function buildRoadmapGanttUrlSearchParams(
  prev: URLSearchParams,
  snapshot: RoadmapGanttUrlSnapshot,
): URLSearchParams {
  const next = new URLSearchParams(prev);

  next.set(ROADMAP_SEARCH_PARAM_SCALE, snapshot.timeScale);
  if (snapshot.timeScale === 'day') {
    next.set(ROADMAP_SEARCH_PARAM_DAY_RANGE, String(snapshot.dayRangeDays));
  } else {
    next.delete(ROADMAP_SEARCH_PARAM_DAY_RANGE);
  }

  next.set(ROADMAP_SEARCH_PARAM_DENSITY, snapshot.densityMode);
  next.set(ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE, snapshot.dependencyTypeFilter);

  if (snapshot.ownerFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_OWNER, snapshot.ownerFilter);
  else next.delete(ROADMAP_SEARCH_PARAM_OWNER);

  if (snapshot.statusFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_STATUS, snapshot.statusFilter);
  else next.delete(ROADMAP_SEARCH_PARAM_STATUS);

  if (snapshot.laneFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_LANE, snapshot.laneFilter);
  else next.delete(ROADMAP_SEARCH_PARAM_LANE);

  if (snapshot.blockedOnly) next.set(ROADMAP_SEARCH_PARAM_BLOCKED, '1');
  else next.delete(ROADMAP_SEARCH_PARAM_BLOCKED);

  if (snapshot.dependencyView !== 'all') next.set(ROADMAP_SEARCH_PARAM_DEP_VIEW, snapshot.dependencyView);
  else next.delete(ROADMAP_SEARCH_PARAM_DEP_VIEW);

  next.set(ROADMAP_SEARCH_PARAM_SORT_KEY, snapshot.dependencySort.key);
  next.set(ROADMAP_SEARCH_PARAM_SORT_DIR, snapshot.dependencySort.direction);

  if (snapshot.selectedTaskId) next.set(ROADMAP_SEARCH_PARAM_TASK, snapshot.selectedTaskId);
  else next.delete(ROADMAP_SEARCH_PARAM_TASK);

  if (snapshot.criticalPathOnly) next.set(ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY, '1');
  else next.delete(ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY);

  if (!snapshot.highlightDependencyChain) next.set(ROADMAP_SEARCH_PARAM_CHAIN, '0');
  else next.delete(ROADMAP_SEARCH_PARAM_CHAIN);

  const trimmedQuery = snapshot.titleQuery.trim();
  if (trimmedQuery.length > 0) next.set(ROADMAP_SEARCH_PARAM_QUERY, trimmedQuery);
  else next.delete(ROADMAP_SEARCH_PARAM_QUERY);

  if (snapshot.showSlack) next.set(ROADMAP_SEARCH_PARAM_SLACK, '1');
  else next.delete(ROADMAP_SEARCH_PARAM_SLACK);

  if (!snapshot.showScheduleProgress) next.set(ROADMAP_SEARCH_PARAM_SCHED, '0');
  else next.delete(ROADMAP_SEARCH_PARAM_SCHED);

  next.set(ROADMAP_SEARCH_PARAM_PANEL, snapshot.activePanel);
  if (snapshot.activePanel === 'dependencies') {
    next.set(ROADMAP_SEARCH_PARAM_DEP_TAB, snapshot.dependenciesTab);
  } else {
    next.delete(ROADMAP_SEARCH_PARAM_DEP_TAB);
  }

  if (snapshot.roadmapToolbarMoreOpen) next.set(ROADMAP_SEARCH_PARAM_TOOLBAR_MORE, '1');
  else next.delete(ROADMAP_SEARCH_PARAM_TOOLBAR_MORE);

  if (next.toString() === prev.toString()) return prev;
  return next;
}

// ---------- Re-exports referenced by the orchestrator (storage keys) ----------

export const ROADMAP_GANTT_VIEW_MODEL_LOCAL_STORAGE_KEYS = {
  scale: ROADMAP_TIMELINE_SCALE_STORAGE_KEY,
  dayRange: ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY,
  density: ROADMAP_TIMELINE_DENSITY_STORAGE_KEY,
  showSlack: ROADMAP_GANTT_STORAGE_SHOW_SLACK,
  showScheduleProgress: ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS,
} as const;

// ---------- Type guards used by the keyboard handler in interactions ----------

/**
 * Pick the next timeline group id when navigating laterally between tabs/panels. Used by
 * the timeline tablist keyboard handler in interactions; lives here because the rotation
 * is a pure data transform.
 */
export function pickNextActivePanel(
  current: RoadmapGanttActivePanel,
  direction: 'forward' | 'backward',
): RoadmapGanttActivePanel {
  const panels: ReadonlyArray<RoadmapGanttActivePanel> = ['timeline', 'dependencies'];
  const idx = panels.indexOf(current);
  if (idx < 0) return panels[0]!;
  const nextIdx =
    direction === 'forward'
      ? Math.min(idx + 1, panels.length - 1)
      : Math.max(idx - 1, 0);
  return panels[nextIdx]!;
}

/** Marker re-export so callers needing the timeline group type don't have to chase it down. */
export type { TimelineGroupBase };
