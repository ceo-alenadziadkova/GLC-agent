import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { buildGanttTimelineGroups } from '../components/roadmap-gantt/lib/build-timeline-groups';
import { buildGanttTimelineItems } from '../components/roadmap-gantt/lib/build-timeline-items';
import type { GanttTaskItem } from '../components/roadmap-gantt/lib/timeline-item-types';
import type {
  RoadmapGanttPlanBoardHydration,
} from '../components/roadmap-gantt/types';
import type { TaskDetailsPlanBoardMove } from '../components/roadmap-gantt/TaskDetailsDrawer';
import type { PlanBoardCardDto } from '../data/api/audits-orchestration';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import {
  buildBoardRowByPackNodeId,
  computeTimelineBoardEditEnabled,
  computeTimelineEditableTaskIds,
} from '../lib/roadmap-gantt-board-edit-gating';
import { computeConsultantBoardPlanHref } from '../lib/roadmap-gantt-consultant-plan-href';
import { buildDependencyChainShouldDim } from '../lib/roadmap-gantt-dependency-chain-dim';
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
  ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD,
} from '../config/roadmap-gantt-view-preferences';
import { resolveTaskFocusFromUrl } from '../lib/roadmap-gantt-focus-resolve';
import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttDependency,
  type RoadmapGanttProjection,
  type RoadmapGanttTask,
} from '../lib/roadmap-gantt-mapper';
import {
  computeTaskPlanBoardMove,
} from '../lib/roadmap-gantt-task-plan-board-move';
import {
  applyTimelineTaskOverride,
  mergeTimelineTaskOverrides,
  revertTimelineTaskOverride,
  type RoadmapGanttTimelineTaskOverrides,
} from '../lib/roadmap-gantt-timeline-overrides';
import {
  clearRoadmapGanttBaseline,
  purgeInvalidRoadmapGanttBaselineIfNeeded,
  readRoadmapGanttBaseline,
  writeRoadmapGanttBaseline,
  type RoadmapGanttBaselineSnapshot,
} from '../lib/roadmap-gantt-baseline-storage';
import { useRoadmapGanttDependencySvgPaths } from './useRoadmapGanttDependencySvgPaths';
import { useRoadmapGanttFilteredTasks } from './useRoadmapGanttFilteredTasks';
import { usePlanFocusPackNodeId } from './usePlanFocusKey';

type StatusFilter = 'all' | 'planned' | 'in-progress' | 'done';

export type UseRoadmapGanttDataArgs = {
  auditId: string;
  projection: RoadmapGanttProjection;
  planBoardHydration: RoadmapGanttPlanBoardHydration;
  isClient: boolean;
  getDeliveryBoardHrefForPackNode?: (packGraphNodeId: string) => string | null | undefined;
  orchestrationPack?: GlcOrchestrationPackView | null;
  pathname: string;
  search: string;
  /** `?task=<id>` parsed from current URL, used by focus reconciliation. */
  urlTaskParam: string;
  filters: {
    titleQuery: string;
    criticalPathOnly: boolean;
    ownerFilter: string;
    statusFilter: StatusFilter;
    laneFilter: string;
    blockedOnly: boolean;
    dependencyTypeFilter: RoadmapGanttDependencyTypeFilter;
    dependencyView: RoadmapGanttDependencyView;
    dependencySort: RoadmapGanttDependencySort;
    highlightDependencyChain: boolean;
  };
  selection: {
    selectedTaskId: string | null;
    focusedTaskId: string | null;
    hoveredDependencyId: string | null;
    setSelectedTaskId: Dispatch<SetStateAction<string | null>>;
    setFocusedTaskId: Dispatch<SetStateAction<string | null>>;
  };
  /** Freeze SVG path geometry while the user scrubs the overview strip to avoid rebuild churn. */
  isOverviewDragging: boolean;
};

export type RoadmapGanttActiveFilterTagsRaw = ReturnType<typeof buildActiveFilterTags>;

