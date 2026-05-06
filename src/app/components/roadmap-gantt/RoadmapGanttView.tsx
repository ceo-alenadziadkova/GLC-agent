import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type Key,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Diamond } from '@phosphor-icons/react';
import { Link, useLocation, useSearchParams } from 'react-router';
import Timeline, {
  TimelineHeaders,
  DateHeader,
  SidebarHeader,
  TimelineMarkers,
  TodayMarker,
  type ReactCalendarTimelineProps,
  type TimelineGroupBase,
  type TimelineItemBase,
} from 'react-calendar-timeline';
import 'react-calendar-timeline/style.css';
import './RoadmapGanttView.css';
import dayjs from 'dayjs';
import { toast } from 'sonner';

import {
  ROADMAP_GANTT_DAY_MS,
  ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD,
  ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS,
  ROADMAP_GANTT_STORAGE_SHOW_SLACK,
  ROADMAP_GANTT_TIMELINE_LINE_HEIGHT_PX,
  ROADMAP_GANTT_TIMELINE_MAX_ZOOM_DAY_MS,
  ROADMAP_GANTT_TIMELINE_MAX_ZOOM_MONTH_MS,
  ROADMAP_GANTT_TIMELINE_MIN_ZOOM_MS,
  ROADMAP_SEARCH_PARAM_SCHED,
  ROADMAP_SEARCH_PARAM_SLACK,
} from '../../config/roadmap-gantt-view-preferences';
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
} from '../../lib/roadmap-gantt-url-params';
import { DEPENDENCY_KIND_LABEL } from '../../lib/roadmap-gantt-dep-kind-labels';
import { RoadmapGanttDependencyTable } from './RoadmapGanttDependencyTable';
import { RoadmapGanttToolbar } from './RoadmapGanttToolbar';
import { buildAppRoute } from '../../config/route-paths';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { api } from '../../data/apiService';
import {
  baselineDeltaDays,
  clearRoadmapGanttBaseline,
  purgeInvalidRoadmapGanttBaselineIfNeeded,
  readRoadmapGanttBaseline,
  writeRoadmapGanttBaseline,
  type RoadmapGanttBaselineSnapshot,
} from '../../lib/roadmap-gantt-baseline-storage';
import { buildIcalFromProjection, icsFilenameForAudit } from '../../lib/roadmap-gantt-ical';
import {
  roadmapGanttOverviewKeyboardStepPx,
  roadmapGanttOverviewPageStepPx,
  roadmapGanttToolbarScrollDeltaPx,
} from '../../lib/roadmap-gantt-scroll-math';
import type { PlanBoardCardDto } from '../../data/api/audits-orchestration';
import type { RoadmapGanttDependency, RoadmapGanttProjection, RoadmapGanttTask } from '../../lib/roadmap-gantt-mapper';
import { ROADMAP_GANTT_MILESTONE_LANE_ID } from '../../lib/roadmap-gantt-mapper';
import { RoadmapGanttDependencyGraphSvg } from './RoadmapGanttDependencyGraphSvg';
import { RoadmapGanttOverviewStrip } from './RoadmapGanttOverviewStrip';
import { TaskDetailsDrawer, type TaskDetailsPlanBoardMove } from './TaskDetailsDrawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { useProfile } from '../../hooks/useProfile';
import { useRoadmapGanttFilteredTasks } from '../../hooks/useRoadmapGanttFilteredTasks';
import { buildPlanUrlWithViewPreservingForeignParams } from '../../lib/plan-cross-nav';
import { useRoadmapGanttDependencySvgPaths } from '../../hooks/useRoadmapGanttDependencySvgPaths';

type GanttTaskItem = TimelineItemBase<number> & {
  id: string;
  group: string;
  title: string;
  className: string;
  status: 'planned' | 'in-progress' | 'done';
  kind: RoadmapGanttTask['kind'];
  onCriticalPath: boolean;
  isOverdue: boolean;
  topPriorityBucket: '7d' | '30d' | null;
  confidence: RoadmapGanttTask['confidence'];
};

/** Optional read model for Delivery Board PATCH from Roadmap drawer (ADR cross-view §5). */
export type RoadmapGanttPlanBoardHydration =
  | undefined
  | {
      enabled: boolean;
      pending: boolean;
      fetchFailed: boolean;
      blockedNoPack: boolean;
      blockedGovernance: boolean;
      cards: readonly PlanBoardCardDto[];
      packVersionUsed: number;
      role: 'consultant' | 'client';
    };

type RoadmapGanttViewProps = {
  auditId: string;
  projection: RoadmapGanttProjection;
  strategyHref: string;
  /** When set, task drawer links to Delivery Board (`?focus=<pack node id>`). */
  getDeliveryBoardHrefForPackNode?: (packGraphNodeId: string) => string | null | undefined;
  planBoardHydration?: RoadmapGanttPlanBoardHydration;
  /** Consultant-only controls injected into Gantt toolbar (e.g. manual card dialog). */
  toolbarLeadingSlot?: ReactNode | undefined;
};

