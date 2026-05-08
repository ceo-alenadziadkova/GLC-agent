import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import { useLocation, useSearchParams } from 'react-router';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import {
  ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS,
  ROADMAP_GANTT_STORAGE_SHOW_SLACK,
  ROADMAP_SEARCH_PARAM_SCHED,
  ROADMAP_SEARCH_PARAM_SLACK,
} from '../config/roadmap-gantt-view-preferences';
import {
  ROADMAP_TIMELINE_CRITICAL_PATH_STORAGE_KEY,
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
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { api } from '../data/apiService';
import type { RoadmapGanttBaselineSnapshot } from '../lib/roadmap-gantt-baseline-storage';
import { buildIcalFromProjection, icsFilenameForAudit } from '../lib/roadmap-gantt-ical';
import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttDependency,
  type RoadmapGanttProjection,
  type RoadmapGanttTask,
} from '../lib/roadmap-gantt-mapper';
import {
  type RoadmapGanttDependencySort,
  type RoadmapGanttDependencyTypeFilter,
  type RoadmapGanttDependencyView,
} from '../lib/roadmap-gantt-dependency-filters';
import type { RoadmapGanttActiveFilterTagId } from '../lib/roadmap-gantt-active-filter-tags';
import type { computeOverviewWindowMetrics } from '../lib/roadmap-gantt-overview-window';
import { pickNearestTimelineTaskForTime } from '../lib/roadmap-gantt-viewport';
import {
  pickArrowKeyMsDelta,
  pickGridShortcutAction,
} from '../lib/roadmap-gantt-keyboard-grid';
import { buildFocusedTaskLiveRegionSig } from '../lib/roadmap-gantt-focused-task-signature';
import { readPlanLaneFilterKeys } from '../lib/plan-cross-nav';
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

