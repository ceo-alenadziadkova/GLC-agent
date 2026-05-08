import { useState, type Dispatch, type SetStateAction } from 'react';

import {
  ROADMAP_SEARCH_PARAM_OWNER,
  ROADMAP_SEARCH_PARAM_QUERY,
  ROADMAP_SEARCH_PARAM_TASK,
  readChainHighlightFromSearchParams,
  readCriticalPathOnlyFromSearchParams,
  readDayRangeFromSearchParams,
  readDensityFromSearchParams,
  readDependencyTypeFromSearchParams,
  readRoadmapToolbarExpandedFromSearchParams,
  readScaleFromSearchParams,
  readShowScheduleProgressFromSearchParams,
  readShowSlackFromSearchParams,
} from '../lib/roadmap-gantt-url-params';
import {
  type RoadmapGanttDependencySort,
  type RoadmapGanttDependencyTypeFilter,
  type RoadmapGanttDependencyView,
} from '../lib/roadmap-gantt-dependency-filters';
import {
  readInitialActivePanel,
  readInitialDependenciesTab,
  readInitialDependencySort,
  readInitialDependencyView,
  readInitialLaneFilter,
  readInitialShowAdvancedControls,
  readInitialShowRestoredViewNotice,
  readInitialStatusFilter,
} from '../lib/roadmap-gantt-view-model';

import type {
  ActivePanel,
  DependenciesTab,
  DensityMode,
  DayRange,
  StatusFilter,
  TimeScale,
} from './useRoadmapGanttView.types';

export type UseRoadmapGanttViewStateResult = {
  selectedTaskId: string | null;
  setSelectedTaskId: Dispatch<SetStateAction<string | null>>;
  focusedTaskId: string | null;
  setFocusedTaskId: Dispatch<SetStateAction<string | null>>;
  laneMoveMenuOpen: boolean;
  setLaneMoveMenuOpen: Dispatch<SetStateAction<boolean>>;
  hoveredDependencyId: string | null;
  setHoveredDependencyId: Dispatch<SetStateAction<string | null>>;
  timeScale: TimeScale;
  setTimeScale: Dispatch<SetStateAction<TimeScale>>;
  dayRangeDays: DayRange;
  setDayRangeDays: Dispatch<SetStateAction<DayRange>>;
  dependencyTypeFilter: RoadmapGanttDependencyTypeFilter;
  setDependencyTypeFilter: Dispatch<SetStateAction<RoadmapGanttDependencyTypeFilter>>;
  densityMode: DensityMode;
  setDensityMode: Dispatch<SetStateAction<DensityMode>>;
  ownerFilter: string;
  setOwnerFilter: Dispatch<SetStateAction<string>>;
  statusFilter: StatusFilter;
  setStatusFilter: Dispatch<SetStateAction<StatusFilter>>;
  laneFilter: string;
  setLaneFilter: Dispatch<SetStateAction<string>>;
  blockedOnly: boolean;
  setBlockedOnly: Dispatch<SetStateAction<boolean>>;
  dependencyView: RoadmapGanttDependencyView;
  setDependencyView: Dispatch<SetStateAction<RoadmapGanttDependencyView>>;
  dependencySort: RoadmapGanttDependencySort;
  setDependencySort: Dispatch<SetStateAction<RoadmapGanttDependencySort>>;
  criticalPathOnly: boolean;
  setCriticalPathOnly: Dispatch<SetStateAction<boolean>>;
  highlightDependencyChain: boolean;
  setHighlightDependencyChain: Dispatch<SetStateAction<boolean>>;
  titleQuery: string;
  setTitleQuery: Dispatch<SetStateAction<string>>;
  sprintExportBusy: boolean;
  setSprintExportBusy: Dispatch<SetStateAction<boolean>>;
  icalExportBusy: boolean;
  setIcalExportBusy: Dispatch<SetStateAction<boolean>>;
  showSlack: boolean;
  setShowSlack: Dispatch<SetStateAction<boolean>>;
  showScheduleProgress: boolean;
  setShowScheduleProgress: Dispatch<SetStateAction<boolean>>;
  isOverviewDragging: boolean;
  setIsOverviewDragging: Dispatch<SetStateAction<boolean>>;
  showAdvancedControls: boolean;
  setShowAdvancedControls: Dispatch<SetStateAction<boolean>>;
  activePanel: ActivePanel;
  setActivePanel: Dispatch<SetStateAction<ActivePanel>>;
  dependenciesTab: DependenciesTab;
  setDependenciesTab: Dispatch<SetStateAction<DependenciesTab>>;
  gridNavAnnouncement: string;
  setGridNavAnnouncement: Dispatch<SetStateAction<string>>;
  mainPanelTabAnnouncement: string;
  setMainPanelTabAnnouncement: Dispatch<SetStateAction<string>>;
  roadmapToolbarMoreOpen: boolean;
  setRoadmapToolbarMoreOpen: Dispatch<SetStateAction<boolean>>;
  showRestoredViewNotice: boolean;
  setShowRestoredViewNotice: Dispatch<SetStateAction<boolean>>;
};

