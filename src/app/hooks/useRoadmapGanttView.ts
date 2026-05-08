import { useEffect, useId, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import { ROADMAP_SEARCH_PARAM_TASK } from '../lib/roadmap-gantt-url-params';
import type {
  RoadmapGanttActiveFilterTag,
  UseRoadmapGanttViewArgs,
  UseRoadmapGanttViewResult,
} from './useRoadmapGanttView.types';
import { useProfile } from './useProfile';
import { useRoadmapGanttData } from './useRoadmapGanttData';
import { useRoadmapGanttInteractions } from './useRoadmapGanttInteractions';
import { useRoadmapGanttViewport } from './useRoadmapGanttViewport';
import { useRoadmapGanttActions } from './useRoadmapGanttActions';
import { useRoadmapGanttSelectors } from './useRoadmapGanttSelectors';
import { useRoadmapGanttPersistenceEffects } from './useRoadmapGanttPersistenceEffects';
import { useRoadmapGanttUrlSyncEffect } from './useRoadmapGanttUrlSyncEffect';
import { useRoadmapGanttViewState } from './useRoadmapGanttViewState';

export type { RoadmapGanttActiveFilterTag, UseRoadmapGanttViewArgs, UseRoadmapGanttViewResult } from './useRoadmapGanttView.types';

export function useRoadmapGanttView(args: UseRoadmapGanttViewArgs): UseRoadmapGanttViewResult {
  const { auditId, projection, orchestrationPack, planBoardHydration, getDeliveryBoardHrefForPackNode } = args;

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { isClient } = useProfile();

  const vs = useRoadmapGanttViewState(searchParams);

  const {
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
  } = vs;

  useRoadmapGanttPersistenceEffects({
    timeScale,
    dayRangeDays,
    densityMode,
    criticalPathOnly,
    showSlack,
    showScheduleProgress,
  });

  useRoadmapGanttUrlSyncEffect({
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

  useEffect(() => {
    setGridNavAnnouncement(selectors.focusedTaskAnnouncement);
  }, [selectors.focusedTaskAnnouncement]);

  useEffect(() => {
    if (!mainPanelTabAnnouncement) return;
    const t = window.setTimeout(() => setMainPanelTabAnnouncement(''), 2000);
    return () => window.clearTimeout(t);
  }, [mainPanelTabAnnouncement]);

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
