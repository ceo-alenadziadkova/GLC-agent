import { useEffect } from 'react';

import {
  ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS,
  ROADMAP_GANTT_STORAGE_SHOW_SLACK,
} from '../config/roadmap-gantt-view-preferences';
import {
  ROADMAP_TIMELINE_CRITICAL_PATH_STORAGE_KEY,
  ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY,
  ROADMAP_TIMELINE_DENSITY_STORAGE_KEY,
  ROADMAP_TIMELINE_SCALE_STORAGE_KEY,
} from '../lib/roadmap-gantt-url-params';

import type { DensityMode, DayRange, TimeScale } from './useRoadmapGanttView.types';

export type UseRoadmapGanttPersistenceEffectsArgs = {
  timeScale: TimeScale;
  dayRangeDays: DayRange;
  densityMode: DensityMode;
  criticalPathOnly: boolean;
  showSlack: boolean;
  showScheduleProgress: boolean;
};

/** Persists timeline/gantt preferences to `localStorage` (browser only). */
export function useRoadmapGanttPersistenceEffects(args: UseRoadmapGanttPersistenceEffectsArgs): void {
  const { timeScale, dayRangeDays, densityMode, criticalPathOnly, showSlack, showScheduleProgress } = args;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_TIMELINE_SCALE_STORAGE_KEY, timeScale);
  }, [timeScale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY, String(dayRangeDays));
  }, [dayRangeDays]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_TIMELINE_DENSITY_STORAGE_KEY, densityMode);
  }, [densityMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_TIMELINE_CRITICAL_PATH_STORAGE_KEY, criticalPathOnly ? '1' : '0');
  }, [criticalPathOnly]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_GANTT_STORAGE_SHOW_SLACK, showSlack ? '1' : '0');
  }, [showSlack]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS, showScheduleProgress ? '1' : '0');
  }, [showScheduleProgress]);
}
