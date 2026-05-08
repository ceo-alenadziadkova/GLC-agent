import type { KeyboardEvent, Dispatch, RefObject, SetStateAction } from 'react';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import type { RoadmapGanttBaselineSnapshot } from '../lib/roadmap-gantt-baseline-storage';
import type { RoadmapGanttDependency, RoadmapGanttProjection, RoadmapGanttTask } from '../lib/roadmap-gantt-mapper';
import {
  type RoadmapGanttDependencySort,
  type RoadmapGanttDependencyTypeFilter,
  type RoadmapGanttDependencyView,
} from '../lib/roadmap-gantt-dependency-filters';
import type { RoadmapGanttActiveFilterTagId } from '../lib/roadmap-gantt-active-filter-tags';
import type { computeOverviewWindowMetrics } from '../lib/roadmap-gantt-overview-window';
import {
  type RoadmapGanttActivePanel,
  type RoadmapGanttDependenciesTab,
} from '../lib/roadmap-gantt-view-model';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import type { RoadmapGanttPlanBoardHydration } from '../components/roadmap-gantt/types';
import type { TaskDetailsPlanBoardMove } from '../components/roadmap-gantt/TaskDetailsDrawer';
import type { GanttTaskItem } from '../components/roadmap-gantt/lib/timeline-item-types';

export type StatusFilter = 'all' | 'planned' | 'in-progress' | 'done';
export type TimeScale = 'day' | 'month';
export type DayRange = 30 | 60 | 90;
export type DensityMode = 'compact' | 'comfortable';
export type ActivePanel = RoadmapGanttActivePanel;
export type DependenciesTab = RoadmapGanttDependenciesTab;

export type RoadmapGanttActiveFilterTag = {
  id: RoadmapGanttActiveFilterTagId;
  label: string;
  clear: () => void;
};

export type UseRoadmapGanttViewArgs = {
  auditId: string;
  projection: RoadmapGanttProjection;
  orchestrationPack?: GlcOrchestrationPackView | null;
  planBoardHydration?: RoadmapGanttPlanBoardHydration;
  getDeliveryBoardHrefForPackNode?: (packGraphNodeId: string) => string | null | undefined;
};