type StatusFilter = 'all' | 'planned' | 'in-progress' | 'done';
type TimeScale = 'day' | 'month';
type DayRange = 30 | 60 | 90;
type DensityMode = 'compact' | 'comfortable';
type ActivePanel = 'timeline' | 'dependencies';
type DependenciesTab = 'graph' | 'table';

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const value = searchParams.get(ROADMAP_SEARCH_PARAM_STATUS);
    return value === 'planned' || value === 'in-progress' || value === 'done' ? value : 'all';
  });
  const [laneFilter, setLaneFilter] = useState<string>(() => {
    const lane = searchParams.get(ROADMAP_SEARCH_PARAM_LANE);
    if (lane != null && lane.trim() !== '') return lane;
    const sharedLanes = readPlanLaneFilterKeys(`?${searchParams.toString()}`);
    return sharedLanes[0] ?? 'all';
  });
  const [blockedOnly, setBlockedOnly] = useState<boolean>(() => searchParams.get(ROADMAP_SEARCH_PARAM_BLOCKED) === '1');
  const [dependencyView, setDependencyView] = useState<RoadmapGanttDependencyView>(() => {
    const value = searchParams.get(ROADMAP_SEARCH_PARAM_DEP_VIEW);
    return value === 'selected' || value === 'hide-weak' ? value : 'all';
  });
  const [dependencySort, setDependencySort] = useState<RoadmapGanttDependencySort>({
    key:
      searchParams.get(ROADMAP_SEARCH_PARAM_SORT_KEY) === 'to'
        ? 'to'
        : searchParams.get(ROADMAP_SEARCH_PARAM_SORT_KEY) === 'type'
          ? 'type'
          : 'from',
    direction: searchParams.get(ROADMAP_SEARCH_PARAM_SORT_DIR) === 'desc' ? 'desc' : 'asc',
  });
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
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(() => {
    return (
      searchParams.get(ROADMAP_SEARCH_PARAM_OWNER) != null ||
      searchParams.get(ROADMAP_SEARCH_PARAM_STATUS) != null ||
      searchParams.get(ROADMAP_SEARCH_PARAM_LANE) != null ||
      searchParams.get(ROADMAP_SEARCH_PARAM_DEP_VIEW) != null ||
      searchParams.get(ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY) === '1' ||
      (searchParams.get(ROADMAP_SEARCH_PARAM_QUERY)?.trim().length ?? 0) > 0
    );
  });
  const [activePanel, setActivePanel] = useState<ActivePanel>(() =>
    searchParams.get(ROADMAP_SEARCH_PARAM_PANEL) === 'dependencies' ? 'dependencies' : 'timeline',
  );
  const [dependenciesTab, setDependenciesTab] = useState<DependenciesTab>(() =>
    searchParams.get(ROADMAP_SEARCH_PARAM_DEP_TAB) === 'table' ? 'table' : 'graph',
  );
  const [gridNavAnnouncement, setGridNavAnnouncement] = useState('');
  const [mainPanelTabAnnouncement, setMainPanelTabAnnouncement] = useState('');
  const [roadmapToolbarMoreOpen, setRoadmapToolbarMoreOpen] = useState(() =>
    readRoadmapToolbarExpandedFromSearchParams(searchParams),
  );
  const [showRestoredViewNotice, setShowRestoredViewNotice] = useState<boolean>(() => {
    const hasScaleQuery = searchParams.get(ROADMAP_SEARCH_PARAM_SCALE) != null;
    const hasRangeQuery = searchParams.get(ROADMAP_SEARCH_PARAM_DAY_RANGE) != null;
    const hasDensityQuery = searchParams.get(ROADMAP_SEARCH_PARAM_DENSITY) != null;
    if (hasScaleQuery || hasRangeQuery || hasDensityQuery) return false;
    const hasStoredScale = typeof window !== 'undefined' && window.localStorage.getItem(ROADMAP_TIMELINE_SCALE_STORAGE_KEY) != null;
    const hasStoredRange = typeof window !== 'undefined' && window.localStorage.getItem(ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY) != null;
    const hasStoredDensity = typeof window !== 'undefined' && window.localStorage.getItem(ROADMAP_TIMELINE_DENSITY_STORAGE_KEY) != null;
    return hasStoredScale || hasStoredRange || hasStoredDensity;
  });

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

  // ---------- Subhook 3: interactions ----------
  const interactions = useRoadmapGanttInteractions({
    auditId,
    planBoardHydration,
    timelineTasks: data.timelineTasks,
    groups: data.groups,
    timelineEditableTaskIds: data.timelineEditableTaskIds,
    boardRowByPackNodeId: data.boardRowByPackNodeId,
    timelineBoardEditEnabled: data.timelineBoardEditEnabled,
    setTimelineTaskOverrides: data.setTimelineTaskOverrides,
    setSelectedTaskId,
    setFocusedTaskId,
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
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(ROADMAP_SEARCH_PARAM_SCALE, timeScale);
        if (timeScale === 'day') {
          next.set(ROADMAP_SEARCH_PARAM_DAY_RANGE, String(dayRangeDays));
        } else {
          next.delete(ROADMAP_SEARCH_PARAM_DAY_RANGE);
        }
        next.set(ROADMAP_SEARCH_PARAM_DENSITY, densityMode);
        next.set(ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE, dependencyTypeFilter);
        if (ownerFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_OWNER, ownerFilter);
        else next.delete(ROADMAP_SEARCH_PARAM_OWNER);
        if (statusFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_STATUS, statusFilter);
        else next.delete(ROADMAP_SEARCH_PARAM_STATUS);
        if (laneFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_LANE, laneFilter);
        else next.delete(ROADMAP_SEARCH_PARAM_LANE);
        if (blockedOnly) next.set(ROADMAP_SEARCH_PARAM_BLOCKED, '1');
        else next.delete(ROADMAP_SEARCH_PARAM_BLOCKED);
        if (dependencyView !== 'all') next.set(ROADMAP_SEARCH_PARAM_DEP_VIEW, dependencyView);
        else next.delete(ROADMAP_SEARCH_PARAM_DEP_VIEW);
        next.set(ROADMAP_SEARCH_PARAM_SORT_KEY, dependencySort.key);
        next.set(ROADMAP_SEARCH_PARAM_SORT_DIR, dependencySort.direction);
        if (selectedTaskId) next.set(ROADMAP_SEARCH_PARAM_TASK, selectedTaskId);
        else next.delete(ROADMAP_SEARCH_PARAM_TASK);
        if (criticalPathOnly) next.set(ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY, '1');
        else next.delete(ROADMAP_SEARCH_PARAM_CRITICAL_PATH_ONLY);
        if (!highlightDependencyChain) next.set(ROADMAP_SEARCH_PARAM_CHAIN, '0');
        else next.delete(ROADMAP_SEARCH_PARAM_CHAIN);
        if (titleQuery.trim()) next.set(ROADMAP_SEARCH_PARAM_QUERY, titleQuery.trim());
        else next.delete(ROADMAP_SEARCH_PARAM_QUERY);
        if (showSlack) next.set(ROADMAP_SEARCH_PARAM_SLACK, '1');
        else next.delete(ROADMAP_SEARCH_PARAM_SLACK);
        if (!showScheduleProgress) next.set(ROADMAP_SEARCH_PARAM_SCHED, '0');
        else next.delete(ROADMAP_SEARCH_PARAM_SCHED);
        next.set(ROADMAP_SEARCH_PARAM_PANEL, activePanel);
        if (activePanel === 'dependencies') {
          next.set(ROADMAP_SEARCH_PARAM_DEP_TAB, dependenciesTab);
        } else {
          next.delete(ROADMAP_SEARCH_PARAM_DEP_TAB);
        }
        if (roadmapToolbarMoreOpen) next.set(ROADMAP_SEARCH_PARAM_TOOLBAR_MORE, '1');
        else next.delete(ROADMAP_SEARCH_PARAM_TOOLBAR_MORE);
        if (next.toString() === prev.toString()) return prev;
        return next;
      },
      { replace: true },
    );
  }, [
    blockedOnly,
    criticalPathOnly,
    dayRangeDays,
    densityMode,
    dependencySort.direction,
    dependencySort.key,
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
  const focusedTaskLiveRegionSig = useMemo(
    () => buildFocusedTaskLiveRegionSig(projection.tasks.find((t) => t.id === focusedTaskId) ?? null),
    [focusedTaskId, projection.tasks],
  );

  useEffect(() => {
    if (!focusedTaskId || !focusedTaskLiveRegionSig) {
      setGridNavAnnouncement('');
      return;
    }
    const task = projection.tasks.find((t) => t.id === focusedTaskId);
    if (!task) {
      setGridNavAnnouncement('');
      return;
    }
    const laneLabel = projection.lanes.find((l) => l.id === task.group)?.title ?? String(task.group);
    setGridNavAnnouncement(
      ORCHESTRATION_UI_COPY.roadmapGanttKeyboardFocusAnnouncement
        .replace('{title}', task.title)
        .replace('{lane}', laneLabel),
    );
  }, [focusedTaskId, focusedTaskLiveRegionSig, projection.lanes, projection.tasks]);

  useEffect(() => {
    if (!mainPanelTabAnnouncement) return;
    const t = window.setTimeout(() => setMainPanelTabAnnouncement(''), 2000);
    return () => window.clearTimeout(t);
  }, [mainPanelTabAnnouncement]);

  // ---------- Lane focus helper ----------
  const applyLaneFocusFilter = useCallback((lane: { id: string; title: string }) => {
    setLaneFilter(String(lane.id));
    setLaneMoveMenuOpen(false);
    setGridNavAnnouncement(
      ORCHESTRATION_UI_COPY.roadmapGanttKeyboardLaneFilterAnnouncement.replace('{lane}', lane.title),
    );
  }, []);

  // ---------- Sort handlers ----------
  const toggleDependencySort = useCallback((key: 'from' | 'to' | 'type') => {
    setDependencySort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  }, []);

  const sortArrow = useCallback(
    (key: 'from' | 'to' | 'type') => {
      if (dependencySort.key !== key) return '';
      return dependencySort.direction === 'asc' ? ' ▲' : ' ▼';
    },
    [dependencySort.direction, dependencySort.key],
  );

  // ---------- Exports ----------
  const downloadSprintPlanCsv = useCallback(async () => {
    setSprintExportBusy(true);
    try {
      const csv = await api.downloadOrchestrationSprintExportCsv(auditId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sprint-plan-${auditId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.sprintExportCsvError);
    } finally {
      setSprintExportBusy(false);
    }
  }, [auditId]);

  const downloadIcal = useCallback(() => {
    setIcalExportBusy(true);
    try {
      const body = buildIcalFromProjection(projection, { auditId });
      const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = icsFilenameForAudit(auditId);
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.roadmapGanttIcalExportError);
    } finally {
      setIcalExportBusy(false);
    }
  }, [auditId, projection]);

  // ---------- View presets / reset ----------
  const resetView = useCallback(() => {
    setDependencyTypeFilter('all');
    setOwnerFilter('all');
    setStatusFilter('all');
    setLaneFilter('all');
    setBlockedOnly(false);
    setDependencyView('all');
    setCriticalPathOnly(false);
    setTitleQuery('');
    setHighlightDependencyChain(true);
    setShowSlack(false);
    setShowScheduleProgress(true);
    setDependencySort({ key: 'from', direction: 'asc' });
    setSelectedTaskId(null);
    setFocusedTaskId(data.timelineTasks[0]?.id ?? null);
    setActivePanel('timeline');
    setDependenciesTab('graph');
    setShowAdvancedControls(false);
    setShowRestoredViewNotice(false);
  }, [data.timelineTasks]);

  const applyPresetBlocked = useCallback(() => {
    setTimeScale('day');
    setDayRangeDays(30);
    setDependencyTypeFilter('all');
    setBlockedOnly(true);
    setDependencyView('hide-weak');
    setStatusFilter('all');
    setShowAdvancedControls(true);
  }, []);

  const applyPresetExecution = useCallback(() => {
    setTimeScale('day');
    setDayRangeDays(60);
    setDependencyTypeFilter('FS');
    setBlockedOnly(false);
    setDependencyView('all');
    setStatusFilter('in-progress');
    setShowAdvancedControls(true);
  }, []);

  const applyPresetCriticalPath = useCallback(() => {
    setTimeScale('month');
    setCriticalPathOnly(true);
    setBlockedOnly(false);
    setDependencyView('all');
    setDependencyTypeFilter('all');
    setStatusFilter('all');
    setShowAdvancedControls(true);
  }, []);

  // ---------- Timeline grid keyboard ----------
  const handleTimelineGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const action = pickGridShortcutAction(event.key);
      switch (action.kind) {
        case 'help':
          event.preventDefault();
          setShowAdvancedControls(true);
          return;
        case 'panel-timeline':
          event.preventDefault();
          setActivePanel('timeline');
          return;
        case 'panel-deps':
          event.preventDefault();
          setActivePanel('dependencies');
          return;
        case 'tab-graph':
          event.preventDefault();
          setDependenciesTab('graph');
          return;
        case 'tab-table':
          event.preventDefault();
          setDependenciesTab('table');
          return;
        case 'toolbar-more':
          event.preventDefault();
          setRoadmapToolbarMoreOpen(true);
          setShowAdvancedControls((prev) => !prev);
          return;
        case 'reset':
          event.preventDefault();
          resetView();
          return;
        case 'lane-menu': {
          const t = data.focusedTask ?? data.timelineTasks[0] ?? null;
          if (
            t &&
            t.kind === 'task' &&
            t.group !== ROADMAP_GANTT_MILESTONE_LANE_ID &&
            projection.lanes.some((lane) => lane.id !== ROADMAP_GANTT_MILESTONE_LANE_ID)
          ) {
            event.preventDefault();
            setLaneMoveMenuOpen(true);
            setGridNavAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttLaneMoveMenuOpenedAnnouncement);
          }
          return;
        }
        case 'noop':
        default:
          break;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
      const anchorTask = data.focusedTask ?? data.timelineTasks[0] ?? null;
      if (!anchorTask) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (anchorTask.kind === 'milestone') return;
        setSelectedTaskId(anchorTask.id);
        const laneLabel =
          projection.lanes.find((l) => l.id === anchorTask.group)?.title ?? String(anchorTask.group);
        setGridNavAnnouncement(
          ORCHESTRATION_UI_COPY.roadmapGanttKeyboardTaskOpenedAnnouncement
            .replace('{title}', anchorTask.title)
            .replace('{lane}', laneLabel),
        );
        return;
      }

      const delta = pickArrowKeyMsDelta(event.key);
      if (delta === 0) return;

      event.preventDefault();
      const anchorTime = Math.floor((anchorTask.start_time + anchorTask.end_time) / 2);
      const nextTask = pickNearestTimelineTaskForTime(data.timelineTasks, anchorTime + delta);
      if (!nextTask || nextTask.id === anchorTask.id) {
        setGridNavAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttKeyboardNavigationBoundaryAnnouncement);
        return;
      }
      setFocusedTaskId(nextTask.id);
      viewport.handlers.focusTaskBarEl(nextTask.id);
    },
    [data.focusedTask, data.timelineTasks, projection.lanes, resetView, viewport.handlers],
  );

  // ---------- Main panels tablist keyboard ----------
  const handleMainPanelTablistKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
        return;
      }
      const rawTarget = event.target as HTMLElement | null;
      const tabEl = rawTarget?.closest('[role="tab"]');
      if (!(tabEl instanceof HTMLElement) || !event.currentTarget.contains(tabEl)) {
        return;
      }
      event.preventDefault();
      const panels: ReadonlyArray<ActivePanel> = ['timeline', 'dependencies'];
      const idx = panels.indexOf(activePanel);
      const focusTabByIndex = (i: number) => {
        const id = i === 0 ? mainTabTimelineId : mainTabDependenciesId;
        window.requestAnimationFrame(() => document.getElementById(id)?.focus());
      };
      if (event.key === 'Home') {
        setActivePanel('timeline');
        setMainPanelTabAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementTimeline);
        focusTabByIndex(0);
        return;
      }
      if (event.key === 'End') {
        setActivePanel('dependencies');
        setMainPanelTabAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementDependencies);
        focusTabByIndex(1);
        return;
      }
      const nextIdx =
        event.key === 'ArrowRight' ? Math.min(idx + 1, panels.length - 1) : Math.max(idx - 1, 0);
      const next = panels[nextIdx]!;
      setActivePanel(next);
      setMainPanelTabAnnouncement(
        next === 'timeline'
          ? ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementTimeline
          : ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementDependencies,
      );
      focusTabByIndex(nextIdx);
    },
    [activePanel, mainTabDependenciesId, mainTabTimelineId],
  );

  // ---------- Active filter tags (clear callbacks live in the orchestrator) ----------
  const tagClearById = useMemo(
    () => ({
      depType: () => setDependencyTypeFilter('all'),
      blocked: () => setBlockedOnly(false),
      owner: () => setOwnerFilter('all'),
      status: () => setStatusFilter('all'),
      lane: () => setLaneFilter('all'),
      depView: () => setDependencyView('all'),
      cpOnly: () => setCriticalPathOnly(false),
      title: () => setTitleQuery(''),
    }),
    [],
  );

  const activeFilterTags = useMemo<RoadmapGanttActiveFilterTag[]>(
    () => data.activeFilterTagsResult.tags.map((tag) => ({ ...tag, clear: tagClearById[tag.id] })),
    [data.activeFilterTagsResult.tags, tagClearById],
  );

  return {
    state: {
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
    },
    setters: {
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
    },
    refs: {
      timelineShellRef: viewport.refs.timelineShellRef,
      overviewTrackRef: viewport.refs.overviewTrackRef,
    },
    ids: {
      mainTabTimelineId,
      mainTabDependenciesId,
      mainPanelTimelineId,
      mainPanelDependenciesId,
      depsTabGraphId,
      depsTabTableId,
      depsPanelGraphId,
      depsPanelTableId,
      roadmapOverviewMapDescriptionId,
    },
    derived: {
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
    },
    handlers: {
      applyLaneFocusFilter,
      handleTimelineGridKeyDown,
      handleOverviewKeyDown: viewport.handlers.handleOverviewKeyDown,
      handleMainPanelTablistKeyDown,
      handleTimelineItemMove: interactions.handleTimelineItemMove,
      handleTimelineItemResize: interactions.handleTimelineItemResize,
      scrollTimelineByDirection: viewport.handlers.scrollTimelineByDirection,
      jumpTimelineRangeByDirection: viewport.handlers.jumpTimelineRangeByDirection,
      jumpTimelineToToday: viewport.handlers.jumpTimelineToToday,
      handleOverviewPointer: viewport.handlers.handleOverviewPointer,
      downloadSprintPlanCsv,
      downloadIcal,
      captureBaseline: data.captureBaseline,
      clearBaseline: data.clearBaseline,
      toggleDependencySort,
      sortArrow,
      resetView,
      applyPresetBlocked,
      applyPresetExecution,
      applyPresetCriticalPath,
      selectTask: interactions.selectTask,
    },
  };
}
