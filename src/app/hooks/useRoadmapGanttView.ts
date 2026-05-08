import {
  useEffect,
  useId,
  useMemo,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import { useLocation, useSearchParams } from 'react-router';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import {
  ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS,
  ROADMAP_GANTT_STORAGE_SHOW_SLACK,
} from '../config/roadmap-gantt-view-preferences';
import {
  ROADMAP_TIMELINE_CRITICAL_PATH_STORAGE_KEY,
  ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY,
  ROADMAP_TIMELINE_DENSITY_STORAGE_KEY,
  ROADMAP_TIMELINE_SCALE_STORAGE_KEY,
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
  ROADMAP_SEARCH_PARAM_OWNER,
  ROADMAP_SEARCH_PARAM_QUERY,
} from '../lib/roadmap-gantt-url-params';
import type { RoadmapGanttBaselineSnapshot } from '../lib/roadmap-gantt-baseline-storage';
import type {
  RoadmapGanttDependency,
  RoadmapGanttProjection,
  RoadmapGanttTask,
} from '../lib/roadmap-gantt-mapper';
import {
  type RoadmapGanttDependencySort,
  type RoadmapGanttDependencyTypeFilter,
  type RoadmapGanttDependencyView,
} from '../lib/roadmap-gantt-dependency-filters';
import type { RoadmapGanttActiveFilterTagId } from '../lib/roadmap-gantt-active-filter-tags';
import type { computeOverviewWindowMetrics } from '../lib/roadmap-gantt-overview-window';
import {
  buildRoadmapGanttUrlSearchParams,
  readInitialActivePanel,
  readInitialDependenciesTab,
  readInitialDependencySort,
  readInitialDependencyView,
  readInitialLaneFilter,
  readInitialShowAdvancedControls,
  readInitialShowRestoredViewNotice,
  readInitialStatusFilter,
  type RoadmapGanttActivePanel,
  type RoadmapGanttDependenciesTab,
} from '../lib/roadmap-gantt-view-model';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import type {
  RoadmapGanttPlanBoardHydration,
} from '../components/roadmap-gantt/types';
import type { TaskDetailsPlanBoardMove } from '../components/roadmap-gantt/TaskDetailsDrawer';
import type { GanttTaskItem } from '../components/roadmap-gantt/lib/timeline-item-types';
import { useProfile } from './useProfile';
import { useRoadmapGanttData } from './useRoadmapGanttData';
import { useRoadmapGanttInteractions } from './useRoadmapGanttInteractions';
import { useRoadmapGanttViewport } from './useRoadmapGanttViewport';
import { useRoadmapGanttActions } from './useRoadmapGanttActions';
import { useRoadmapGanttSelectors } from './useRoadmapGanttSelectors';

type StatusFilter = 'all' | 'planned' | 'in-progress' | 'done';
type TimeScale = 'day' | 'month';
type DayRange = 30 | 60 | 90;
type DensityMode = 'compact' | 'comfortable';
type ActivePanel = RoadmapGanttActivePanel;
type DependenciesTab = RoadmapGanttDependenciesTab;

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

export function useRoadmapGanttView(args: UseRoadmapGanttViewArgs): UseRoadmapGanttViewResult {
  const { auditId, projection, orchestrationPack, planBoardHydration, getDeliveryBoardHrefForPackNode } = args;

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { isClient } = useProfile();

  // ---------- Selection state (orchestrator-owned, public) ----------
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams.get(ROADMAP_SEARCH_PARAM_TASK));
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [laneMoveMenuOpen, setLaneMoveMenuOpen] = useState(false);
  const [hoveredDependencyId, setHoveredDependencyId] = useState<string | null>(null);

  // ---------- Filter / view state ----------
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

  /**
   * Lifted to orchestrator so both data hook (SVG path freeze) and viewport hook (scroll behavior)
   * can read the value without creating a circular dependency between them.
   */
  const [isOverviewDragging, setIsOverviewDragging] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(() =>
    readInitialShowAdvancedControls(searchParams),
  );
  const [activePanel, setActivePanel] = useState<ActivePanel>(() => readInitialActivePanel(searchParams));
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

  const mainTabTimelineId = useId();
  const mainTabDependenciesId = useId();
  const mainPanelTimelineId = useId();
  const mainPanelDependenciesId = useId();
  const depsTabGraphId = useId();
  const depsTabTableId = useId();
  const depsPanelGraphId = useId();
  const depsPanelTableId = useId();
  const roadmapOverviewMapDescriptionId = useId();

  // ---------- Subhook 1: data ----------
  const data = useRoadmapGanttData({
    auditId,
    projection,
    planBoardHydration,
    isClient,
    getDeliveryBoardHrefForPackNode,
    orchestrationPack,
    pathname: location.pathname,
    search: location.search ?? '',
    urlTaskParam: searchParams.get(ROADMAP_SEARCH_PARAM_TASK) ?? '',
    filters: {
      titleQuery,
      criticalPathOnly,
      ownerFilter,
      statusFilter,
      laneFilter,
      blockedOnly,
      dependencyTypeFilter,
      dependencyView,
      dependencySort,
      highlightDependencyChain,
    },
    selection: {
      selectedTaskId,
      focusedTaskId,
      hoveredDependencyId,
      setSelectedTaskId,
      setFocusedTaskId,
    },
    isOverviewDragging,
  });

  // ---------- Subhook 2: viewport ----------
  const viewport = useRoadmapGanttViewport({
    timeScale,
    dayRangeDays,
    projection: { defaultTimeStart: projection.defaultTimeStart, defaultTimeEnd: projection.defaultTimeEnd },
    timelineTasksLength: data.timelineTasks.length,
    timelineGroupsLength: data.groups.length,
    timelineItemsLength: data.items.length,
    timelineRangeMs: data.timelineRangeMs,
    isOverviewDragging,
    setIsOverviewDragging,
  });

  // ---------- Subhook 3: selectors (memoized derived) ----------
  const filterClearSetters = useMemo(
    () => ({
      setDependencyTypeFilter,
      setBlockedOnly,
      setOwnerFilter,
      setStatusFilter,
      setLaneFilter,
      setDependencyView,
      setCriticalPathOnly,
      setTitleQuery,
    }),
    [],
  );

  const selectors = useRoadmapGanttSelectors({
    focusedTaskId,
    projectionTasks: projection.tasks,
    projectionLanes: projection.lanes,
    rawActiveFilterTags: data.activeFilterTagsResult.tags,
    filterClearSetters,
  });

  // ---------- Subhook 4: actions (exports + view presets/reset) ----------
  const presetSetters = useMemo(
    () => ({
      setTimeScale,
      setDayRangeDays,
      setDependencyTypeFilter,
      setOwnerFilter,
      setStatusFilter,
      setLaneFilter,
      setBlockedOnly,
      setDependencyView,
      setCriticalPathOnly,
      setHighlightDependencyChain,
      setTitleQuery,
      setShowSlack,
      setShowScheduleProgress,
      setDependencySort,
      setSelectedTaskId,
      setFocusedTaskId,
      setActivePanel,
      setDependenciesTab,
      setShowAdvancedControls,
      setShowRestoredViewNotice,
    }),
    [],
  );

  const exportBusySetters = useMemo(
    () => ({ setSprintExportBusy, setIcalExportBusy }),
    [],
  );

  const actions = useRoadmapGanttActions({
    auditId,
    projection,
    timelineTasks: data.timelineTasks,
    exportBusySetters,
    presetSetters,
  });

  // ---------- Subhook 5: interactions (timeline DnD, keyboard, lane focus, sort) ----------
  const interactionsSetters = useMemo(
    () => ({
      setSelectedTaskId,
      setFocusedTaskId,
      setLaneFilter,
      setLaneMoveMenuOpen,
      setGridNavAnnouncement,
      setMainPanelTabAnnouncement,
      setActivePanel,
      setDependenciesTab,
      setShowAdvancedControls,
      setRoadmapToolbarMoreOpen,
      setDependencySort,
    }),
    [],
  );

  const interactions = useRoadmapGanttInteractions({
    auditId,
    planBoardHydration,
    projection: { lanes: projection.lanes },
    data: {
      timelineTasks: data.timelineTasks,
      groups: data.groups,
      timelineEditableTaskIds: data.timelineEditableTaskIds,
      boardRowByPackNodeId: data.boardRowByPackNodeId,
      timelineBoardEditEnabled: data.timelineBoardEditEnabled,
      focusedTask: data.focusedTask,
      applyOverride: data.applyOverride,
      revertOverride: data.revertOverride,
      timelineTaskOverrides: data.timelineTaskOverrides,
    },
    viewport: { focusTaskBarEl: viewport.handlers.focusTaskBarEl },
    state: { activePanel, dependencySort },
    ids: { mainTabTimelineId, mainTabDependenciesId },
    resetView: actions.resetView,
    setters: interactionsSetters,
  });

  // ---------- Persistence (localStorage) ----------
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

  // ---------- URL sync ----------
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

  // ---------- Live region for focused task ----------
  useEffect(() => {
    setGridNavAnnouncement(selectors.focusedTaskAnnouncement);
  }, [selectors.focusedTaskAnnouncement]);

  useEffect(() => {
    if (!mainPanelTabAnnouncement) return;
    const t = window.setTimeout(() => setMainPanelTabAnnouncement(''), 2000);
    return () => window.clearTimeout(t);
  }, [mainPanelTabAnnouncement]);

  // ---------- Active filter tags carry orchestrator-owned clear callbacks ----------
  const activeFilterTags = selectors.activeFilterTags as RoadmapGanttActiveFilterTag[];
  const state = useMemo(
    () => ({
      selectedTaskId,
      focusedTaskId,
      laneMoveMenuOpen,
      hoveredDependencyId,
      timeScale,
      dayRangeDays,
      dependencyTypeFilter,
      densityMode,
      ownerFilter,
      statusFilter,
      laneFilter,
      blockedOnly,
      dependencyView,
      dependencySort,
      criticalPathOnly,
      highlightDependencyChain,
      titleQuery,
      sprintExportBusy,
      icalExportBusy,
      showSlack,
      showScheduleProgress,
      baselineSnapshot: data.baselineSnapshot,
      canScrollLeft: viewport.state.canScrollLeft,
      canScrollRight: viewport.state.canScrollRight,
      isOverviewDragging,
      showAdvancedControls,
      activePanel,
      dependenciesTab,
      gridNavAnnouncement,
      mainPanelTabAnnouncement,
      roadmapToolbarMoreOpen,
      showRestoredViewNotice,
    }),
    [
      selectedTaskId,
      focusedTaskId,
      laneMoveMenuOpen,
      hoveredDependencyId,
      timeScale,
      dayRangeDays,
      dependencyTypeFilter,
      densityMode,
      ownerFilter,
      statusFilter,
      laneFilter,
      blockedOnly,
      dependencyView,
      dependencySort,
      criticalPathOnly,
      highlightDependencyChain,
      titleQuery,
      sprintExportBusy,
      icalExportBusy,
      showSlack,
      showScheduleProgress,
      data.baselineSnapshot,
      viewport.state.canScrollLeft,
      viewport.state.canScrollRight,
      isOverviewDragging,
      showAdvancedControls,
      activePanel,
      dependenciesTab,
      gridNavAnnouncement,
      mainPanelTabAnnouncement,
      roadmapToolbarMoreOpen,
      showRestoredViewNotice,
    ],
  );
  const setters = useMemo(
    () => ({
      setSelectedTaskId,
      setFocusedTaskId,
      setLaneMoveMenuOpen,
      setHoveredDependencyId,
      setTimeScale,
      setDayRangeDays,
      setDependencyTypeFilter,
      setDensityMode,
      setOwnerFilter,
      setStatusFilter,
      setLaneFilter,
      setBlockedOnly,
      setDependencyView,
      setCriticalPathOnly,
      setHighlightDependencyChain,
      setTitleQuery,
      setShowSlack,
      setShowScheduleProgress,
      setIsOverviewDragging,
      setShowAdvancedControls,
      setActivePanel,
      setDependenciesTab,
      setRoadmapToolbarMoreOpen,
      setShowRestoredViewNotice,
      setMainPanelTabAnnouncement,
    }),
    [],
  );
  const refs = useMemo(
    () => ({
      timelineShellRef: viewport.refs.timelineShellRef,
      overviewTrackRef: viewport.refs.overviewTrackRef,
    }),
    [viewport.refs.overviewTrackRef, viewport.refs.timelineShellRef],
  );
  const ids = useMemo(
    () => ({
      mainTabTimelineId,
      mainTabDependenciesId,
      mainPanelTimelineId,
      mainPanelDependenciesId,
      depsTabGraphId,
      depsTabTableId,
      depsPanelGraphId,
      depsPanelTableId,
      roadmapOverviewMapDescriptionId,
    }),
    [
      depsPanelGraphId,
      depsPanelTableId,
      depsTabGraphId,
      depsTabTableId,
      mainPanelDependenciesId,
      mainPanelTimelineId,
      mainTabDependenciesId,
      mainTabTimelineId,
      roadmapOverviewMapDescriptionId,
    ],
  );
  const derived = useMemo(
    () => ({
      isMonthScale: viewport.derived.isMonthScale,
      timelineTasks: data.timelineTasks,
      filteredTaskIds: data.filteredTaskIds,
      groups: data.groups,
      items: data.items,
      chainTaskIds: data.chainTaskIds,
      selectableLanesForJump: data.selectableLanesForJump,
      laneMoveMenuEligible: data.laneMoveMenuEligible,
      timelineEditableTaskIds: data.timelineEditableTaskIds,
      selectedTask: data.selectedTask,
      drawerTask: data.drawerTask,
      downstreamTaskCount: data.downstreamTaskCount,
      deliveryBoardHref: data.deliveryBoardHref,
      taskPlanBoardMove: data.taskPlanBoardMove,
      consultantBoardPlanHref: data.consultantBoardPlanHref,
      focusedTask: data.focusedTask,
      taskTitleById: data.taskTitleById,
      taskByIdFull: data.taskByIdFull,
      visibleDependencies: data.visibleDependencies,
      sortedVisibleDependencies: data.sortedVisibleDependencies,
      hoveredDependency: data.hoveredDependency,
      highlightedTaskIds: data.highlightedTaskIds,
      dependencyChainShouldDim: data.dependencyChainShouldDim,
      overviewWindow: viewport.derived.overviewWindow,
      overviewTasks: data.overviewTasks,
      isHeavyTaskLoad: data.isHeavyTaskLoad,
      ownerOptions: data.ownerOptions,
      activeFilterTags,
      activeFilterReason: data.activeFilterTagsResult.reason,
      hasActiveFilters: data.activeFilterTagsResult.hasActiveFilters,
      advancedFiltersCount: data.activeFilterTagsResult.advancedFiltersCount,
      defaultViewportStart: viewport.derived.defaultViewportStart,
      defaultViewportEnd: viewport.derived.defaultViewportEnd,
      dependencySvgPathsByDepId: data.dependencySvgPathsByDepId,
      mapX: data.mapX,
      mapY: data.mapY,
      dependencyCanvasHeight: data.dependencyCanvasHeight,
      timelineRangeMs: data.timelineRangeMs,
    }),
    [
      viewport.derived.isMonthScale,
      data.timelineTasks,
      data.filteredTaskIds,
      data.groups,
      data.items,
      data.chainTaskIds,
      data.selectableLanesForJump,
      data.laneMoveMenuEligible,
      data.timelineEditableTaskIds,
      data.selectedTask,
      data.drawerTask,
      data.downstreamTaskCount,
      data.deliveryBoardHref,
      data.taskPlanBoardMove,
      data.consultantBoardPlanHref,
      data.focusedTask,
      data.taskTitleById,
      data.taskByIdFull,
      data.visibleDependencies,
      data.sortedVisibleDependencies,
      data.hoveredDependency,
      data.highlightedTaskIds,
      data.dependencyChainShouldDim,
      viewport.derived.overviewWindow,
      data.overviewTasks,
      data.isHeavyTaskLoad,
      data.ownerOptions,
      activeFilterTags,
      data.activeFilterTagsResult.reason,
      data.activeFilterTagsResult.hasActiveFilters,
      data.activeFilterTagsResult.advancedFiltersCount,
      viewport.derived.defaultViewportStart,
      viewport.derived.defaultViewportEnd,
      data.dependencySvgPathsByDepId,
      data.mapX,
      data.mapY,
      data.dependencyCanvasHeight,
      data.timelineRangeMs,
    ],
  );
  const handlers = useMemo(
    () => ({
      applyLaneFocusFilter: interactions.applyLaneFocusFilter,
      handleTimelineGridKeyDown: interactions.handleTimelineGridKeyDown,
      handleOverviewKeyDown: viewport.handlers.handleOverviewKeyDown,
      handleMainPanelTablistKeyDown: interactions.handleMainPanelTablistKeyDown,
      handleTimelineItemMove: interactions.handleTimelineItemMove,
      handleTimelineItemResize: interactions.handleTimelineItemResize,
      scrollTimelineByDirection: viewport.handlers.scrollTimelineByDirection,
      jumpTimelineRangeByDirection: viewport.handlers.jumpTimelineRangeByDirection,
      jumpTimelineToToday: viewport.handlers.jumpTimelineToToday,
      handleOverviewPointer: viewport.handlers.handleOverviewPointer,
      downloadSprintPlanCsv: actions.downloadSprintPlanCsv,
      downloadIcal: actions.downloadIcal,
      captureBaseline: data.captureBaseline,
      clearBaseline: data.clearBaseline,
      toggleDependencySort: interactions.toggleDependencySort,
      sortArrow: interactions.sortArrow,
      resetView: actions.resetView,
      applyPresetBlocked: actions.applyPresetBlocked,
      applyPresetExecution: actions.applyPresetExecution,
      applyPresetCriticalPath: actions.applyPresetCriticalPath,
      selectTask: interactions.selectTask,
    }),
    [
      interactions.applyLaneFocusFilter,
      interactions.handleTimelineGridKeyDown,
      viewport.handlers.handleOverviewKeyDown,
      interactions.handleMainPanelTablistKeyDown,
      interactions.handleTimelineItemMove,
      interactions.handleTimelineItemResize,
      viewport.handlers.scrollTimelineByDirection,
      viewport.handlers.jumpTimelineRangeByDirection,
      viewport.handlers.jumpTimelineToToday,
      viewport.handlers.handleOverviewPointer,
      actions.downloadSprintPlanCsv,
      actions.downloadIcal,
      data.captureBaseline,
      data.clearBaseline,
      interactions.toggleDependencySort,
      interactions.sortArrow,
      actions.resetView,
      actions.applyPresetBlocked,
      actions.applyPresetExecution,
      actions.applyPresetCriticalPath,
      interactions.selectTask,
    ],
  );

  return { state, setters, refs, ids, derived, handlers };
}