export function useRoadmapGanttViewState(searchParams: URLSearchParams): UseRoadmapGanttViewStateResult {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams.get(ROADMAP_SEARCH_PARAM_TASK));
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [laneMoveMenuOpen, setLaneMoveMenuOpen] = useState(false);
  const [hoveredDependencyId, setHoveredDependencyId] = useState<string | null>(null);

  const [timeScale, setTimeScale] = useState<TimeScale>(() => readScaleFromSearchParams(searchParams));
  const [dayRangeDays, setDayRangeDays] = useState<DayRange>(() => readDayRangeFromSearchParams(searchParams));
  const [dependencyTypeFilter, setDependencyTypeFilter] = useState<RoadmapGanttDependencyTypeFilter>(() =>
    readDependencyTypeFromSearchParams(searchParams),
  );
  const [densityMode, setDensityMode] = useState<DensityMode>(() => readDensityFromSearchParams(searchParams));
  const [ownerFilter, setOwnerFilter] = useState<string>(() => searchParams.get(ROADMAP_SEARCH_PARAM_OWNER) ?? 'all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => readInitialStatusFilter(searchParams));
  const [laneFilter, setLaneFilter] = useState<string>(() => readInitialLaneFilter(searchParams));
  const [blockedOnly, setBlockedOnly] = useState<boolean>(() => searchParams.get('blocked') === '1');
  const [dependencyView, setDependencyView] = useState<RoadmapGanttDependencyView>(() =>
    readInitialDependencyView(searchParams),
  );
  const [dependencySort, setDependencySort] = useState<RoadmapGanttDependencySort>(() =>
    readInitialDependencySort(searchParams),
  );
  const [criticalPathOnly, setCriticalPathOnly] = useState<boolean>(() =>
    readCriticalPathOnlyFromSearchParams(searchParams),
  );
  const [highlightDependencyChain, setHighlightDependencyChain] = useState<boolean>(() =>
    readChainHighlightFromSearchParams(searchParams),
  );
  const [titleQuery, setTitleQuery] = useState<string>(() => searchParams.get(ROADMAP_SEARCH_PARAM_QUERY) ?? '');
  const [sprintExportBusy, setSprintExportBusy] = useState(false);
  const [icalExportBusy, setIcalExportBusy] = useState(false);
  const [showSlack, setShowSlack] = useState<boolean>(() => readShowSlackFromSearchParams(searchParams));
  const [showScheduleProgress, setShowScheduleProgress] = useState<boolean>(() =>
    readShowScheduleProgressFromSearchParams(searchParams),
  );

  const [isOverviewDragging, setIsOverviewDragging] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(() =>
    readInitialShowAdvancedControls(searchParams),
  );
  const [activePanel, setActivePanel] = useState(() => readInitialActivePanel(searchParams));
  const [dependenciesTab, setDependenciesTab] = useState<DependenciesTab>(() => readInitialDependenciesTab(searchParams));
  const [gridNavAnnouncement, setGridNavAnnouncement] = useState('');
  const [mainPanelTabAnnouncement, setMainPanelTabAnnouncement] = useState('');
  const [roadmapToolbarMoreOpen, setRoadmapToolbarMoreOpen] = useState(() =>
    readRoadmapToolbarExpandedFromSearchParams(searchParams),
  );
  const [showRestoredViewNotice, setShowRestoredViewNotice] = useState<boolean>(() =>
    readInitialShowRestoredViewNotice(
      searchParams,
      typeof window !== 'undefined' ? window.localStorage : null,
    ),
  );

  return {
    selectedTaskId,
    setSelectedTaskId,
    focusedTaskId,
    setFocusedTaskId,
    laneMoveMenuOpen,
    setLaneMoveMenuOpen,
    hoveredDependencyId,
    setHoveredDependencyId,
    timeScale,
    setTimeScale,
    dayRangeDays,
    setDayRangeDays,
    dependencyTypeFilter,
    setDependencyTypeFilter,
    densityMode,
    setDensityMode,
    ownerFilter,
    setOwnerFilter,
    statusFilter,
    setStatusFilter,
    laneFilter,
    setLaneFilter,
    blockedOnly,
    setBlockedOnly,
    dependencyView,
    setDependencyView,
    dependencySort,
    setDependencySort,
    criticalPathOnly,
    setCriticalPathOnly,
    highlightDependencyChain,
    setHighlightDependencyChain,
    titleQuery,
    setTitleQuery,
    sprintExportBusy,
    setSprintExportBusy,
    icalExportBusy,
    setIcalExportBusy,
    showSlack,
    setShowSlack,
    showScheduleProgress,
    setShowScheduleProgress,
    isOverviewDragging,
    setIsOverviewDragging,
    showAdvancedControls,
    setShowAdvancedControls,
    activePanel,
    setActivePanel,
    dependenciesTab,
    setDependenciesTab,
    gridNavAnnouncement,
    setGridNavAnnouncement,
    mainPanelTabAnnouncement,
    setMainPanelTabAnnouncement,
    roadmapToolbarMoreOpen,
    setRoadmapToolbarMoreOpen,
    showRestoredViewNotice,
    setShowRestoredViewNotice,
  };
}