export function RoadmapGanttView({
  auditId,
  projection,
  strategyHref,
  getDeliveryBoardHrefForPackNode,
  planBoardHydration,
  toolbarLeadingSlot,
}: RoadmapGanttViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { isClient } = useProfile();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams.get(ROADMAP_SEARCH_PARAM_TASK));
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [laneMoveMenuOpen, setLaneMoveMenuOpen] = useState(false);
  const [hoveredDependencyId, setHoveredDependencyId] = useState<string | null>(null);
  const [timeScale, setTimeScale] = useState<'day' | 'month'>(() => readScaleFromSearchParams(searchParams));
  const [dayRangeDays, setDayRangeDays] = useState<30 | 60 | 90>(() => readDayRangeFromSearchParams(searchParams));
  const [dependencyTypeFilter, setDependencyTypeFilter] = useState<'all' | 'FS' | 'SS' | 'FF' | 'SF'>(() =>
    readDependencyTypeFromSearchParams(searchParams),
  );
  const [densityMode, setDensityMode] = useState<'compact' | 'comfortable'>(() => readDensityFromSearchParams(searchParams));
  const [ownerFilter, setOwnerFilter] = useState<string>(() => searchParams.get(ROADMAP_SEARCH_PARAM_OWNER) ?? 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'in-progress' | 'done'>(() => {
    const value = searchParams.get(ROADMAP_SEARCH_PARAM_STATUS);
    return value === 'planned' || value === 'in-progress' || value === 'done' ? value : 'all';
  });
  const [laneFilter, setLaneFilter] = useState<string>(() => searchParams.get(ROADMAP_SEARCH_PARAM_LANE) ?? 'all');
  const [blockedOnly, setBlockedOnly] = useState<boolean>(() => searchParams.get(ROADMAP_SEARCH_PARAM_BLOCKED) === '1');
  const [dependencyView, setDependencyView] = useState<'all' | 'selected' | 'hide-weak'>(() => {
    const value = searchParams.get(ROADMAP_SEARCH_PARAM_DEP_VIEW);
    return value === 'selected' || value === 'hide-weak' ? value : 'all';
  });
  const [dependencySort, setDependencySort] = useState<{ key: 'from' | 'to' | 'type'; direction: 'asc' | 'desc' }>({
    key: searchParams.get(ROADMAP_SEARCH_PARAM_SORT_KEY) === 'to' ? 'to' : searchParams.get(ROADMAP_SEARCH_PARAM_SORT_KEY) === 'type' ? 'type' : 'from',
    direction: searchParams.get(ROADMAP_SEARCH_PARAM_SORT_DIR) === 'desc' ? 'desc' : 'asc',
  });
  const [criticalPathOnly, setCriticalPathOnly] = useState<boolean>(() => readCriticalPathOnlyFromSearchParams(searchParams));
  const [highlightDependencyChain, setHighlightDependencyChain] = useState<boolean>(() => readChainHighlightFromSearchParams(searchParams));
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
  const [scrollMetrics, setScrollMetrics] = useState<{ left: number; max: number; clientWidth: number }>({
    left: 0,
    max: 0,
    clientWidth: 0,
  });
  /** Coalesce rapid scroll/wheel updates so overview positioning does not rerender entire Gantt each event. */
  const scrollMetricsRafRef = useRef<number | null>(null);
  const pendingScrollMetricsRef = useRef<{ left: number; max: number; clientWidth: number } | null>(null);
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
  const [activePanel, setActivePanel] = useState<'timeline' | 'dependencies'>(() =>
    searchParams.get(ROADMAP_SEARCH_PARAM_PANEL) === 'dependencies' ? 'dependencies' : 'timeline',
  );
  const [dependenciesTab, setDependenciesTab] = useState<'graph' | 'table'>(() =>
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

  useEffect(() => {
    if (purgeInvalidRoadmapGanttBaselineIfNeeded(auditId)) {
      toast.info(ORCHESTRATION_UI_COPY.roadmapGanttBaselineStoredFormatResetNotice);
      setBaselineSnapshot(null);
    }
  }, [auditId]);

  const { filteredTasks, filteredTaskIds } = useRoadmapGanttFilteredTasks(projection, {
    titleQuery,
    criticalPathOnly,
    ownerFilter,
    statusFilter,
    laneFilter,
    blockedOnly,
  });

  const chainTaskIds = useMemo(() => {
    if (!highlightDependencyChain || !selectedTaskId) return null;
    const core = projection.tasks.find((t) => t.id === selectedTaskId && t.kind === 'task');
    if (!core) return null;
    const up = projection.upstreamByTask.get(core.id) ?? new Set<string>();
    const down = projection.downstreamByTask.get(core.id) ?? new Set<string>();
    return new Set<string>([...up, ...down, core.id]);
  }, [highlightDependencyChain, projection.downstreamByTask, projection.tasks, projection.upstreamByTask, selectedTaskId]);

  const dependencyChainShouldDim = useCallback(
    (dep: RoadmapGanttDependency) =>
      chainTaskIds != null &&
      Boolean(selectedTaskId && projection.tasks.some((t) => t.id === selectedTaskId && t.kind === 'task')) &&
      (!chainTaskIds.has(dep.from) || !chainTaskIds.has(dep.to)),
    [chainTaskIds, projection.tasks, selectedTaskId],
  );

  const groups: TimelineGroupBase[] = useMemo(() => {
    const availableLaneIds = new Set(filteredTasks.map((task) => task.group));
    return projection.lanes
      .filter((lane) => availableLaneIds.has(lane.id))
      .map((lane) => ({
        id: lane.id,
        title:
          lane.id === ROADMAP_GANTT_MILESTONE_LANE_ID
            ? ORCHESTRATION_UI_COPY.roadmapGanttMilestonesLaneTitle
            : lane.title,
      }));
  }, [filteredTasks, projection.lanes]);

  const items: GanttTaskItem[] = useMemo(
    () =>
      filteredTasks.map((task) => ({
        id: task.id,
        group: task.group,
        title: task.title,
        start_time: task.start_time,
        end_time: task.end_time,
        canMove: false,
        canResize: false,
        canChangeGroup: false,
        status: task.status,
        kind: task.kind,
        onCriticalPath: task.onCriticalPath,
        isOverdue: task.isOverdue,
        topPriorityBucket: task.topPriorityBucket,
        confidence: task.confidence,
        className: [
          task.isEstimated ? 'roadmap-gantt-item-estimated' : 'roadmap-gantt-item-solid',
          `roadmap-gantt-item-status-${task.status}`,
          task.onCriticalPath ? 'roadmap-gantt-item-critical' : '',
          task.isOverdue ? 'roadmap-gantt-item-overdue' : '',
          task.topPriorityBucket === '7d' ? 'roadmap-gantt-item-priority-7d' : '',
          task.topPriorityBucket === '30d' ? 'roadmap-gantt-item-priority-30d' : '',
          task.kind === 'milestone' ? 'roadmap-gantt-milestone-item' : '',
          chainTaskIds != null && task.kind === 'task' && !chainTaskIds.has(task.id) ? 'roadmap-gantt-item-dimmed' : '',
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [chainTaskIds, filteredTasks],
  );

  const selectedTask = useMemo(
    () => projection.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [projection.tasks, selectedTaskId],
  );
  const drawerTask = selectedTask?.kind === 'task' ? selectedTask : null;
  const downstreamTaskCount =
    drawerTask != null ? (projection.downstreamByTask.get(drawerTask.id)?.size ?? 0) : 0;
  const deliveryBoardHref = drawerTask ? (getDeliveryBoardHrefForPackNode?.(drawerTask.id) ?? null) : null;

  const taskPlanBoardMove = useMemo((): TaskDetailsPlanBoardMove => {
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
  const focusedTask = useMemo(
    () => filteredTasks.find((task) => task.id === focusedTaskId) ?? null,
    [filteredTasks, focusedTaskId],
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

  const taskTitleById = useMemo(() => new Map(projection.tasks.map((task) => [task.id, task.title] as const)), [projection.tasks]);
  const taskByIdFull = useMemo(
    () => new Map(projection.tasks.map((task) => [task.id, task] as const)),
    [projection.tasks],
  );
  const isHeavyTaskLoad = filteredTasks.length >= ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD;

  const strokeForKind = (kind: string): string => {
    if (kind === 'FS') return 'var(--score-5)';
    if (kind === 'SS') return 'var(--glc-blue)';
    if (kind === 'FF') return 'var(--score-3)';
    return 'var(--text-tertiary)';
  };
  const strokeForDependencySeg = (dep: (typeof projection.dependencies)[number]) => {
    if (dep.onCriticalPath) return 'var(--glc-blue)';
    return strokeForKind(dep.kind);
  };
  const visibleDependencies = useMemo(() => {
    return projection.dependencies.filter((dep) => {
      if (!filteredTaskIds.has(dep.from) || !filteredTaskIds.has(dep.to)) return false;
      if (dependencyTypeFilter !== 'all' && dep.kind !== dependencyTypeFilter) return false;
      if (blockedOnly && !dep.blocking) return false;
      if (dependencyView === 'selected') {
        if (!selectedTaskId) return false;
        if (dep.from !== selectedTaskId && dep.to !== selectedTaskId) return false;
      }
      if (dependencyView === 'hide-weak' && dep.strength === 'weak') return false;
      return true;
    });
  }, [blockedOnly, dependencyTypeFilter, dependencyView, filteredTaskIds, projection.dependencies, selectedTaskId]);

  const { dependencySvgPathsByDepId, mapX, mapY, dependencyCanvasHeight, timelineRangeMs } = useRoadmapGanttDependencySvgPaths({
    filteredTasks,
    groups,
    projection: { defaultTimeStart: projection.defaultTimeStart, defaultTimeEnd: projection.defaultTimeEnd },
    visibleDependencies,
    freezeGeometry: isOverviewDragging,
  });

  const overviewTasks = filteredTasks.length > 0 ? filteredTasks : projection.tasks;
  const hasScrollableTimeline = scrollMetrics.max > 2 && scrollMetrics.clientWidth > 0;
  const overviewWindowWidth = hasScrollableTimeline
    ? Math.min((scrollMetrics.clientWidth / Math.max(scrollMetrics.max + scrollMetrics.clientWidth, 1)) * 100, 100)
    : 100;
  const overviewWindowLeft = hasScrollableTimeline
    ? Math.min((scrollMetrics.left / Math.max(scrollMetrics.max + scrollMetrics.clientWidth, 1)) * 100, 100)
    : 0;
  const sortedVisibleDependencies = useMemo(() => {
    const list = [...visibleDependencies];
    list.sort((a, b) => {
      const fromA = taskTitleById.get(a.from) ?? a.from;
      const fromB = taskTitleById.get(b.from) ?? b.from;
      const toA = taskTitleById.get(a.to) ?? a.to;
      const toB = taskTitleById.get(b.to) ?? b.to;
      const typeA = DEPENDENCY_KIND_LABEL[a.kind];
      const typeB = DEPENDENCY_KIND_LABEL[b.kind];

      const compareText = (x: string, y: string) => x.localeCompare(y, undefined, { sensitivity: 'base' });
      const compareId = a.id.localeCompare(b.id, undefined, { sensitivity: 'base' });
      const fromCmp = compareText(fromA, fromB);
      const toCmp = compareText(toA, toB);
      const typeCmp = compareText(typeA, typeB);

      let primary = 0;
      let secondary = 0;
      let tertiary = 0;
      if (dependencySort.key === 'from') {
        primary = fromCmp;
        secondary = toCmp;
        tertiary = typeCmp;
      }
      if (dependencySort.key === 'to') {
        primary = toCmp;
        secondary = fromCmp;
        tertiary = typeCmp;
      }
      if (dependencySort.key === 'type') {
        primary = typeCmp;
        secondary = fromCmp;
        tertiary = toCmp;
      }

      const ordered = primary || secondary || tertiary || compareId;
      return dependencySort.direction === 'asc' ? ordered : -ordered;
    });
    return list;
  }, [visibleDependencies, taskTitleById, dependencySort]);
  const hoveredDependency = useMemo(
    () => visibleDependencies.find((dep) => dep.id === hoveredDependencyId) ?? null,
    [visibleDependencies, hoveredDependencyId],
  );
  const highlightedTaskIds = useMemo(() => {
    if (!hoveredDependency) return new Set<string>();
    return new Set<string>([hoveredDependency.from, hoveredDependency.to]);
  }, [hoveredDependency]);

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

  useEffect(() => {
    if (filteredTasks.length === 0) {
      setFocusedTaskId(null);
      return;
    }
    if (focusedTaskId == null || !filteredTasks.some((task) => task.id === focusedTaskId)) {
      setFocusedTaskId(filteredTasks[0]!.id);
    }
  }, [filteredTasks, focusedTaskId]);

  useEffect(() => {
    if (selectedTaskId && !projection.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [projection.tasks, selectedTaskId]);

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
    setBaselineSnapshot(readRoadmapGanttBaseline(auditId));
  }, [auditId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_GANTT_STORAGE_SHOW_SLACK, showSlack ? '1' : '0');
  }, [showSlack]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_GANTT_STORAGE_SHOW_SCHEDULE_PROGRESS, showScheduleProgress ? '1' : '0');
  }, [showScheduleProgress]);

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

  const pickNearestTaskForTime = (targetTs: number) => {
    if (filteredTasks.length === 0) return null;
    const sorted = [...filteredTasks].sort((a, b) => {
      const aInside = a.start_time <= targetTs && targetTs <= a.end_time;
      const bInside = b.start_time <= targetTs && targetTs <= b.end_time;
      if (aInside && !bInside) return -1;
      if (!aInside && bInside) return 1;
      const aDistance = Math.min(Math.abs(a.start_time - targetTs), Math.abs(a.end_time - targetTs));
      const bDistance = Math.min(Math.abs(b.start_time - targetTs), Math.abs(b.end_time - targetTs));
      return aDistance - bDistance;
    });
    return sorted[0] ?? null;
  };

  const handleTimelineGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === '?') {
      event.preventDefault();
      setShowAdvancedControls(true);
      return;
    }
    if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      setActivePanel('timeline');
      return;
    }
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault();
      setActivePanel('dependencies');
      return;
    }
    if (event.key.toLowerCase() === 'g') {
      event.preventDefault();
      setDependenciesTab('graph');
      return;
    }
    if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      setDependenciesTab('table');
      return;
    }
    if (event.key.toLowerCase() === 'a') {
      event.preventDefault();
      setRoadmapToolbarMoreOpen(true);
      setShowAdvancedControls((prev) => !prev);
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      resetView();
      return;
    }
    if (event.key.toLowerCase() === 'm') {
      const t = focusedTask ?? filteredTasks[0] ?? null;
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
    const anchorTask = focusedTask ?? filteredTasks[0] ?? null;
    if (!anchorTask) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (anchorTask.kind === 'milestone') return;
      setSelectedTaskId(anchorTask.id);
      const laneLabel =
        projection.lanes.find((l) => l.id === anchorTask.group)?.title ?? String(anchorTask.group);
      setGridNavAnnouncement(
        ORCHESTRATION_UI_COPY.roadmapGanttKeyboardTaskOpenedAnnouncement.replace('{title}', anchorTask.title).replace('{lane}', laneLabel),
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
    const nextTask = pickNearestTaskForTime(anchorTime + delta);
    if (!nextTask || nextTask.id === anchorTask.id) {
      setGridNavAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttKeyboardNavigationBoundaryAnnouncement);
      return;
    }
    setFocusedTaskId(nextTask.id);
    focusTaskBarEl(nextTask.id);
  };

  const toggleDependencySort = (key: 'from' | 'to' | 'type') => {
    setDependencySort((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortArrow = (key: 'from' | 'to' | 'type') => {
    if (dependencySort.key !== key) return '';
    return dependencySort.direction === 'asc' ? ' ▲' : ' ▼';
  };

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
      ORCHESTRATION_UI_COPY.roadmapGanttKeyboardFocusAnnouncement.replace('{title}', task.title).replace('{lane}', laneLabel),
    );
  }, [focusedTaskId, focusedTaskLiveRegionSig, projection.lanes, projection.tasks]);

  useEffect(() => {
    if (!mainPanelTabAnnouncement) return;
    const t = window.setTimeout(() => setMainPanelTabAnnouncement(''), 2000);
    return () => window.clearTimeout(t);
  }, [mainPanelTabAnnouncement]);

  const handleMainPanelTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    const rawTarget = event.target as HTMLElement | null;
    const tabEl = rawTarget?.closest('[role="tab"]');
    if (!(tabEl instanceof HTMLElement) || !event.currentTarget.contains(tabEl)) {
      return;
    }
    event.preventDefault();
    const panels = ['timeline', 'dependencies'] as const;
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
  };

  const renderTimelineItem: NonNullable<ReactCalendarTimelineProps<GanttTaskItem>['itemRenderer']> = useCallback(
    ({ item, getItemProps }) => {
      const tooltipSource = taskByIdFull.get(String(item.id));
      const rawItemRootProps = getItemProps({
        className: [item.className, tooltipSource?.kind === 'milestone' ? 'roadmap-gantt-milestone-root' : '']
          .filter(Boolean)
          .join(' '),
      });
      const {
        key: timelineItemReactKey,
        ...itemRootAttrs
      } = rawItemRootProps as HTMLAttributes<HTMLDivElement> & { key?: Key };

      const blocksDirect =
        tooltipSource != null && tooltipSource.kind === 'task'
          ? projection.dependencies.filter((d) => d.from === tooltipSource.id).length
          : 0;
      const blockedByDirect =
        tooltipSource != null && tooltipSource.kind === 'task'
          ? projection.dependencies.filter((d) => d.to === tooltipSource.id).length
          : 0;

      const durationDays =
        tooltipSource != null ? Math.max(1, Math.ceil((tooltipSource.end_time - tooltipSource.start_time) / ROADMAP_GANTT_DAY_MS)) : 1;

      const nowMs = Date.now();
      let scheduleElapsedPct = 0;
      if (tooltipSource?.kind === 'task') {
        const span = Math.max(1, tooltipSource.end_time - tooltipSource.start_time);
        scheduleElapsedPct = Math.min(1, Math.max(0, (nowMs - tooltipSource.start_time) / span));
      }

      let baselineGhost: { leftPct: number; widthPct: number } | null = null;
      if (tooltipSource != null && baselineSnapshot) {
        const b = baselineSnapshot.tasks[tooltipSource.id];
        if (b) {
          const curS = tooltipSource.start_time;
          const curE = tooltipSource.end_time;
          const barDur = Math.max(1, curE - curS);
          const oS = Math.max(curS, b.startMs);
          const oE = Math.min(curE, b.endMs);
          if (oE > oS) {
            baselineGhost = { leftPct: ((oS - curS) / barDur) * 100, widthPct: ((oE - oS) / barDur) * 100 };
          }
        }
      }

      const barDurForSlack =
        tooltipSource != null && tooltipSource.kind === 'task'
          ? Math.max(1, tooltipSource.end_time - tooltipSource.start_time)
          : 1;
      const totalFloatMs =
        tooltipSource?.kind === 'task' && tooltipSource.totalFloatMs != null ? tooltipSource.totalFloatMs : 0;
      const slackFlexGrow =
        showSlack && tooltipSource?.kind === 'task' && totalFloatMs > 0 ? totalFloatMs / barDurForSlack : 0;

      let tooltipBody: ReactNode = null;
      if (tooltipSource?.kind === 'milestone') {
        const bRow = baselineSnapshot?.tasks[tooltipSource.id];
        tooltipBody = (
          <div className="space-y-1 text-left text-xs font-normal leading-relaxed text-foreground">
            <div className="font-medium">{tooltipSource.title}</div>
            <div>{dayjs(tooltipSource.start_time).format('YYYY-MM-DD')}</div>
            {bRow ? (
              <>
                <div className="ds-text-tertiary">
                  {`${ORCHESTRATION_UI_COPY.roadmapGanttBaselineDeltaStartLabel}: ${baselineDeltaDays(tooltipSource.start_time, bRow.startMs)}${ORCHESTRATION_UI_COPY.roadmapGanttDurationDaysSuffix}`}
                </div>
                {baselineSnapshot ? (
                  <div className="ds-text-tertiary">
                    {ORCHESTRATION_UI_COPY.roadmapGanttBaselineTooltipCapturedLine.replace(
                      '{datetime}',
                      dayjs(baselineSnapshot.takenAtMs).format('YYYY-MM-DD HH:mm'),
                    )}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        );
      } else if (tooltipSource) {
        const floatDays =
          tooltipSource.totalFloatMs != null ? Math.max(0, Math.round(tooltipSource.totalFloatMs / ROADMAP_GANTT_DAY_MS)) : null;
        const bRow = baselineSnapshot?.tasks[tooltipSource.id];
        tooltipBody = (
          <div className="space-y-1 text-left text-xs font-normal leading-relaxed text-foreground">
            <div className="font-medium">{tooltipSource.title}</div>
            <div>
              {dayjs(tooltipSource.start_time).format('YYYY-MM-DD')}
              {ORCHESTRATION_UI_COPY.roadmapGanttTooltipDateRangeSep}
              {dayjs(tooltipSource.end_time).format('YYYY-MM-DD')}
            </div>
            <div>{`${durationDays}${ORCHESTRATION_UI_COPY.roadmapGanttDurationDaysSuffix}`}</div>
            {showScheduleProgress ? (
              <>
                <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttScheduleElapsedTooltipPrefix}: ${Math.round(scheduleElapsedPct * 100)}%`}</div>
                <div className="ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttScheduleElapsedHint}</div>
              </>
            ) : null}
            {tooltipSource.owner ? <div>{tooltipSource.owner}</div> : null}
            {tooltipSource.impact ? <div>{tooltipSource.impact}</div> : null}
            {tooltipSource.onCriticalPath ? (
              <div>{ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathBadge}</div>
            ) : floatDays != null && floatDays > 0 ? (
              <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttSlackTooltipPrefix}: ${floatDays}${ORCHESTRATION_UI_COPY.roadmapGanttDurationDaysSuffix}`}</div>
            ) : null}
            {tooltipSource.topPriorityBucket === '7d' ? (
              <div>{ORCHESTRATION_UI_COPY.roadmapGanttTopPriority7dBadge}</div>
            ) : null}
            {tooltipSource.topPriorityBucket === '30d' ? (
              <div>{ORCHESTRATION_UI_COPY.roadmapGanttTopPriority30dBadge}</div>
            ) : null}
            {tooltipSource.confidence ? (
              <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttConfidenceTooltipPrefix}: ${tooltipSource.confidence}`}</div>
            ) : null}
            {bRow ? (
              <>
                <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttBaselineDeltaStartLabel}: ${baselineDeltaDays(tooltipSource.start_time, bRow.startMs)}${ORCHESTRATION_UI_COPY.roadmapGanttDurationDaysSuffix}`}</div>
                <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttBaselineDeltaEndLabel}: ${baselineDeltaDays(tooltipSource.end_time, bRow.endMs)}${ORCHESTRATION_UI_COPY.roadmapGanttDurationDaysSuffix}`}</div>
                {baselineSnapshot ? (
                  <div className="ds-text-tertiary">
                    {ORCHESTRATION_UI_COPY.roadmapGanttBaselineTooltipCapturedLine.replace(
                      '{datetime}',
                      dayjs(baselineSnapshot.takenAtMs).format('YYYY-MM-DD HH:mm'),
                    )}
                  </div>
                ) : null}
              </>
            ) : null}
            <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttBlocksLabel}: ${blocksDirect}`}</div>
            <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttBlockedByLabel}: ${blockedByDirect}`}</div>
          </div>
        );
      }

      const isKeyboardFocus = focusedTaskId === String(item.id);

      const taskBar = (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              key={timelineItemReactKey}
              {...itemRootAttrs}
              data-roadmap-task-id={String(item.id)}
              tabIndex={isKeyboardFocus ? 0 : -1}
            >
              <div className="roadmap-gantt-item-visual-stack">
                {baselineGhost ? (
                  <div
                    className="roadmap-gantt-baseline-ghost-track"
                    aria-label={ORCHESTRATION_UI_COPY.roadmapGanttBaselineGhostBarAria}
                  >
                    <span
                      className="roadmap-gantt-baseline-ghost"
                      style={{ left: `${baselineGhost.leftPct}%`, width: `${baselineGhost.widthPct}%` }}
                      aria-hidden
                    />
                  </div>
                ) : null}
                {tooltipSource?.kind === 'milestone' ? (
                  <div className="rct-item-content roadmap-gantt-rct-item-content roadmap-gantt-milestone-inner">
                    <span className="roadmap-gantt-milestone-icon-wrap" aria-hidden>
                      <Diamond size={14} weight="fill" className="roadmap-gantt-milestone-icon" />
                    </span>
                  </div>
                ) : (
                  <div className="roadmap-gantt-task-bar-row rct-item-content roadmap-gantt-rct-item-content">
                    <div
                      className="roadmap-gantt-task-bar-main"
                      style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }}
                    >
                      {showScheduleProgress ? (
                        <div
                          className={[
                            'roadmap-gantt-schedule-elapsed',
                            tooltipSource?.isOverdue ? 'roadmap-gantt-schedule-elapsed--overdue' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{ width: `${tooltipSource?.kind === 'task' ? scheduleElapsedPct * 100 : 0}%` }}
                          aria-hidden
                        />
                      ) : null}
                      <div className="roadmap-gantt-task-bar-label">
                        {tooltipSource?.kind === 'task' && tooltipSource.confidence ? (
                          <span className="roadmap-gantt-confidence-dot" data-level={tooltipSource.confidence} aria-hidden />
                        ) : null}
                        <span className="roadmap-gantt-task-title-text">{item.title}</span>
                      </div>
                    </div>
                    {slackFlexGrow > 0 ? (
                      <div
                        className="roadmap-gantt-slack-tail"
                        style={{ flexGrow: slackFlexGrow, flexShrink: 0, flexBasis: 0, minWidth: 2 }}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={6}
            className="border border-border bg-popover px-3 py-2 text-foreground shadow-lg [&>svg]:hidden"
          >
            {tooltipBody}
          </TooltipContent>
        </Tooltip>
      );

      if (
        tooltipSource?.kind === 'task' &&
        tooltipSource.group !== ROADMAP_GANTT_MILESTONE_LANE_ID &&
        selectableLanesForJump.length > 0
      ) {
        return (
          <ContextMenu>
            <ContextMenuTrigger asChild>{taskBar}</ContextMenuTrigger>
            <ContextMenuContent className="max-h-72 min-w-[12rem] overflow-y-auto">
              <ContextMenuLabel className="text-xs font-normal text-muted-foreground">
                {ORCHESTRATION_UI_COPY.roadmapGanttLaneMoveMenuLabel}
              </ContextMenuLabel>
              {selectableLanesForJump.map((lane) => (
                <ContextMenuItem
                  key={lane.id}
                  className="text-xs"
                  onSelect={() => {
                    applyLaneFocusFilter(lane);
                  }}
                >
                  {lane.title}
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>
        );
      }

      return taskBar;
    },
    [
      applyLaneFocusFilter,
      baselineSnapshot,
      focusedTaskId,
      projection.dependencies,
      selectableLanesForJump,
      showScheduleProgress,
      showSlack,
      taskByIdFull,
    ],
  );

  const scrollTimelineByDirection = (direction: 'left' | 'right') => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const amount = roadmapGanttToolbarScrollDeltaPx(scrollNode.clientWidth);
    const delta = direction === 'left' ? -amount : amount;
    scrollNode.scrollBy({ left: delta, behavior: 'smooth' });
  };
  const jumpTimelineRangeByDirection = (direction: 'previous' | 'next') => {
    scrollTimelineByDirection(direction === 'previous' ? 'left' : 'right');
  };

  const jumpTimelineToToday = () => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const now = Date.now();
    const ratio = (now - projection.defaultTimeStart) / timelineRangeMs;
    const clampedRatio = Math.min(Math.max(ratio, 0), 1);
    const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
    const target = Math.floor(maxScroll * clampedRatio - scrollNode.clientWidth / 2);
    scrollNode.scrollTo({ left: Math.min(Math.max(target, 0), maxScroll), behavior: 'smooth' });
  };
  const scrollTimelineToRatio = (ratio: number) => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
    scrollNode.scrollTo({ left: maxScroll * clamped, behavior: isOverviewDragging ? 'auto' : 'smooth' });
  };

  const handleOverviewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (filteredTasks.length === 0) return;
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
  };

  const handleOverviewPointer = (clientX: number) => {
    const track = overviewTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    scrollTimelineToRatio(ratio);
  };

  const ownerOptions = useMemo(() => {
    return Array.from(
      new Set(projection.tasks.filter((task) => task.kind === 'task').map((task) => task.owner).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [projection.tasks]);

  const hasActiveFilters =
    dependencyTypeFilter !== 'all' ||
    ownerFilter !== 'all' ||
    statusFilter !== 'all' ||
    laneFilter !== 'all' ||
    blockedOnly ||
    dependencyView !== 'all' ||
    criticalPathOnly ||
    titleQuery.trim().length > 0;
  const advancedFiltersCount = [
    ownerFilter !== 'all',
    statusFilter !== 'all',
    laneFilter !== 'all',
    dependencyView !== 'all',
    criticalPathOnly,
    titleQuery.trim().length > 0,
  ].filter(Boolean).length;
  const activeFilterTags = useMemo(() => {
    const tags: Array<{ id: string; label: string; clear: () => void }> = [];
    if (dependencyTypeFilter !== 'all') {
      tags.push({
        id: 'depType',
        label: `Dependency: ${DEPENDENCY_KIND_LABEL[dependencyTypeFilter]}`,
        clear: () => setDependencyTypeFilter('all'),
      });
    }
    if (blockedOnly) tags.push({ id: 'blocked', label: 'Blocked only', clear: () => setBlockedOnly(false) });
    if (ownerFilter !== 'all') tags.push({ id: 'owner', label: `Owner: ${ownerFilter}`, clear: () => setOwnerFilter('all') });
    if (statusFilter !== 'all') tags.push({ id: 'status', label: `Status: ${statusFilter}`, clear: () => setStatusFilter('all') });
    if (laneFilter !== 'all') {
      const laneTitle = projection.lanes.find((lane) => lane.id === laneFilter)?.title ?? laneFilter;
      tags.push({ id: 'lane', label: `Lane: ${laneTitle}`, clear: () => setLaneFilter('all') });
    }
    if (dependencyView !== 'all') {
      const depViewLabel = dependencyView === 'selected' ? 'selected task' : 'hide weak';
      tags.push({ id: 'depView', label: `Dependency view: ${depViewLabel}`, clear: () => setDependencyView('all') });
    }
    if (criticalPathOnly) {
      tags.push({
        id: 'cpOnly',
        label: ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathFilterLabel,
        clear: () => setCriticalPathOnly(false),
      });
    }
    if (titleQuery.trim().length > 0) {
      tags.push({
        id: 'title',
        label: `${ORCHESTRATION_UI_COPY.roadmapGanttSearchAriaLabel}: ${titleQuery.trim()}`,
        clear: () => setTitleQuery(''),
      });
    }
    return tags;
  }, [blockedOnly, criticalPathOnly, dependencyTypeFilter, dependencyView, laneFilter, ownerFilter, projection.lanes, statusFilter, titleQuery]);
  const activeFilterReason = activeFilterTags.map((tag) => tag.label).join(' + ');

  const resetView = () => {
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
    setFocusedTaskId(filteredTasks[0]?.id ?? null);
    setActivePanel('timeline');
    setDependenciesTab('graph');
    setShowAdvancedControls(false);
    setShowRestoredViewNotice(false);
  };
  const applyPresetBlocked = () => {
    setTimeScale('day');
    setDayRangeDays(30);
    setDependencyTypeFilter('all');
    setBlockedOnly(true);
    setDependencyView('hide-weak');
    setStatusFilter('all');
    setShowAdvancedControls(true);
  };
  const applyPresetExecution = () => {
    setTimeScale('day');
    setDayRangeDays(60);
    setDependencyTypeFilter('FS');
    setBlockedOnly(false);
    setDependencyView('all');
    setStatusFilter('in-progress');
    setShowAdvancedControls(true);
  };
  const applyPresetCriticalPath = () => {
    setTimeScale('month');
    setCriticalPathOnly(true);
    setBlockedOnly(false);
    setDependencyView('all');
    setDependencyTypeFilter('all');
    setStatusFilter('all');
    setShowAdvancedControls(true);
  };

  const isMonthScale = timeScale === 'month';
  const defaultViewportStart = projection.defaultTimeStart;
  const defaultViewportEnd = useMemo(() => {
    if (isMonthScale) return projection.defaultTimeEnd;
    const dayViewEnd = dayjs(projection.defaultTimeStart).add(dayRangeDays, 'day').endOf('day').valueOf();
    return Math.min(dayViewEnd, projection.defaultTimeEnd);
  }, [dayRangeDays, isMonthScale, projection.defaultTimeEnd, projection.defaultTimeStart]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-orientation="horizontal"
          aria-label={ORCHESTRATION_UI_COPY.roadmapGanttMainPanelsTablistAriaLabel}
          onKeyDown={handleMainPanelTablistKeyDown}
        >
          <button
            type="button"
            role="tab"
            id={mainTabTimelineId}
            aria-selected={activePanel === 'timeline'}
            aria-controls={mainPanelTimelineId}
            tabIndex={activePanel === 'timeline' ? 0 : -1}
            onClick={() => {
              setActivePanel('timeline');
              setMainPanelTabAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementTimeline);
            }}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activePanel === 'timeline'
                ? 'bg-muted ds-text-primary'
                : 'ds-text-secondary hover:bg-muted',
            ].join(' ')}
          >
            {ORCHESTRATION_UI_COPY.roadmapGanttMainTabTimelineLabel}
          </button>
          <button
            type="button"
            role="tab"
            id={mainTabDependenciesId}
            aria-selected={activePanel === 'dependencies'}
            aria-controls={mainPanelDependenciesId}
            tabIndex={activePanel === 'dependencies' ? 0 : -1}
            onClick={() => {
              setActivePanel('dependencies');
              setMainPanelTabAnnouncement(ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementDependencies);
            }}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activePanel === 'dependencies'
                ? 'bg-muted ds-text-primary'
                : 'ds-text-secondary hover:bg-muted',
            ].join(' ')}
          >
            {ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel}
          </button>
        </div>
      </div>
      {activePanel === 'timeline' ? (
        <div
          id={mainPanelTimelineId}
          role="tabpanel"
          aria-labelledby={mainTabTimelineId}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.roadmapGanttTimelinePanelTitle}</h3>
            <p className="mt-1 text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttTimelinePanelHint}</p>
            {baselineSnapshot == null ? (
              <p className="mt-2 max-w-prose text-[length:var(--text-2xs)] ds-text-secondary">
                {ORCHESTRATION_UI_COPY.roadmapGanttBaselinePanelOnboarding}
              </p>
            ) : (
              <p className="mt-2 max-w-prose text-[length:var(--text-2xs)] ds-text-secondary">
                {ORCHESTRATION_UI_COPY.roadmapGanttBaselineStripeLegendCaption}
              </p>
            )}
          </div>
          <div className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium ds-text-secondary">
            {ORCHESTRATION_UI_COPY.roadmapGanttTimelineHeaderCountsTemplate
              .replace('{lanes}', String(groups.length))
              .replace('{tasks}', String(filteredTasks.length))}
          </div>
        </div>
        {isHeavyTaskLoad ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs ds-text-secondary"
          >
            {ORCHESTRATION_UI_COPY.roadmapGanttHeavyTaskLoadTimelineNotice.replace('{count}', String(filteredTasks.length)).replace(
              '{threshold}',
              String(ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD),
            )}
          </div>
        ) : null}
        <RoadmapGanttToolbar
          projection={projection}
          groups={groups}
          filteredTasksCount={filteredTasks.length}
          visibleDependenciesCount={visibleDependencies.length}
          showRestoredViewNotice={showRestoredViewNotice}
          onDismissRestoredDefaults={() => {
            setTimeScale('day');
            setDayRangeDays(60);
            setDensityMode('comfortable');
            setShowRestoredViewNotice(false);
          }}
          onDismissRestoredNotice={() => setShowRestoredViewNotice(false)}
          densityMode={densityMode}
          onDensityChange={setDensityMode}
          isMonthScale={isMonthScale}
          onTimeScaleDay={() => setTimeScale('day')}
          onTimeScaleMonth={() => setTimeScale('month')}
          dayRangeDays={dayRangeDays}
          onDayRangeChange={setDayRangeDays}
          onJumpToToday={jumpTimelineToToday}
          baselineSnapshot={baselineSnapshot}
          titleQuery={titleQuery}
          onTitleQueryChange={setTitleQuery}
          roadmapToolbarMoreOpen={roadmapToolbarMoreOpen}
          onRoadmapToolbarMoreOpenChange={setRoadmapToolbarMoreOpen}
          onJumpRangePrevious={() => jumpTimelineRangeByDirection('previous')}
          onJumpRangeNext={() => jumpTimelineRangeByDirection('next')}
          criticalPathOnly={criticalPathOnly}
          onCriticalPathOnlyChange={setCriticalPathOnly}
          highlightDependencyChain={highlightDependencyChain}
          onHighlightDependencyChainChange={setHighlightDependencyChain}
          showSlack={showSlack}
          onShowSlackChange={setShowSlack}
          showScheduleProgress={showScheduleProgress}
          onShowScheduleProgressChange={setShowScheduleProgress}
          dependencyTypeFilter={dependencyTypeFilter}
          onDependencyTypeFilterChange={setDependencyTypeFilter}
          blockedOnly={blockedOnly}
          onBlockedOnlyChange={setBlockedOnly}
          onPresetBlocked={applyPresetBlocked}
          onPresetExecution={applyPresetExecution}
          onPresetCriticalPath={applyPresetCriticalPath}
          showAdvancedControls={showAdvancedControls}
          onToggleAdvancedControls={() => setShowAdvancedControls((prev) => !prev)}
          advancedFiltersCount={advancedFiltersCount}
          onResetView={resetView}
          sprintExportBusy={sprintExportBusy}
          onDownloadSprintCsv={() => void downloadSprintPlanCsv()}
          onCaptureBaseline={() => {
            writeRoadmapGanttBaseline(auditId, projection);
            setBaselineSnapshot(readRoadmapGanttBaseline(auditId));
          }}
          onClearBaseline={() => {
            clearRoadmapGanttBaseline(auditId);
            setBaselineSnapshot(null);
          }}
          baselineClearDisabled={baselineSnapshot == null}
          icalExportBusy={icalExportBusy}
          onDownloadIcal={() => downloadIcal()}
          ownerFilter={ownerFilter}
          ownerOptions={ownerOptions}
          statusFilter={statusFilter}
          laneFilter={laneFilter}
          dependencyView={dependencyView}
          onOwnerFilterChange={setOwnerFilter}
          onStatusFilterChange={setStatusFilter}
          onLaneFilterChange={setLaneFilter}
          onDependencyViewChange={setDependencyView}
          hasActiveFilters={hasActiveFilters}
          activeFilterTags={activeFilterTags}
          activeFilterReason={activeFilterReason}
          toolbarLeadingSlot={toolbarLeadingSlot}
        />
{filteredTasks.length > 0 ? (
        <div className="roadmap-grid-area">
          <div
            className="roadmap-grid-scroll-controls"
            aria-label="Timeline horizontal controls"
            data-empty={filteredTasks.length === 0 ? 'true' : 'false'}
          >
            <button
              type="button"
              className="roadmap-scroll-button"
              onClick={() => scrollTimelineByDirection('left')}
              aria-label="Scroll timeline left"
              disabled={filteredTasks.length === 0 || !canScrollLeft}
            >
              ←
            </button>
            <button
              type="button"
              className="roadmap-scroll-button"
              onClick={() => scrollTimelineByDirection('right')}
              aria-label="Scroll timeline right"
              disabled={filteredTasks.length === 0 || !canScrollRight}
            >
              →
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="roadmap-grid-hint m-0">{ORCHESTRATION_UI_COPY.roadmapGanttTimelineKeyboardShortcutsHint}</p>
            {laneMoveMenuEligible ? (
              <DropdownMenu open={laneMoveMenuOpen} onOpenChange={setLaneMoveMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {ORCHESTRATION_UI_COPY.roadmapGanttLaneMoveMenuTrigger}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[12rem]">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {ORCHESTRATION_UI_COPY.roadmapGanttLaneMoveMenuLabel}
                  </DropdownMenuLabel>
                  {selectableLanesForJump.map((lane) => (
                    <DropdownMenuItem
                      key={lane.id}
                      className="text-xs"
                      onSelect={() => {
                        applyLaneFocusFilter(lane);
                      }}
                    >
                      {lane.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {gridNavAnnouncement}
          </span>
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {mainPanelTabAnnouncement}
          </span>
          <p id={roadmapOverviewMapDescriptionId} className="sr-only">
            {ORCHESTRATION_UI_COPY.roadmapGanttOverviewMapLongDescription}
          </p>
          <p className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttOverviewKeyboardHint}</p>
          <p className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttOverviewPointerHint}</p>
          <RoadmapGanttOverviewStrip
            filteredTasksLength={filteredTasks.length}
            emptyFilteredLabel={ORCHESTRATION_UI_COPY.roadmapGanttOverviewEmptyFilteredLabel}
            overviewTasks={overviewTasks}
            mapX={mapX}
            isOverviewDragging={isOverviewDragging}
            onOverviewDraggingChange={setIsOverviewDragging}
            onOverviewPointer={handleOverviewPointer}
            onOverviewKeyDown={handleOverviewKeyDown}
            overviewWindowWidthPct={overviewWindowWidth}
            overviewWindowLeftPct={overviewWindowLeft}
            trackRef={overviewTrackRef}
            descriptionId={roadmapOverviewMapDescriptionId}
            ariaLabel={ORCHESTRATION_UI_COPY.roadmapGanttOverviewMapAriaLabel}
          />
          <div
            ref={timelineShellRef}
            className={[
              'roadmap-gantt-shell',
              densityMode === 'compact' ? 'roadmap-gantt-shell-compact' : 'roadmap-gantt-shell-comfortable',
              canScrollLeft ? 'roadmap-gantt-shell-can-scroll-left' : '',
              canScrollRight ? 'roadmap-gantt-shell-can-scroll-right' : '',
            ].join(' ')}
            tabIndex={0}
            role="grid"
            aria-label={ORCHESTRATION_UI_COPY.roadmapGanttTimelineGridAriaLabel}
            data-testid="roadmap-timeline-grid"
            onKeyDown={handleTimelineGridKeyDown}
          >
            <TooltipProvider delayDuration={180}>
            <Timeline<GanttTaskItem, TimelineGroupBase>
            key={`roadmap-timeline-${timeScale}-${dayRangeDays}`}
            groups={groups}
            items={items.map((item) => ({
              ...item,
              className: [
                item.className,
                highlightedTaskIds.has(item.id) ? 'roadmap-gantt-item-highlighted' : '',
                focusedTaskId === item.id ? 'roadmap-gantt-item-focused' : '',
              ]
                .filter(Boolean)
                .join(' '),
            }))}
            defaultTimeStart={defaultViewportStart}
            defaultTimeEnd={defaultViewportEnd}
            lineHeight={ROADMAP_GANTT_TIMELINE_LINE_HEIGHT_PX}
            itemHeightRatio={0.72}
            sidebarWidth={220}
            rightSidebarWidth={0}
            canMove={false}
            canResize={false}
            stackItems
            itemRenderer={renderTimelineItem}
            minZoom={ROADMAP_GANTT_TIMELINE_MIN_ZOOM_MS}
            maxZoom={isMonthScale ? ROADMAP_GANTT_TIMELINE_MAX_ZOOM_MONTH_MS : ROADMAP_GANTT_TIMELINE_MAX_ZOOM_DAY_MS}
            verticalLineClassNamesForTime={(start) => {
              const date = dayjs(start);
              const classes = ['roadmap-day-divider'];
              if (!isMonthScale && (date.day() === 0 || date.day() === 6)) {
                classes.push('roadmap-weekend-shade');
              }
              if (date.day() === 1) classes.push('roadmap-week-divider');
              if (date.date() === 1) classes.push('roadmap-month-divider');
              if (date.isSame(dayjs(), 'day')) classes.push('roadmap-today-divider');
              return classes;
            }}
            onItemSelect={(itemId) => {
              const id = String(itemId);
              setSelectedTaskId(id);
              setFocusedTaskId(id);
            }}
            onItemClick={(itemId) => {
              const id = String(itemId);
              setSelectedTaskId(id);
              setFocusedTaskId(id);
            }}
            keys={{
              groupIdKey: 'id',
              groupTitleKey: 'title',
              groupRightTitleKey: 'rightTitle',
              groupLabelKey: 'title',
              itemIdKey: 'id',
              itemTitleKey: 'title',
              itemDivTitleKey: 'title',
              itemGroupKey: 'group',
              itemTimeStartKey: 'start_time',
              itemTimeEndKey: 'end_time',
            }}
          >
            <TimelineHeaders className="roadmap-time-headers">
              <SidebarHeader>
                {({ getRootProps }) => (
                  <div {...getRootProps()} className="roadmap-sidebar-header">
                    Workstream
                  </div>
                )}
              </SidebarHeader>
              <DateHeader
                className="roadmap-month-header"
                unit={isMonthScale ? 'year' : 'month'}
                labelFormat={(timeRange) => timeRange[0].format(isMonthScale ? 'YYYY' : 'MMMM YYYY')}
              />
              <DateHeader
                className="roadmap-day-header"
                unit={isMonthScale ? 'month' : 'day'}
                labelFormat={(timeRange) => timeRange[0].format(isMonthScale ? 'MMM' : 'D')}
              />
            </TimelineHeaders>
            <TimelineMarkers>
              <TodayMarker>
                {({ styles }) => (
                  <div style={styles} className="roadmap-today-marker-line" aria-hidden>
                    <span className="roadmap-today-marker-nub" />
                  </div>
                )}
              </TodayMarker>
            </TimelineMarkers>
            </Timeline>
            </TooltipProvider>
          </div>
        </div>
        ) : null}
        {filteredTasks.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-muted p-4 text-sm ds-text-secondary">
            {hasActiveFilters ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 max-w-prose">
                  {ORCHESTRATION_UI_COPY.roadmapEmptyFilteredBodyPrefix}{' '}
                  {ORCHESTRATION_UI_COPY.roadmapGanttEmptyFilteredActiveReasonPrefix}{' '}
                  {activeFilterReason || ORCHESTRATION_UI_COPY.roadmapGanttFilterLogicFallback}.{' '}
                  {ORCHESTRATION_UI_COPY.roadmapEmptyFilteredBodySuffix}
                </p>
                <button
                  type="button"
                  onClick={resetView}
                  className="shrink-0 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium ds-text-primary hover:bg-muted"
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttClearAllFilters}
                </button>
              </div>
            ) : (
              ORCHESTRATION_UI_COPY.roadmapEmptyNoTasksBody
            )}
          </div>
        ) : null}
      </div>
      ) : null}
      {activePanel === 'dependencies' ? (
        <div
          id={mainPanelDependenciesId}
          role="tabpanel"
          aria-labelledby={mainTabDependenciesId}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.roadmapGanttDependenciesPanelTitle}</h3>
              <p className="mt-1 text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapDepsPanelIntro}</p>
            </div>
            <button
              type="button"
              onClick={resetView}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
            >
              {ORCHESTRATION_UI_COPY.roadmapGanttResetViewCta}
            </button>
          </div>
          <div
            className="mb-3 flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label={ORCHESTRATION_UI_COPY.roadmapGanttDepsViewTablistAriaLabel}
          >
            <button
              type="button"
              role="tab"
              id={depsTabGraphId}
              aria-selected={dependenciesTab === 'graph'}
              aria-controls={depsPanelGraphId}
              tabIndex={dependenciesTab === 'graph' ? 0 : -1}
              onClick={() => setDependenciesTab('graph')}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                dependenciesTab === 'graph'
                  ? 'bg-muted ds-text-primary'
                  : 'ds-text-secondary hover:bg-muted',
              ].join(' ')}
            >
              {ORCHESTRATION_UI_COPY.roadmapGanttDepsGraphTabLabel}
            </button>
            <button
              type="button"
              role="tab"
              id={depsTabTableId}
              aria-selected={dependenciesTab === 'table'}
              aria-controls={depsPanelTableId}
              tabIndex={dependenciesTab === 'table' ? 0 : -1}
              onClick={() => setDependenciesTab('table')}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                dependenciesTab === 'table'
                  ? 'bg-muted ds-text-primary'
                  : 'ds-text-secondary hover:bg-muted',
              ].join(' ')}
            >
              {ORCHESTRATION_UI_COPY.roadmapGanttDepsTableTabLabel}
            </button>
            <span className="ml-auto rounded-full border border-border bg-muted px-2 py-1 text-xs ds-text-secondary">
              {`Dependencies ${visibleDependencies.length}`}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs ds-text-secondary">
            <span className="rounded-full border border-border bg-card px-2 py-1">
              {dependenciesTab === 'graph'
                ? ORCHESTRATION_UI_COPY.roadmapGanttDepsModeGraphHint
                : ORCHESTRATION_UI_COPY.roadmapGanttDepsModeTableHint}
            </span>
            {dependenciesTab === 'table' ? (
              <span className="rounded-full border border-border bg-card px-2 py-1">
                {`Sorted by ${dependencySort.key} (${dependencySort.direction})`}
              </span>
            ) : null}
          </div>
          <div className="mb-3 rounded-lg border border-border bg-muted p-3">
            <p className="text-xs ds-text-secondary">{ORCHESTRATION_UI_COPY.roadmapGanttDepsMissingLinksHint}</p>
            <Link
              to={strategyHref}
              className="roadmap-deps-cta mt-1 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1"
            >
              <span aria-hidden>+</span>
              {ORCHESTRATION_UI_COPY.roadmapGanttDepsBuildStrategyLinkCta}
            </Link>
          </div>
          <div
            id={depsPanelGraphId}
            role="tabpanel"
            aria-labelledby={depsTabGraphId}
            hidden={dependenciesTab !== 'graph'}
          >
            {dependenciesTab === 'graph' ? (
              <div>
              <h4 className="text-sm font-semibold ds-text-primary">Dependency graph</h4>
              <p className="mt-1 text-xs ds-text-tertiary">
                FS means the target task starts after the source task finishes. Other types follow the same initial letters.
              </p>
              <div className="mt-2 rounded-md border border-border bg-card p-2">
                <div className="roadmap-dependency-legend">
                  <span className="roadmap-legend-item">
                    <span className="roadmap-legend-line roadmap-legend-line-fs" />
                    FS (Finish -&gt; Start)
                  </span>
                  <span className="roadmap-legend-item">
                    <span className="roadmap-legend-line roadmap-legend-line-ss" />
                    SS (Start -&gt; Start)
                  </span>
                  <span className="roadmap-legend-item">
                    <span className="roadmap-legend-line roadmap-legend-line-ff" />
                    FF (Finish -&gt; Finish)
                  </span>
                  <span className="roadmap-legend-item">
                    <span className="roadmap-legend-line roadmap-legend-line-sf" />
                    SF (Start -&gt; Finish)
                  </span>
                  <span className="roadmap-legend-item">
                    <span className="roadmap-legend-line roadmap-legend-line-weak" />
                    Weak relation (dashed)
                  </span>
                  <span className="roadmap-legend-item">
                    <span className="roadmap-legend-line roadmap-legend-line-cross-lane" />
                    {ORCHESTRATION_UI_COPY.roadmapGanttCrossLaneLabel}
                  </span>
                </div>
              </div>
              <RoadmapGanttDependencyGraphSvg
                groups={groups}
                projectionLanes={projection.lanes}
                visibleDependencies={visibleDependencies}
                dependencySvgPathsByDepId={dependencySvgPathsByDepId}
                dependencyCanvasHeight={dependencyCanvasHeight}
                mapY={mapY}
                isHeavyTaskLoad={isHeavyTaskLoad}
                filteredTasksCount={filteredTasks.length}
                heavyTaskThreshold={ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD}
                taskTitleById={taskTitleById}
                hoveredDependencyId={hoveredDependencyId}
                onHoveredDependencyChange={setHoveredDependencyId}
                onSelectTask={(taskId) => {
                  setSelectedTaskId(taskId);
                  setFocusedTaskId(taskId);
                }}
                strokeForDependencySeg={strokeForDependencySeg}
                dependencyChainShouldDim={dependencyChainShouldDim}
              />
              {hoveredDependency ? (
                <p className="mt-2 text-xs ds-text-secondary">
                  {`${taskTitleById.get(hoveredDependency.from) ?? hoveredDependency.from} -> ${
                    taskTitleById.get(hoveredDependency.to) ?? hoveredDependency.to
                  } · ${DEPENDENCY_KIND_LABEL[hoveredDependency.kind]} · ${hoveredDependency.strength}`}
                </p>
              ) : null}
            </div>
          ) : null}
          </div>
          <div
            id={depsPanelTableId}
            role="tabpanel"
            aria-labelledby={depsTabTableId}
            hidden={dependenciesTab !== 'table'}
          >
          {dependenciesTab === 'table' ? (
            <RoadmapGanttDependencyTable
              sortedDeps={sortedVisibleDependencies}
              dependencySortKey={dependencySort.key}
              dependencySortDirection={dependencySort.direction}
              onToggleDependencySort={toggleDependencySort}
              sortArrow={sortArrow}
              taskTitleById={taskTitleById}
              hoveredDependencyId={hoveredDependencyId}
              onHoveredDependencyChange={setHoveredDependencyId}
              hasActiveFilters={hasActiveFilters}
              onResetView={resetView}
            />
          ) : null}
          </div>
        </div>
      ) : null}
      <TaskDetailsDrawer
        auditId={auditId}
        open={drawerTask != null}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
        task={drawerTask}
        dependencies={projection.dependencies}
        taskTitleById={taskTitleById}
        downstreamTaskCount={downstreamTaskCount}
        deliveryBoardHref={deliveryBoardHref}
        planBoardMove={taskPlanBoardMove}
        consultantBoardPlanHref={consultantBoardPlanHref}
        onFilterToLane={(laneId) => {
          setLaneFilter(String(laneId));
          setRoadmapToolbarMoreOpen(true);
          setActivePanel('timeline');
        }}
      />
    </section>
  );
}
