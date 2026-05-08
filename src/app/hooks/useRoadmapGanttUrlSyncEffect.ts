import { useEffect } from 'react';
import type { SetURLSearchParams } from 'react-router';

import {
  type RoadmapGanttDependencySort,
  type RoadmapGanttDependencyTypeFilter,
  type RoadmapGanttDependencyView,
} from '../lib/roadmap-gantt-dependency-filters';
import { buildRoadmapGanttUrlSearchParams } from '../lib/roadmap-gantt-view-model';

import type {
  ActivePanel,
  DensityMode,
  DayRange,
  DependenciesTab,
  StatusFilter,
  TimeScale,
} from './useRoadmapGanttView.types';

export type UseRoadmapGanttUrlSyncEffectArgs = {
  setSearchParams: SetURLSearchParams;
  timeScale: TimeScale;
  dayRangeDays: DayRange;
  densityMode: DensityMode;
  dependencyTypeFilter: RoadmapGanttDependencyTypeFilter;
  ownerFilter: string;
  statusFilter: StatusFilter;
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
  activePanel: ActivePanel;
  dependenciesTab: DependenciesTab;
  roadmapToolbarMoreOpen: boolean;
};

/** Keeps roadmap view/filter state in sync with URL search params (`replace: true`). */
export function useRoadmapGanttUrlSyncEffect(args: UseRoadmapGanttUrlSyncEffectArgs): void {
  const {
    setSearchParams,
    timeScale,
    dayRangeDays,
    densityMode,
    dependencyTypeFilter,
    ownerFilter,
    statusFilter,
    laneFilter,
    blockedOnly,
    dependencyView,
    dependencySort,
    selectedTaskId,
    criticalPathOnly,
    highlightDependencyChain,
    titleQuery,
    showSlack,
    showScheduleProgress,
    activePanel,
    dependenciesTab,
    roadmapToolbarMoreOpen,
  } = args;

  useEffect(() => {
    setSearchParams(
      (prev) =>
        buildRoadmapGanttUrlSearchParams(prev, {
          timeScale,
          dayRangeDays,
          densityMode,
          dependencyTypeFilter,
          ownerFilter,
          statusFilter,
          laneFilter,
          blockedOnly,
          dependencyView,
          dependencySort,
          selectedTaskId,
          criticalPathOnly,
          highlightDependencyChain,
          titleQuery,
          showSlack,
          showScheduleProgress,
          activePanel,
          dependenciesTab,
          roadmapToolbarMoreOpen,
        }),
      { replace: true },
    );
  }, [
    blockedOnly,
    criticalPathOnly,
    dayRangeDays,
    densityMode,
    dependencySort,
    dependencyTypeFilter,
    dependencyView,
    highlightDependencyChain,
    laneFilter,
    ownerFilter,
    roadmapToolbarMoreOpen,
    activePanel,
    dependenciesTab,
    selectedTaskId,
    setSearchParams,
    showScheduleProgress,
    showSlack,
    statusFilter,
    timeScale,
    titleQuery,
  ]);
}
