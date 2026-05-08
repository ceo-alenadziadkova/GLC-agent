import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useLocation, useSearchParams } from 'react-router';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import {
  ROADMAP_GANTT_DAY_MS,
  ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD,
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
import {
  clearRoadmapGanttBaseline,
  purgeInvalidRoadmapGanttBaselineIfNeeded,
  readRoadmapGanttBaseline,
  writeRoadmapGanttBaseline,
  type RoadmapGanttBaselineSnapshot,
} from '../lib/roadmap-gantt-baseline-storage';
import { buildIcalFromProjection, icsFilenameForAudit } from '../lib/roadmap-gantt-ical';
import {
  roadmapGanttOverviewKeyboardStepPx,
  roadmapGanttOverviewPageStepPx,
  roadmapGanttToolbarScrollDeltaPx,
} from '../lib/roadmap-gantt-scroll-math';
import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttDependency,
  type RoadmapGanttProjection,
  type RoadmapGanttTask,
} from '../lib/roadmap-gantt-mapper';
import {
  buildChainTaskIds,
  buildHighlightedTaskIds,
  filterRoadmapGanttVisibleDependencies,
  sortRoadmapGanttDependencies,
  type RoadmapGanttDependencySort,
  type RoadmapGanttDependencyTypeFilter,
  type RoadmapGanttDependencyView,
} from '../lib/roadmap-gantt-dependency-filters';
import {
  buildActiveFilterTags,
  type RoadmapGanttActiveFilterTagId,
} from '../lib/roadmap-gantt-active-filter-tags';
import {
  computeOverviewWindowMetrics,
  type RoadmapGanttScrollMetrics,
} from '../lib/roadmap-gantt-overview-window';
import {
  computeRoadmapGanttViewportEnd,
  pickNearestTimelineTaskForTime,
} from '../lib/roadmap-gantt-viewport';
import {
  buildPlanUrlWithViewPreservingForeignParams,
  readPlanLaneFilterKeys,
} from '../lib/plan-cross-nav';
import { buildAppRoute } from '../config/route-paths';
import { invalidatePlanWorkspaceQueries } from '../lib/plan-workspace-queries';
import { usePatchPlanBoardCardMutation } from '../data/api/plan-board-queries';
import { useQueryClient } from '../lib/tanstack-react-query';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import type { PlanBoardCardDto } from '../data/api/audits-orchestration';
import type {
  RoadmapGanttPlanBoardHydration,
} from '../components/roadmap-gantt/types';
import type { TaskDetailsPlanBoardMove } from '../components/roadmap-gantt/TaskDetailsDrawer';
import { buildGanttTimelineGroups } from '../components/roadmap-gantt/lib/build-timeline-groups';
import { buildGanttTimelineItems } from '../components/roadmap-gantt/lib/build-timeline-items';
import type { GanttTaskItem } from '../components/roadmap-gantt/lib/timeline-item-types';
import { useProfile } from './useProfile';
import { useRoadmapGanttFilteredTasks } from './useRoadmapGanttFilteredTasks';
import { useRoadmapGanttDependencySvgPaths } from './useRoadmapGanttDependencySvgPaths';
import { usePlanFocusPackNodeId } from './usePlanFocusKey';

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
  const qc = useQueryClient();
  const patchBoardCardMutation = usePatchPlanBoardCardMutation({ auditId });

  const [timelineTaskOverrides, setTimelineTaskOverrides] = useState<
    Record<string, { start_time: number; end_time: number; group: string }>
  >({});
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
  const [criticalPathOnly, setCriticalPathOnly] = useState<boolean>(() => readCriticalPathOnlyFromSearchParams(searchParams));
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
  const [baselineSnapshot, setBaselineSnapshot] = useState<RoadmapGanttBaselineSnapshot | null>(() =>
    readRoadmapGanttBaseline(auditId),
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollMetrics, setScrollMetrics] = useState<RoadmapGanttScrollMetrics>({
    left: 0,
    max: 0,
    clientWidth: 0,
  });
  /** Coalesce rapid scroll/wheel updates so overview positioning does not rerender entire Gantt each event. */
  const scrollMetricsRafRef = useRef<number | null>(null);
  const pendingScrollMetricsRef = useRef<RoadmapGanttScrollMetrics | null>(null);
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

  const timelineShellRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLElement | null>(null);
  const overviewTrackRef = useRef<HTMLDivElement | null>(null);
  const mainTabTimelineId = useId();
  const mainTabDependenciesId = useId();
  const mainPanelTimelineId = useId();
  const mainPanelDependenciesId = useId();
  const depsTabGraphId = useId();
  const depsTabTableId = useId();
  const depsPanelGraphId = useId();
  const depsPanelTableId = useId();
  const roadmapOverviewMapDescriptionId = useId();

  // ---------- Baseline lifecycle ----------
  useEffect(() => {
    if (purgeInvalidRoadmapGanttBaselineIfNeeded(auditId)) {
      toast.info(ORCHESTRATION_UI_COPY.roadmapGanttBaselineStoredFormatResetNotice);
      setBaselineSnapshot(null);
    }
  }, [auditId]);

  useEffect(() => {
    setBaselineSnapshot(readRoadmapGanttBaseline(auditId));
  }, [auditId]);

  // ---------- Filtered tasks (delegates to existing hook) ----------
  const { filteredTasks, filteredTaskIds } = useRoadmapGanttFilteredTasks(projection, {
    titleQuery,
    criticalPathOnly,
    ownerFilter,
    statusFilter,
    laneFilter,
    blockedOnly,
  });

  const timelineTasks = useMemo<RoadmapGanttTask[]>(
    () =>
      filteredTasks.map((task) => {
        if (task.kind !== 'task') return task;
        const override = timelineTaskOverrides[task.id];
        if (!override) return task;
        return {
          ...task,
          start_time: override.start_time,
          end_time: override.end_time,
          // Lane id is validated by handleTimelineItemMove (rejects milestone lane).
          group: override.group as RoadmapGanttTask['group'],
        };
      }),
    [filteredTasks, timelineTaskOverrides],
  );

  const chainTaskIds = useMemo(
    () =>
      buildChainTaskIds({
        projection,
        selectedTaskId,
        enabled: highlightDependencyChain,
      }),
    [highlightDependencyChain, projection, selectedTaskId],
  );

  // ---------- Plan Board hydration & inline edit gating ----------
  const boardRowByPackNodeId = useMemo(() => {
    const map = new Map<string, PlanBoardCardDto>();
    for (const row of planBoardHydration?.cards ?? []) {
      if (row.pack_graph_node_id) {
        map.set(row.pack_graph_node_id, row);
      }
    }
    return map;
  }, [planBoardHydration?.cards]);

  const timelineBoardEditEnabled =
    !isClient &&
    Boolean(planBoardHydration?.enabled) &&
    !planBoardHydration?.pending &&
    !planBoardHydration?.fetchFailed &&
    !planBoardHydration?.blockedGovernance &&
    !planBoardHydration?.blockedNoPack;

  const timelineEditableTaskIds = useMemo(() => {
    const set = new Set<string>();
    if (!timelineBoardEditEnabled) return set;
    for (const task of timelineTasks) {
      if (task.kind !== 'task') continue;
      if (boardRowByPackNodeId.has(task.id)) {
        set.add(task.id);
      }
    }
    return set;
  }, [boardRowByPackNodeId, timelineBoardEditEnabled, timelineTasks]);

  // ---------- Groups / items / dependency derivations ----------
  const groups = useMemo(
    () =>
      buildGanttTimelineGroups({
        projectionLanes: projection.lanes,
        timelineTasks,
        milestoneLaneTitle: ORCHESTRATION_UI_COPY.roadmapGanttMilestonesLaneTitle,
      }),
    [projection.lanes, timelineTasks],
  );

  const items = useMemo(
    () =>
      buildGanttTimelineItems({
        timelineTasks,
        timelineEditableTaskIds,
        chainTaskIds,
      }),
    [chainTaskIds, timelineEditableTaskIds, timelineTasks],
  );

  const taskTitleById = useMemo(
    () => new Map(projection.tasks.map((task) => [task.id, task.title] as const)),
    [projection.tasks],
  );
  const taskByIdFull = useMemo(
    () => new Map(projection.tasks.map((task) => [task.id, task] as const)),
    [projection.tasks],
  );

  const visibleDependencies = useMemo(
    () =>
      filterRoadmapGanttVisibleDependencies({
        deps: projection.dependencies,
        filteredTaskIds,
        dependencyTypeFilter,
        blockedOnly,
        dependencyView,
        selectedTaskId,
      }),
    [blockedOnly, dependencyTypeFilter, dependencyView, filteredTaskIds, projection.dependencies, selectedTaskId],
  );

  const sortedVisibleDependencies = useMemo(
    () => sortRoadmapGanttDependencies({ deps: visibleDependencies, taskTitleById, sort: dependencySort }),
    [visibleDependencies, taskTitleById, dependencySort],
  );

  const hoveredDependency = useMemo(
    () => visibleDependencies.find((dep) => dep.id === hoveredDependencyId) ?? null,
    [visibleDependencies, hoveredDependencyId],
  );
  const highlightedTaskIds = useMemo(() => buildHighlightedTaskIds(hoveredDependency), [hoveredDependency]);

  const dependencyChainShouldDim = useCallback(
    (dep: RoadmapGanttDependency) =>
      chainTaskIds != null &&
      Boolean(selectedTaskId && projection.tasks.some((t) => t.id === selectedTaskId && t.kind === 'task')) &&
      (!chainTaskIds.has(dep.from) || !chainTaskIds.has(dep.to)),
    [chainTaskIds, projection.tasks, selectedTaskId],
  );

  // ---------- Selection / drawer ----------
  const selectedTask = useMemo(
    () => projection.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [projection.tasks, selectedTaskId],
  );
  const drawerTask = selectedTask?.kind === 'task' ? selectedTask : null;
  const downstreamTaskCount =
    drawerTask != null ? (projection.downstreamByTask.get(drawerTask.id)?.size ?? 0) : 0;
  const deliveryBoardHref = drawerTask ? (getDeliveryBoardHrefForPackNode?.(drawerTask.id) ?? null) : null;

  const taskPlanBoardMove = useMemo<TaskDetailsPlanBoardMove>(() => {
    const h = planBoardHydration;
    if (!h?.enabled) return { status: 'off' };
    if (h.fetchFailed) return { status: 'query_failed' };
    if (h.pending) return { status: 'loading' };
    if (h.blockedNoPack) return { status: 'blocked_no_pack' };
    if (h.blockedGovernance) return { status: 'blocked_governance' };
    const dt = drawerTask;
    if (!dt || dt.kind !== 'task') return { status: 'off' };
    const row =
      [...h.cards].find((c) => c.pack_graph_node_id === dt.id) ??
      [...h.cards].find((c) => c.canonical_node_key === dt.id) ??
      null;
    if (!row) return { status: 'no_row' };
    return { status: 'ready', row, packVersion: h.packVersionUsed, role: h.role };
  }, [planBoardHydration, drawerTask]);

  const consultantBoardPlanHref = useMemo(() => {
    if (isClient || !auditId) return null;
    const pathname = location.pathname.includes('/portal/plan/')
      ? buildAppRoute.portalPlan(auditId, 'board').replace(/\?.*$/, '')
      : buildAppRoute.plan(auditId, 'board').replace(/\?.*$/, '');
    return buildPlanUrlWithViewPreservingForeignParams({
      pathname,
      currentSearch: location.search ?? '',
      nextView: 'board',
    });
  }, [auditId, isClient, location.pathname, location.search]);

  // ---------- Plan Board PATCH on DnD/resize ----------
  const updateTaskDatesFromTimeline = useCallback(
    async (target: { taskId: string; startMs: number; endMs: number; groupId: string }) => {
      const boardRow = boardRowByPackNodeId.get(target.taskId);
      if (!boardRow || !timelineBoardEditEnabled || !planBoardHydration) return;
      const prev = timelineTaskOverrides[target.taskId];
      setTimelineTaskOverrides((current) => ({
        ...current,
        [target.taskId]: {
          start_time: target.startMs,
          end_time: target.endMs,
          group: target.groupId,
        },
      }));
      try {
        await patchBoardCardMutation.mutateAsync({
          cardId: boardRow.id,
          body: {
            expected_pack_version: planBoardHydration.packVersionUsed,
            start_date: dayjs(target.startMs).format('YYYY-MM-DD'),
            end_date: dayjs(target.endMs).format('YYYY-MM-DD'),
            due_date: dayjs(target.endMs).format('YYYY-MM-DD'),
            lane: target.groupId !== ROADMAP_GANTT_MILESTONE_LANE_ID ? target.groupId : undefined,
          },
        });
        await invalidatePlanWorkspaceQueries(qc, auditId);
      } catch {
        setTimelineTaskOverrides((current) => {
          const next = { ...current };
          if (prev) next[target.taskId] = prev;
          else delete next[target.taskId];
          return next;
        });
        toast.error(ORCHESTRATION_UI_COPY.planRoadmapTimelineQueryFailedBody);
      }
    },
    [
      auditId,
      boardRowByPackNodeId,
      patchBoardCardMutation,
      planBoardHydration,
      qc,
      timelineBoardEditEnabled,
      timelineTaskOverrides,
    ],
  );

  // ---------- Focus & lane-move helpers ----------
  const focusedTask = useMemo(
    () => timelineTasks.find((task) => task.id === focusedTaskId) ?? null,
    [focusedTaskId, timelineTasks],
  );

  const selectableLanesForJump = useMemo(
    () => projection.lanes.filter((lane) => lane.id !== ROADMAP_GANTT_MILESTONE_LANE_ID),
    [projection.lanes],
  );

  const laneMoveMenuEligible =
    selectableLanesForJump.length > 0 &&
    focusedTask != null &&
    focusedTask.kind === 'task' &&
    focusedTask.group !== ROADMAP_GANTT_MILESTONE_LANE_ID;

  const applyLaneFocusFilter = useCallback((lane: { id: string; title: string }) => {
    setLaneFilter(String(lane.id));
    setLaneMoveMenuOpen(false);
    setGridNavAnnouncement(
      ORCHESTRATION_UI_COPY.roadmapGanttKeyboardLaneFilterAnnouncement.replace('{lane}', lane.title),
    );
  }, []);

  // ---------- URL focus resolution ----------
  const taskIdListKey = useMemo(() => projection.tasks.map((t) => t.id).sort().join(','), [projection.tasks]);
  const resolvedFocusTaskId = usePlanFocusPackNodeId(orchestrationPack ?? null);
  const taskParamFromUrl = searchParams.get(ROADMAP_SEARCH_PARAM_TASK) ?? '';

  useEffect(() => {
    if (taskParamFromUrl && projection.tasks.some((t) => t.id === taskParamFromUrl)) {
      setSelectedTaskId(taskParamFromUrl);
      setFocusedTaskId(taskParamFromUrl);
      return;
    }
    if (resolvedFocusTaskId && projection.tasks.some((t) => t.id === resolvedFocusTaskId)) {
      setSelectedTaskId(resolvedFocusTaskId);
      setFocusedTaskId(resolvedFocusTaskId);
    }
  }, [taskIdListKey, resolvedFocusTaskId, taskParamFromUrl, projection.tasks]);

  const isHeavyTaskLoad = timelineTasks.length >= ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD;

  // ---------- Dependency SVG paths (delegates to existing hook) ----------
  const { dependencySvgPathsByDepId, mapX, mapY, dependencyCanvasHeight, timelineRangeMs } = useRoadmapGanttDependencySvgPaths({
    filteredTasks: timelineTasks,
    groups,
    projection: { defaultTimeStart: projection.defaultTimeStart, defaultTimeEnd: projection.defaultTimeEnd },
    visibleDependencies,
    freezeGeometry: isOverviewDragging,
  });

  const overviewTasks = timelineTasks.length > 0 ? timelineTasks : projection.tasks;
  const overviewWindow = useMemo(() => computeOverviewWindowMetrics(scrollMetrics), [scrollMetrics]);

  // ---------- Scroll metrics + raf coalescing ----------
  useEffect(() => {
    const root = timelineShellRef.current;
    if (!root) return;
    const scrollNode = root.querySelector('.rct-scroll') as HTMLElement | null;
    if (!scrollNode) return;
    timelineScrollRef.current = scrollNode;

    const flushScrollMetrics = () => {
      scrollMetricsRafRef.current = null;
      const next = pendingScrollMetricsRef.current;
      if (next) setScrollMetrics(next);
    };

    const updateScrollState = () => {
      const maxScroll = scrollNode.scrollWidth - scrollNode.clientWidth;
      const left = scrollNode.scrollLeft;
      setCanScrollLeft(left > 2);
      setCanScrollRight(maxScroll - left > 2);
      pendingScrollMetricsRef.current = {
        left,
        max: Math.max(maxScroll, 1),
        clientWidth: Math.max(scrollNode.clientWidth, 1),
      };
      if (scrollMetricsRafRef.current === null) {
        scrollMetricsRafRef.current = window.requestAnimationFrame(flushScrollMetrics);
      }
    };

    updateScrollState();
    scrollNode.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      if (scrollMetricsRafRef.current !== null) {
        window.cancelAnimationFrame(scrollMetricsRafRef.current);
        scrollMetricsRafRef.current = null;
      }
      pendingScrollMetricsRef.current = null;
      scrollNode.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      if (timelineScrollRef.current === scrollNode) {
        timelineScrollRef.current = null;
      }
    };
  }, [groups.length, items.length, projection.defaultTimeEnd, projection.defaultTimeStart]);

  // ---------- Focus reconciliation ----------
  useEffect(() => {
    if (timelineTasks.length === 0) {
      setFocusedTaskId(null);
      return;
    }
    if (focusedTaskId == null || !timelineTasks.some((task) => task.id === focusedTaskId)) {
      setFocusedTaskId(timelineTasks[0]!.id);
    }
  }, [focusedTaskId, timelineTasks]);

  useEffect(() => {
    if (selectedTaskId && !projection.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [projection.tasks, selectedTaskId]);

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

  // ---------- Focus task bar (DOM helper) ----------
  const focusTaskBarEl = useCallback((taskId: string) => {
    window.requestAnimationFrame(() => {
      const outer = timelineShellRef.current;
      if (!outer) return;
      const node = outer.querySelector(`[data-roadmap-task-id="${CSS.escape(taskId)}"]`) as HTMLElement | null;
      node?.focus({ preventScroll: false });
      if (node && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }, []);

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
    setFocusedTaskId(timelineTasks[0]?.id ?? null);
    setActivePanel('timeline');
    setDependenciesTab('graph');
    setShowAdvancedControls(false);
    setShowRestoredViewNotice(false);
  }, [timelineTasks]);

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

  // ---------- Keyboard handlers ----------
  const handleTimelineGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === '?') {
        event.preventDefault();
        setShowAdvancedControls(true);
        return;
      }
      const lower = event.key.toLowerCase();
      if (lower === 't') {
        event.preventDefault();
        setActivePanel('timeline');
        return;
      }
      if (lower === 'd') {
        event.preventDefault();
        setActivePanel('dependencies');
        return;
      }
      if (lower === 'g') {
        event.preventDefault();
        setDependenciesTab('graph');
        return;
      }
      if (lower === 'b') {
        event.preventDefault();
        setDependenciesTab('table');
        return;
      }
      if (lower === 'a') {
        event.preventDefault();
        setRoadmapToolbarMoreOpen(true);
        setShowAdvancedControls((prev) => !prev);
        return;
      }
      if (lower === 'r') {
        event.preventDefault();
        resetView();
        return;
      }
      if (lower === 'm') {
        const t = focusedTask ?? timelineTasks[0] ?? null;
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
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
      const anchorTask = focusedTask ?? timelineTasks[0] ?? null;
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

      let delta = 0;
      if (event.key === 'ArrowLeft') delta = -ROADMAP_GANTT_DAY_MS;
      if (event.key === 'ArrowRight') delta = ROADMAP_GANTT_DAY_MS;
      if (event.key === 'ArrowUp') delta = -7 * ROADMAP_GANTT_DAY_MS;
      if (event.key === 'ArrowDown') delta = 7 * ROADMAP_GANTT_DAY_MS;
      if (delta === 0) return;

      event.preventDefault();
      const anchorTime = Math.floor((anchorTask.start_time + anchorTask.end_time) / 2);
      const nextTask = pickNearestTimelineTaskForTime(timelineTasks, anchorTime + delta);
      if (!nextTask || nextTask.id === anchorTask.id) {
        setGridNavAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttKeyboardNavigationBoundaryAnnouncement);
        return;
      }
      setFocusedTaskId(nextTask.id);
      focusTaskBarEl(nextTask.id);
    },
    [focusTaskBarEl, focusedTask, projection.lanes, resetView, timelineTasks],
  );

  // ---------- Scroll commands ----------
  const scrollTimelineByDirection = useCallback((direction: 'left' | 'right') => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const amount = roadmapGanttToolbarScrollDeltaPx(scrollNode.clientWidth);
    const delta = direction === 'left' ? -amount : amount;
    scrollNode.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const jumpTimelineRangeByDirection = useCallback(
    (direction: 'previous' | 'next') => {
      scrollTimelineByDirection(direction === 'previous' ? 'left' : 'right');
    },
    [scrollTimelineByDirection],
  );

  const jumpTimelineToToday = useCallback(() => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const now = Date.now();
    const ratio = (now - projection.defaultTimeStart) / timelineRangeMs;
    const clampedRatio = Math.min(Math.max(ratio, 0), 1);
    const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
    const target = Math.floor(maxScroll * clampedRatio - scrollNode.clientWidth / 2);
    scrollNode.scrollTo({ left: Math.min(Math.max(target, 0), maxScroll), behavior: 'smooth' });
  }, [projection.defaultTimeStart, timelineRangeMs]);

  const scrollTimelineToRatio = useCallback(
    (ratio: number) => {
      const scrollNode = timelineScrollRef.current;
      if (!scrollNode) return;
      const clamped = Math.min(Math.max(ratio, 0), 1);
      const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
      scrollNode.scrollTo({ left: maxScroll * clamped, behavior: isOverviewDragging ? 'auto' : 'smooth' });
    },
    [isOverviewDragging],
  );

  const handleOverviewKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (timelineTasks.length === 0) return;
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
    const step = roadmapGanttOverviewKeyboardStepPx(scrollNode.clientWidth);
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollNode.scrollBy({ left: -step, behavior: 'smooth' });
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollNode.scrollBy({ left: step, behavior: 'smooth' });
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      scrollNode.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      scrollNode.scrollTo({ left: maxScroll, behavior: 'smooth' });
      return;
    }
    const pageStep = roadmapGanttOverviewPageStepPx(scrollNode.clientWidth, step);
    if (event.key === 'PageDown') {
      event.preventDefault();
      scrollNode.scrollBy({ left: pageStep, behavior: 'smooth' });
      return;
    }
    if (event.key === 'PageUp') {
      event.preventDefault();
      scrollNode.scrollBy({ left: -pageStep, behavior: 'smooth' });
    }
  }, [timelineTasks.length]);

  const handleOverviewPointer = useCallback(
    (clientX: number) => {
      const track = overviewTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = (clientX - rect.left) / rect.width;
      scrollTimelineToRatio(ratio);
    },
    [scrollTimelineToRatio],
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

  // ---------- Live region: focus / panel tab announcement throttle ----------
  const focusedTaskLiveRegionSig = useMemo(() => {
    const task = projection.tasks.find((t) => t.id === focusedTaskId);
    if (!task || !focusedTaskId) return '';
    return `${task.title}\u001f${task.group}\u001f${task.start_time}\u001f${task.end_time}`;
  }, [focusedTaskId, projection.tasks]);

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

  // ---------- Baseline capture/clear ----------
  const captureBaseline = useCallback(() => {
    writeRoadmapGanttBaseline(auditId, projection);
    setBaselineSnapshot(readRoadmapGanttBaseline(auditId));
  }, [auditId, projection]);

  const clearBaseline = useCallback(() => {
    clearRoadmapGanttBaseline(auditId);
    setBaselineSnapshot(null);
  }, [auditId]);

  // ---------- DnD handlers ----------
  const handleTimelineItemMove = useCallback(
    (itemId: number | string, dragTime: number, newGroupOrder: number) => {
      const taskId = String(itemId);
      if (!timelineEditableTaskIds.has(taskId)) return;
      const current = timelineTasks.find((task) => task.id === taskId && task.kind === 'task');
      if (!current) return;
      const nextGroupId = groups[newGroupOrder]?.id;
      if (typeof nextGroupId !== 'string' || nextGroupId === ROADMAP_GANTT_MILESTONE_LANE_ID) return;
      const duration = Math.max(ROADMAP_GANTT_DAY_MS, current.end_time - current.start_time);
      void updateTaskDatesFromTimeline({
        taskId,
        startMs: dragTime,
        endMs: dragTime + duration,
        groupId: nextGroupId,
      });
    },
    [groups, timelineEditableTaskIds, timelineTasks, updateTaskDatesFromTimeline],
  );

  const handleTimelineItemResize = useCallback(
    (itemId: number | string, time: number, edge: 'left' | 'right') => {
      const taskId = String(itemId);
      if (!timelineEditableTaskIds.has(taskId)) return;
      const current = timelineTasks.find((task) => task.id === taskId && task.kind === 'task');
      if (!current) return;
      const nextStart = edge === 'left' ? Math.min(time, current.end_time - ROADMAP_GANTT_DAY_MS) : current.start_time;
      const nextEnd = edge === 'right' ? Math.max(time, current.start_time + ROADMAP_GANTT_DAY_MS) : current.end_time;
      void updateTaskDatesFromTimeline({
        taskId,
        startMs: nextStart,
        endMs: nextEnd,
        groupId: current.group,
      });
    },
    [timelineEditableTaskIds, timelineTasks, updateTaskDatesFromTimeline],
  );

  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setFocusedTaskId(taskId);
  }, []);

  // ---------- Owner options & active filter tags ----------
  const ownerOptions = useMemo(() => {
    return Array.from(
      new Set(projection.tasks.filter((task) => task.kind === 'task').map((task) => task.owner).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [projection.tasks]);

  const activeFilterTagsResult = useMemo(
    () =>
      buildActiveFilterTags({
        state: {
          dependencyTypeFilter,
          blockedOnly,
          ownerFilter,
          statusFilter,
          laneFilter,
          dependencyView,
          criticalPathOnly,
          titleQuery,
        },
        lanes: projection.lanes,
        copy: {
          dependencyPrefix: 'Dependency: ',
          blockedOnlyLabel: 'Blocked only',
          ownerPrefix: 'Owner: ',
          statusPrefix: 'Status: ',
          lanePrefix: 'Lane: ',
          dependencyViewPrefix: 'Dependency view: ',
          dependencyViewSelectedLabel: 'selected task',
          dependencyViewHideWeakLabel: 'hide weak',
          criticalPathLabel: ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathFilterLabel,
          titleQueryPrefix: `${ORCHESTRATION_UI_COPY.roadmapGanttSearchAriaLabel}: `,
        },
      }),
    [
      blockedOnly,
      criticalPathOnly,
      dependencyTypeFilter,
      dependencyView,
      laneFilter,
      ownerFilter,
      projection.lanes,
      statusFilter,
      titleQuery,
    ],
  );

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
    () => activeFilterTagsResult.tags.map((tag) => ({ ...tag, clear: tagClearById[tag.id] })),
    [activeFilterTagsResult.tags, tagClearById],
  );

  // ---------- Viewport ----------
  const isMonthScale = timeScale === 'month';
  const defaultViewportStart = projection.defaultTimeStart;
  const defaultViewportEnd = useMemo(
    () =>
      computeRoadmapGanttViewportEnd({
        defaultTimeStart: projection.defaultTimeStart,
        defaultTimeEnd: projection.defaultTimeEnd,
        isMonthScale,
        dayRangeDays,
      }),
    [dayRangeDays, isMonthScale, projection.defaultTimeEnd, projection.defaultTimeStart],
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
      baselineSnapshot,
      canScrollLeft,
      canScrollRight,
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
      timelineShellRef,
      overviewTrackRef,
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
      isMonthScale,
      timelineTasks,
      filteredTaskIds,
      groups,
      items,
      chainTaskIds,
      selectableLanesForJump,
      laneMoveMenuEligible,
      timelineEditableTaskIds,
      selectedTask,
      drawerTask,
      downstreamTaskCount,
      deliveryBoardHref,
      taskPlanBoardMove,
      consultantBoardPlanHref,
      focusedTask,
      taskTitleById,
      taskByIdFull,
      visibleDependencies,
      sortedVisibleDependencies,
      hoveredDependency,
      highlightedTaskIds,
      dependencyChainShouldDim,
      overviewWindow,
      overviewTasks,
      isHeavyTaskLoad,
      ownerOptions,
      activeFilterTags,
      activeFilterReason: activeFilterTagsResult.reason,
      hasActiveFilters: activeFilterTagsResult.hasActiveFilters,
      advancedFiltersCount: activeFilterTagsResult.advancedFiltersCount,
      defaultViewportStart,
      defaultViewportEnd,
      dependencySvgPathsByDepId,
      mapX,
      mapY,
      dependencyCanvasHeight,
      timelineRangeMs,
    },
    handlers: {
      applyLaneFocusFilter,
      handleTimelineGridKeyDown,
      handleOverviewKeyDown,
      handleMainPanelTablistKeyDown,
      handleTimelineItemMove,
      handleTimelineItemResize,
      scrollTimelineByDirection,
      jumpTimelineRangeByDirection,
      jumpTimelineToToday,
      handleOverviewPointer,
      downloadSprintPlanCsv,
      downloadIcal,
      captureBaseline,
      clearBaseline,
      toggleDependencySort,
      sortArrow,
      resetView,
      applyPresetBlocked,
      applyPresetExecution,
      applyPresetCriticalPath,
      selectTask,
    },
  };
}