export type UseRoadmapGanttDataResult = {
  filteredTasks: RoadmapGanttTask[];
  filteredTaskIds: ReadonlySet<string>;
  timelineTasks: RoadmapGanttTask[];
  timelineTaskOverrides: RoadmapGanttTimelineTaskOverrides;
  setTimelineTaskOverrides: Dispatch<SetStateAction<RoadmapGanttTimelineTaskOverrides>>;
  groups: TimelineGroupBase[];
  items: GanttTaskItem[];
  chainTaskIds: ReadonlySet<string> | null;
  taskTitleById: Map<string, string>;
  taskByIdFull: Map<string, RoadmapGanttTask>;
  visibleDependencies: RoadmapGanttDependency[];
  sortedVisibleDependencies: RoadmapGanttDependency[];
  hoveredDependency: RoadmapGanttDependency | null;
  highlightedTaskIds: ReadonlySet<string>;
  dependencyChainShouldDim: (dep: RoadmapGanttDependency) => boolean;
  boardRowByPackNodeId: ReadonlyMap<string, PlanBoardCardDto>;
  timelineBoardEditEnabled: boolean;
  timelineEditableTaskIds: ReadonlySet<string>;
  selectedTask: RoadmapGanttTask | null;
  drawerTask: RoadmapGanttTask | null;
  downstreamTaskCount: number;
  deliveryBoardHref: string | null;
  taskPlanBoardMove: TaskDetailsPlanBoardMove;
  consultantBoardPlanHref: string | null;
  focusedTask: RoadmapGanttTask | null;
  selectableLanesForJump: { id: string; title: string }[];
  laneMoveMenuEligible: boolean;
  ownerOptions: string[];
  activeFilterTagsResult: RoadmapGanttActiveFilterTagsRaw;
  isHeavyTaskLoad: boolean;
  overviewTasks: RoadmapGanttTask[];
  baselineSnapshot: RoadmapGanttBaselineSnapshot | null;
  setBaselineSnapshot: Dispatch<SetStateAction<RoadmapGanttBaselineSnapshot | null>>;
  /** Imperative helpers for capture/clear, exposed so the orchestrator can wire them as handlers. */
  captureBaseline: () => void;
  clearBaseline: () => void;
  /** Functional updaters used by the interactions hook to record/revert in-flight DnD overrides. */
  applyOverride: (target: { taskId: string; startMs: number; endMs: number; groupId: string }) => void;
  revertOverride: (
    taskId: string,
    restored: RoadmapGanttTimelineTaskOverrides[string] | null | undefined,
  ) => void;
  dependencySvgPathsByDepId: ReadonlyMap<string, string>;
  mapX: (ts: number) => number;
  mapY: (laneId: string) => number;
  dependencyCanvasHeight: number;
  timelineRangeMs: number;
};

/**
 * Loading and normalization layer for the Roadmap Gantt view.
 *
 * Owns: in-flight `timelineTaskOverrides` plus `baselineSnapshot` snapshot state.
 * Delegates filtered-task and dependency-SVG calculations to focused existing hooks.
 * All filter and selection state is owned by the orchestrator and fed in as args.
 *
 * Internal: not exported from `useRoadmapGanttView` and not used outside of it.
 */