export type UseRoadmapGanttViewResult = {
  state: {
    selectedTaskId: string | null;
    focusedTaskId: string | null;
    laneMoveMenuOpen: boolean;
    hoveredDependencyId: string | null;
    timeScale: TimeScale;
    dayRangeDays: DayRange;
    dependencyTypeFilter: RoadmapGanttDependencyTypeFilter;
    densityMode: DensityMode;
    ownerFilter: string;
    statusFilter: StatusFilter;
    laneFilter: string;
    blockedOnly: boolean;
    dependencyView: RoadmapGanttDependencyView;
    dependencySort: RoadmapGanttDependencySort;
    criticalPathOnly: boolean;
    highlightDependencyChain: boolean;
    titleQuery: string;
    sprintExportBusy: boolean;
    icalExportBusy: boolean;
    showSlack: boolean;
    showScheduleProgress: boolean;
    baselineSnapshot: RoadmapGanttBaselineSnapshot | null;
    canScrollLeft: boolean;
    canScrollRight: boolean;
    isOverviewDragging: boolean;
    showAdvancedControls: boolean;
    activePanel: ActivePanel;
    dependenciesTab: DependenciesTab;
    gridNavAnnouncement: string;
    mainPanelTabAnnouncement: string;
    roadmapToolbarMoreOpen: boolean;
    showRestoredViewNotice: boolean;
  };
  setters: {
    setSelectedTaskId: Dispatch<SetStateAction<string | null>>;
    setFocusedTaskId: Dispatch<SetStateAction<string | null>>;
    setLaneMoveMenuOpen: Dispatch<SetStateAction<boolean>>;
    setHoveredDependencyId: Dispatch<SetStateAction<string | null>>;
    setTimeScale: Dispatch<SetStateAction<TimeScale>>;
    setDayRangeDays: Dispatch<SetStateAction<DayRange>>;
    setDependencyTypeFilter: Dispatch<SetStateAction<RoadmapGanttDependencyTypeFilter>>;
    setDensityMode: Dispatch<SetStateAction<DensityMode>>;
    setOwnerFilter: Dispatch<SetStateAction<string>>;
    setStatusFilter: Dispatch<SetStateAction<StatusFilter>>;
    setLaneFilter: Dispatch<SetStateAction<string>>;
    setBlockedOnly: Dispatch<SetStateAction<boolean>>;
    setDependencyView: Dispatch<SetStateAction<RoadmapGanttDependencyView>>;
    setCriticalPathOnly: Dispatch<SetStateAction<boolean>>;
    setHighlightDependencyChain: Dispatch<SetStateAction<boolean>>;
    setTitleQuery: Dispatch<SetStateAction<string>>;
    setShowSlack: Dispatch<SetStateAction<boolean>>;
    setShowScheduleProgress: Dispatch<SetStateAction<boolean>>;
    setIsOverviewDragging: Dispatch<SetStateAction<boolean>>;
    setShowAdvancedControls: Dispatch<SetStateAction<boolean>>;
    setActivePanel: Dispatch<SetStateAction<ActivePanel>>;
    setDependenciesTab: Dispatch<SetStateAction<DependenciesTab>>;
    setRoadmapToolbarMoreOpen: Dispatch<SetStateAction<boolean>>;
    setShowRestoredViewNotice: Dispatch<SetStateAction<boolean>>;
    setMainPanelTabAnnouncement: Dispatch<SetStateAction<string>>;
  };
  refs: {
    timelineShellRef: RefObject<HTMLDivElement | null>;
    overviewTrackRef: RefObject<HTMLDivElement | null>;
  };
  ids: {
    mainTabTimelineId: string;
    mainTabDependenciesId: string;
    mainPanelTimelineId: string;
    mainPanelDependenciesId: string;
    depsTabGraphId: string;
    depsTabTableId: string;
    depsPanelGraphId: string;
    depsPanelTableId: string;
    roadmapOverviewMapDescriptionId: string;
  };
  derived: {
    isMonthScale: boolean;
    timelineTasks: RoadmapGanttTask[];
    filteredTaskIds: ReadonlySet<string>;
    groups: TimelineGroupBase[];
    items: GanttTaskItem[];
    chainTaskIds: ReadonlySet<string> | null;
    selectableLanesForJump: { id: string; title: string }[];
    laneMoveMenuEligible: boolean;
    timelineEditableTaskIds: ReadonlySet<string>;
    selectedTask: RoadmapGanttTask | null;
    drawerTask: RoadmapGanttTask | null;
    downstreamTaskCount: number;
    deliveryBoardHref: string | null;
    taskPlanBoardMove: TaskDetailsPlanBoardMove;
    consultantBoardPlanHref: string | null;
    focusedTask: RoadmapGanttTask | null;
    taskTitleById: Map<string, string>;
    taskByIdFull: Map<string, RoadmapGanttTask>;
    visibleDependencies: RoadmapGanttDependency[];
    sortedVisibleDependencies: RoadmapGanttDependency[];
    hoveredDependency: RoadmapGanttDependency | null;
    highlightedTaskIds: ReadonlySet<string>;
    dependencyChainShouldDim: (dep: RoadmapGanttDependency) => boolean;
    overviewWindow: ReturnType<typeof computeOverviewWindowMetrics>;
    overviewTasks: RoadmapGanttTask[];
    isHeavyTaskLoad: boolean;
    ownerOptions: string[];
    activeFilterTags: RoadmapGanttActiveFilterTag[];
    activeFilterReason: string;
    hasActiveFilters: boolean;
    advancedFiltersCount: number;
    defaultViewportStart: number;
    defaultViewportEnd: number;
    dependencySvgPathsByDepId: ReadonlyMap<string, string>;
    mapX: (ts: number) => number;
    mapY: (laneId: string) => number;
    dependencyCanvasHeight: number;
    timelineRangeMs: number;
  };
  handlers: {
    applyLaneFocusFilter: (lane: { id: string; title: string }) => void;
    handleTimelineGridKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handleOverviewKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handleMainPanelTablistKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handleTimelineItemMove: (itemId: number | string, dragTime: number, newGroupOrder: number) => void;
    handleTimelineItemResize: (itemId: number | string, time: number, edge: 'left' | 'right') => void;
    scrollTimelineByDirection: (direction: 'left' | 'right') => void;
    jumpTimelineRangeByDirection: (direction: 'previous' | 'next') => void;
    jumpTimelineToToday: () => void;
    handleOverviewPointer: (clientX: number) => void;
    downloadSprintPlanCsv: () => Promise<void>;
    downloadIcal: () => void;
    captureBaseline: () => void;
    clearBaseline: () => void;
    toggleDependencySort: (key: 'from' | 'to' | 'type') => void;
    sortArrow: (key: 'from' | 'to' | 'type') => string;
    resetView: () => void;
    applyPresetBlocked: () => void;
    applyPresetExecution: () => void;
    applyPresetCriticalPath: () => void;
    selectTask: (taskId: string) => void;
  };
};
