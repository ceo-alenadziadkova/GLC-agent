import {
  ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS,
  ROADMAP_GANTT_STORAGE_SHOW_SLACK,
  ROADMAP_SEARCH_PARAM_SCHED,
  ROADMAP_SEARCH_PARAM_SLACK,
} from '../config/roadmap-gantt-view-preferences';

/** localStorage keys for Gantt timeline view (persisted between sessions). */
export const ROADMAP_TIMELINE_SCALE_STORAGE_KEY = 'roadmap-gantt-time-scale';
export const ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY = 'roadmap-gantt-day-range';
export const ROADMAP_TIMELINE_DENSITY_STORAGE_KEY = 'roadmap-gantt-density';
export const ROADMAP_TIMELINE_CRITICAL_PATH_STORAGE_KEY = 'roadmap-gantt-critical-path-only';

/** Search-param keys for deep-linkable Gantt URL state */
export const ROADMAP_SEARCH_PARAM_SCALE = 'scale';
export const ROADMAP_SEARCH_PARAM_DAY_RANGE = 'range';
export const ROADMAP_SEARCH_PARAM_DENSITY = 'density';
export const ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE = 'depType';
export const ROADMAP_SEARCH_PARAM_OWNER = 'owner';
export const ROADMAP_SEARCH_PARAM_STATUS = 'status';
export const ROADMAP_SEARCH_PARAM_LANE = 'lane';
export const ROADMAP_SEARCH_PARAM_BLOCKED = 'blocked';
export const ROADMAP_SEARCH_PARAM_DEP_VIEW = 'depView';
export const ROADMAP_SEARCH_PARAM_SORT_KEY = 'depSort';
export const ROADMAP_SEARCH_PARAM_SORT_DIR = 'depDir';
export const ROADMAP_SEARCH_PARAM_TASK = 'task';
export const ROADMAP_SEARCH_PARAM_PANEL = 'panel';
export const ROADMAP_SEARCH_PARAM_DEP_TAB = 'depTab';
export const ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY = 'cp';
export const ROADMAP_SEARCH_PARAM_CHAIN = 'chain';
export const ROADMAP_SEARCH_PARAM_QUERY = 'q';
/** When `1`, roadmap toolbar "More" cluster opens (deep-link / share horizon + advanced filters without auto-expanding on `range`). */
export const ROADMAP_SEARCH_PARAM_TOOLBAR_MORE = 'more';

export function readStoredShowSlack(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ROADMAP_GANTT_STORAGE_SHOW_SLACK) === '1';
}

export function readStoredShowScheduleProgress(): boolean {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS);
  if (v === '0') return false;
  return true;
}

export function readShowSlackFromSearchParams(searchParams: URLSearchParams): boolean {
  const v = searchParams.get(ROADMAP_SEARCH_PARAM_SLACK);
  if (v === '1') return true;
  if (v === '0') return false;
  return readStoredShowSlack();
}

export function readShowScheduleProgressFromSearchParams(searchParams: URLSearchParams): boolean {
  const v = searchParams.get(ROADMAP_SEARCH_PARAM_SCHED);
  if (v === '1') return true;
  if (v === '0') return false;
  return readStoredShowScheduleProgress();
}

export function readStoredScale(): 'day' | 'month' {
  if (typeof window === 'undefined') return 'day';
  const value = window.localStorage.getItem(ROADMAP_TIMELINE_SCALE_STORAGE_KEY);
  return value === 'month' ? 'month' : 'day';
}

export function readStoredDayRange(): 30 | 60 | 90 {
  if (typeof window === 'undefined') return 60;
  const value = window.localStorage.getItem(ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY);
  if (value === '30') return 30;
  if (value === '90') return 90;
  return 60;
}

export function readStoredDensity(): 'compact' | 'comfortable' {
  if (typeof window === 'undefined') return 'comfortable';
  const value = window.localStorage.getItem(ROADMAP_TIMELINE_DENSITY_STORAGE_KEY);
  return value === 'compact' ? 'compact' : 'comfortable';
}

export function readScaleFromSearchParams(searchParams: URLSearchParams): 'day' | 'month' {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_SCALE);
  if (value === 'month') return 'month';
  if (value === 'day') return 'day';
  return readStoredScale();
}

export function readDayRangeFromSearchParams(searchParams: URLSearchParams): 30 | 60 | 90 {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_DAY_RANGE);
  if (value === '30') return 30;
  if (value === '90') return 90;
  if (value === '60') return 60;
  return readStoredDayRange();
}

export function readDensityFromSearchParams(searchParams: URLSearchParams): 'compact' | 'comfortable' {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_DENSITY);
  if (value === 'compact' || value === 'comfortable') return value;
  return readStoredDensity();
}

export function readStoredCriticalPathOnly(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ROADMAP_TIMELINE_CRITICAL_PATH_STORAGE_KEY) === '1';
}

export function readCriticalPathOnlyFromSearchParams(searchParams: URLSearchParams): boolean {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY);
  if (value === '1') return true;
  if (value === '0') return false;
  return readStoredCriticalPathOnly();
}

export function readChainHighlightFromSearchParams(searchParams: URLSearchParams): boolean {
  return searchParams.get(ROADMAP_SEARCH_PARAM_CHAIN) !== '0';
}

export function readDependencyTypeFromSearchParams(searchParams: URLSearchParams): 'all' | 'FS' | 'SS' | 'FF' | 'SF' {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE);
  if (value === 'FS' || value === 'SS' || value === 'FF' || value === 'SF') return value;
  return 'all';
}

/** Auto-expand collapsed toolbar clusters when URL encodes dependent filters (deep-link UX). */
export function readRoadmapToolbarExpandedFromSearchParams(searchParams: URLSearchParams): boolean {
  if (searchParams.get(ROADMAP_SEARCH_PARAM_TOOLBAR_MORE) === '1') return true;
  if (
    searchParams.get(ROADMAP_SEARCH_PARAM_OWNER) != null ||
    searchParams.get(ROADMAP_SEARCH_PARAM_STATUS) != null ||
    searchParams.get(ROADMAP_SEARCH_PARAM_LANE) != null ||
    searchParams.get(ROADMAP_SEARCH_PARAM_DEP_VIEW) != null ||
    searchParams.get(ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY) === '1' ||
    (searchParams.get(ROADMAP_SEARCH_PARAM_QUERY)?.trim().length ?? 0) > 0
  ) {
    return true;
  }
  if (searchParams.get(ROADMAP_SEARCH_PARAM_BLOCKED) === '1') return true;
  const depType = searchParams.get(ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE);
  if (depType === 'FS' || depType === 'SS' || depType === 'FF' || depType === 'SF') return true;
  return false;
}