export function useRoadmapGanttData(args: UseRoadmapGanttDataArgs): UseRoadmapGanttDataResult {
  const {
    auditId,
    projection,
    planBoardHydration,
    isClient,
    getDeliveryBoardHrefForPackNode,
    orchestrationPack,
    pathname,
    search,
    urlTaskParam,
    filters,
    selection,
    isOverviewDragging,
  } = args;
  const {
    selectedTaskId,
    focusedTaskId,
    hoveredDependencyId,
    setSelectedTaskId,
    setFocusedTaskId,
  } = selection;

  // ---------- Owned state ----------
  const [timelineTaskOverrides, setTimelineTaskOverrides] = useState<RoadmapGanttTimelineTaskOverrides>({});
  const [baselineSnapshot, setBaselineSnapshot] = useState<RoadmapGanttBaselineSnapshot | null>(() =>
    readRoadmapGanttBaseline(auditId),
  );

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
    titleQuery: filters.titleQuery,
    criticalPathOnly: filters.criticalPathOnly,
    ownerFilter: filters.ownerFilter,
    statusFilter: filters.statusFilter,
    laneFilter: filters.laneFilter,
    blockedOnly: filters.blockedOnly,
  });

  const timelineTasks = useMemo<RoadmapGanttTask[]>(
    () => mergeTimelineTaskOverrides(filteredTasks, timelineTaskOverrides),
    [filteredTasks, timelineTaskOverrides],
  );

  const chainTaskIds = useMemo(
    () =>
      buildChainTaskIds({
        projection,
        selectedTaskId: selectedTaskId,
        enabled: filters.highlightDependencyChain,
      }),
    [filters.highlightDependencyChain, projection, selectedTaskId],
  );

  // ---------- Plan Board hydration & inline edit gating ----------
  const boardRowByPackNodeId = useMemo(
    () => buildBoardRowByPackNodeId(planBoardHydration?.cards),
    [planBoardHydration?.cards],
  );

  const timelineBoardEditEnabled = useMemo(
    () => computeTimelineBoardEditEnabled({ isClient, planBoardHydration }),
    [isClient, planBoardHydration],
  );

  const timelineEditableTaskIds = useMemo(
    () => computeTimelineEditableTaskIds(timelineBoardEditEnabled, timelineTasks, boardRowByPackNodeId),
    [boardRowByPackNodeId, timelineBoardEditEnabled, timelineTasks],
  );

  // ---------- Groups / items ----------
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

  // ---------- Dependencies ----------
  const visibleDependencies = useMemo(
    () =>
      filterRoadmapGanttVisibleDependencies({
        deps: projection.dependencies,
        filteredTaskIds,
        dependencyTypeFilter: filters.dependencyTypeFilter,
        blockedOnly: filters.blockedOnly,
        dependencyView: filters.dependencyView,
        selectedTaskId: selectedTaskId,
      }),
    [
      filters.blockedOnly,
      filters.dependencyTypeFilter,
      filters.dependencyView,
      filteredTaskIds,
      projection.dependencies,
      selectedTaskId,
    ],
  );

  const sortedVisibleDependencies = useMemo(
    () =>
      sortRoadmapGanttDependencies({
        deps: visibleDependencies,
        taskTitleById,
        sort: filters.dependencySort,
      }),
    [filters.dependencySort, taskTitleById, visibleDependencies],
  );

  const hoveredDependency = useMemo(
    () => visibleDependencies.find((dep) => dep.id === hoveredDependencyId) ?? null,
    [visibleDependencies, hoveredDependencyId],
  );

  const highlightedTaskIds = useMemo(
    () => buildHighlightedTaskIds(hoveredDependency),
    [hoveredDependency],
  );

  const dependencyChainShouldDim = useMemo(
    () =>
      buildDependencyChainShouldDim({
        chainTaskIds,
        selectedTaskId: selectedTaskId,
        projectionTasks: projection.tasks,
      }),
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
  const deliveryBoardHref = drawerTask
    ? (getDeliveryBoardHrefForPackNode?.(drawerTask.id) ?? null)
    : null;

  const taskPlanBoardMove = useMemo<TaskDetailsPlanBoardMove>(
    () => computeTaskPlanBoardMove({ planBoardHydration, drawerTask }),
    [drawerTask, planBoardHydration],
  );

  const consultantBoardPlanHref = useMemo(
    () => computeConsultantBoardPlanHref({ auditId, isClient, pathname, search }),
    [auditId, isClient, pathname, search],
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

  // ---------- URL focus resolution ----------
  const projectionTaskIdSet = useMemo(
    () => new Set(projection.tasks.map((t) => t.id)),
    [projection.tasks],
  );
  const taskIdListKey = useMemo(
    () => projection.tasks.map((t) => t.id).sort().join(','),
    [projection.tasks],
  );
  const resolvedFocusTaskId = usePlanFocusPackNodeId(orchestrationPack ?? null);

  useEffect(() => {
    const next = resolveTaskFocusFromUrl({
      urlTaskParam,
      fallbackResolvedFocusTaskId: resolvedFocusTaskId,
      projectionTaskIds: projectionTaskIdSet,
    });
    if (next != null) {
      setSelectedTaskId(next);
      setFocusedTaskId(next);
    }
  }, [taskIdListKey, resolvedFocusTaskId, urlTaskParam, projectionTaskIdSet, setSelectedTaskId, setFocusedTaskId]);

  // ---------- Focus reconciliation ----------
  useEffect(() => {
    if (timelineTasks.length === 0) {
      setFocusedTaskId(null);
      return;
    }
    if (focusedTaskId == null || !timelineTasks.some((task) => task.id === focusedTaskId)) {
      setFocusedTaskId(timelineTasks[0]!.id);
    }
  }, [focusedTaskId, timelineTasks, setFocusedTaskId]);

  useEffect(() => {
    if (selectedTaskId && !projection.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [projection.tasks, selectedTaskId, setSelectedTaskId]);

  const isHeavyTaskLoad = timelineTasks.length >= ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD;

  // ---------- Dependency SVG paths (delegates to existing hook) ----------
  const {
    dependencySvgPathsByDepId,
    mapX,
    mapY,
    dependencyCanvasHeight,
    timelineRangeMs,
  } = useRoadmapGanttDependencySvgPaths({
    filteredTasks: timelineTasks,
    groups,
    projection: { defaultTimeStart: projection.defaultTimeStart, defaultTimeEnd: projection.defaultTimeEnd },
    visibleDependencies,
    freezeGeometry: isOverviewDragging,
  });

  const overviewTasks = timelineTasks.length > 0 ? timelineTasks : projection.tasks;

  // ---------- Owner options & active filter tags ----------
  const ownerOptions = useMemo(() => {
    return Array.from(
      new Set(
        projection.tasks
          .filter((task) => task.kind === 'task')
          .map((task) => task.owner)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [projection.tasks]);

  const activeFilterTagsResult: RoadmapGanttActiveFilterTagsRaw = useMemo(
    () =>
      buildActiveFilterTags({
        state: {
          dependencyTypeFilter: filters.dependencyTypeFilter,
          blockedOnly: filters.blockedOnly,
          ownerFilter: filters.ownerFilter,
          statusFilter: filters.statusFilter,
          laneFilter: filters.laneFilter,
          dependencyView: filters.dependencyView,
          criticalPathOnly: filters.criticalPathOnly,
          titleQuery: filters.titleQuery,
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
      filters.blockedOnly,
      filters.criticalPathOnly,
      filters.dependencyTypeFilter,
      filters.dependencyView,
      filters.laneFilter,
      filters.ownerFilter,
      filters.statusFilter,
      filters.titleQuery,
      projection.lanes,
    ],
  );

  // ---------- Baseline + override imperative helpers ----------
  const captureBaseline = useCallback(() => {
    writeRoadmapGanttBaseline(auditId, projection);
    setBaselineSnapshot(readRoadmapGanttBaseline(auditId));
  }, [auditId, projection]);

  const clearBaseline = useCallback(() => {
    clearRoadmapGanttBaseline(auditId);
    setBaselineSnapshot(null);
  }, [auditId]);

  const applyOverride = useCallback(
    (target: { taskId: string; startMs: number; endMs: number; groupId: string }) => {
      setTimelineTaskOverrides((prev) => applyTimelineTaskOverride(prev, target));
    },
    [],
  );

  const revertOverride = useCallback(
    (taskId: string, restored: RoadmapGanttTimelineTaskOverrides[string] | null | undefined) => {
      setTimelineTaskOverrides((prev) => revertTimelineTaskOverride(prev, taskId, restored));
    },
    [],
  );

  return {
    filteredTasks,
    filteredTaskIds,
    timelineTasks,
    timelineTaskOverrides,
    setTimelineTaskOverrides,
    groups,
    items,
    chainTaskIds,
    taskTitleById,
    taskByIdFull,
    visibleDependencies,
    sortedVisibleDependencies,
    hoveredDependency,
    highlightedTaskIds,
    dependencyChainShouldDim,
    boardRowByPackNodeId,
    timelineBoardEditEnabled,
    timelineEditableTaskIds,
    selectedTask,
    drawerTask,
    downstreamTaskCount,
    deliveryBoardHref,
    taskPlanBoardMove,
    consultantBoardPlanHref,
    focusedTask,
    selectableLanesForJump,
    laneMoveMenuEligible,
    ownerOptions,
    activeFilterTagsResult,
    isHeavyTaskLoad,
    overviewTasks,
    baselineSnapshot,
    setBaselineSnapshot,
    captureBaseline,
    clearBaseline,
    applyOverride,
    revertOverride,
    dependencySvgPathsByDepId,
    mapX,
    mapY,
    dependencyCanvasHeight,
    timelineRangeMs,
  };
}

export type { RoadmapGanttActiveFilterTagId };
