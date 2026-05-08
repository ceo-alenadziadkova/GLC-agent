import dayjs from 'dayjs';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const searchParams = new URLSearchParams();
const setSearchParamsMock = vi.fn();

vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: '/plan/audit-1/roadmap', search: '' }),
  useSearchParams: () => [searchParams, setSearchParamsMock],
}));

vi.mock('../useProfile', () => ({
  useProfile: () => ({ isClient: false }),
}));

const dataResult = {
  timelineTasks: [],
  filteredTaskIds: new Set<string>(),
  groups: [],
  items: [],
  chainTaskIds: null,
  selectableLanesForJump: [],
  laneMoveMenuEligible: false,
  timelineEditableTaskIds: new Set<string>(),
  selectedTask: null,
  drawerTask: null,
  downstreamTaskCount: 0,
  deliveryBoardHref: null,
  taskPlanBoardMove: { enabled: false, lane: null },
  consultantBoardPlanHref: null,
  focusedTask: null,
  taskTitleById: new Map<string, string>(),
  taskByIdFull: new Map(),
  visibleDependencies: [],
  sortedVisibleDependencies: [],
  hoveredDependency: null,
  highlightedTaskIds: new Set<string>(),
  dependencyChainShouldDim: () => false,
  overviewTasks: [],
  isHeavyTaskLoad: false,
  ownerOptions: [],
  activeFilterTagsResult: { tags: [], reason: '', hasActiveFilters: false, advancedFiltersCount: 0 },
  baselineSnapshot: null,
  captureBaseline: vi.fn(),
  clearBaseline: vi.fn(),
  applyOverride: vi.fn(),
  revertOverride: vi.fn(),
  timelineTaskOverrides: {},
  boardRowByPackNodeId: new Map(),
  timelineBoardEditEnabled: false,
  dependencySvgPathsByDepId: new Map(),
  mapX: (ts: number) => ts,
  mapY: () => 0,
  dependencyCanvasHeight: 0,
  timelineRangeMs: dayjs('2026-12-31').valueOf() - dayjs('2026-01-01').valueOf(),
};

vi.mock('../useRoadmapGanttData', () => ({
  useRoadmapGanttData: () => dataResult,
}));

const viewportResult = {
  state: { canScrollLeft: false, canScrollRight: false },
  refs: { timelineShellRef: { current: null }, overviewTrackRef: { current: null } },
  derived: {
    isMonthScale: false,
    overviewWindow: {
      viewportStart: 0,
      viewportEnd: 0,
      clampedStart: 0,
      clampedEnd: 0,
      totalRangeMs: 1,
      leftPct: 0,
      widthPct: 100,
    },
    defaultViewportStart: 0,
    defaultViewportEnd: 1,
  },
  handlers: {
    focusTaskBarEl: vi.fn(),
    handleOverviewKeyDown: vi.fn(),
    scrollTimelineByDirection: vi.fn(),
    jumpTimelineRangeByDirection: vi.fn(),
    jumpTimelineToToday: vi.fn(),
    handleOverviewPointer: vi.fn(),
  },
};
vi.mock('../useRoadmapGanttViewport', () => ({
  useRoadmapGanttViewport: () => viewportResult,
}));

const selectorsResult = {
  focusedTaskLiveRegionSig: '',
  focusedTaskAnnouncement: '',
  tagClearById: {
    depType: vi.fn(),
    blocked: vi.fn(),
    owner: vi.fn(),
    status: vi.fn(),
    lane: vi.fn(),
    depView: vi.fn(),
    cpOnly: vi.fn(),
    title: vi.fn(),
  },
  activeFilterTags: [],
};
vi.mock('../useRoadmapGanttSelectors', () => ({
  useRoadmapGanttSelectors: () => selectorsResult,
}));

const actionsResult = {
  downloadSprintPlanCsv: vi.fn(async () => {}),
  downloadIcal: vi.fn(),
  resetView: vi.fn(),
  applyPresetBlocked: vi.fn(),
  applyPresetExecution: vi.fn(),
  applyPresetCriticalPath: vi.fn(),
};
vi.mock('../useRoadmapGanttActions', () => ({
  useRoadmapGanttActions: () => actionsResult,
}));

const interactionsResult = {
  applyLaneFocusFilter: vi.fn(),
  handleTimelineGridKeyDown: vi.fn(),
  handleMainPanelTablistKeyDown: vi.fn(),
  handleTimelineItemMove: vi.fn(),
  handleTimelineItemResize: vi.fn(),
  toggleDependencySort: vi.fn(),
  sortArrow: vi.fn(() => ''),
  selectTask: vi.fn(),
};
vi.mock('../useRoadmapGanttInteractions', () => ({
  useRoadmapGanttInteractions: () => interactionsResult,
}));

import { useRoadmapGanttView } from '../useRoadmapGanttView';
import type { RoadmapGanttProjection } from '../../lib/roadmap-gantt-mapper';

const projection: RoadmapGanttProjection = {
  lanes: [{ id: 'tech_delivery', title: 'Tech delivery' }],
  tasks: [],
  dependencies: [],
  defaultTimeStart: dayjs('2026-01-01').valueOf(),
  defaultTimeEnd: dayjs('2026-12-31').valueOf(),
  milestones: [],
  upstreamByTask: new Map(),
  downstreamByTask: new Map(),
};

describe('useRoadmapGanttView', () => {
  it('returns memoized state slices and wires handler contracts', () => {
    const { result, rerender } = renderHook(() =>
      useRoadmapGanttView({
        auditId: 'audit-1',
        projection,
        planBoardHydration: {
          enabled: false,
          pending: false,
          fetchFailed: false,
          blockedNoPack: false,
          blockedGovernance: false,
          cards: [],
          packVersionUsed: 1,
          role: 'consultant',
        },
      }),
    );

    const first = result.current;
    expect(first.handlers.handleTimelineItemMove).toBe(interactionsResult.handleTimelineItemMove);
    expect(first.handlers.downloadIcal).toBe(actionsResult.downloadIcal);
    expect(first.derived.activeFilterTags).toEqual([]);

    rerender();
    expect(result.current.handlers).toBe(first.handlers);
    expect(result.current.derived).toBe(first.derived);
    expect(result.current.state).toBe(first.state);
    expect(result.current.setters).toBe(first.setters);
  });

  it('exposes a stable public API shape (keys only)', () => {
    const { result } = renderHook(() =>
      useRoadmapGanttView({
        auditId: 'audit-1',
        projection,
        planBoardHydration: {
          enabled: false,
          pending: false,
          fetchFailed: false,
          blockedNoPack: false,
          blockedGovernance: false,
          cards: [],
          packVersionUsed: 1,
          role: 'consultant',
        },
      }),
    );

    expect(Object.keys(result.current.state).sort()).toMatchInlineSnapshot(`
      [
        "activePanel",
        "baselineSnapshot",
        "blockedOnly",
        "canScrollLeft",
        "canScrollRight",
        "criticalPathOnly",
        "dayRangeDays",
        "densityMode",
        "dependenciesTab",
        "dependencySort",
        "dependencyTypeFilter",
        "dependencyView",
        "focusedTaskId",
        "gridNavAnnouncement",
        "highlightDependencyChain",
        "hoveredDependencyId",
        "icalExportBusy",
        "isOverviewDragging",
        "laneFilter",
        "laneMoveMenuOpen",
        "mainPanelTabAnnouncement",
        "ownerFilter",
        "roadmapToolbarMoreOpen",
        "selectedTaskId",
        "showAdvancedControls",
        "showRestoredViewNotice",
        "showScheduleProgress",
        "showSlack",
        "sprintExportBusy",
        "statusFilter",
        "timeScale",
        "titleQuery",
      ]
    `);
    expect(Object.keys(result.current.setters).sort()).toMatchInlineSnapshot(`
      [
        "setActivePanel",
        "setBlockedOnly",
        "setCriticalPathOnly",
        "setDayRangeDays",
        "setDensityMode",
        "setDependenciesTab",
        "setDependencyTypeFilter",
        "setDependencyView",
        "setFocusedTaskId",
        "setHighlightDependencyChain",
        "setHoveredDependencyId",
        "setIsOverviewDragging",
        "setLaneFilter",
        "setLaneMoveMenuOpen",
        "setMainPanelTabAnnouncement",
        "setOwnerFilter",
        "setRoadmapToolbarMoreOpen",
        "setSelectedTaskId",
        "setShowAdvancedControls",
        "setShowRestoredViewNotice",
        "setShowScheduleProgress",
        "setShowSlack",
        "setStatusFilter",
        "setTimeScale",
        "setTitleQuery",
      ]
    `);
    expect(Object.keys(result.current.refs).sort()).toMatchInlineSnapshot(`
      [
        "overviewTrackRef",
        "timelineShellRef",
      ]
    `);
    expect(Object.keys(result.current.ids).sort()).toMatchInlineSnapshot(`
      [
        "depsPanelGraphId",
        "depsPanelTableId",
        "depsTabGraphId",
        "depsTabTableId",
        "mainPanelDependenciesId",
        "mainPanelTimelineId",
        "mainTabDependenciesId",
        "mainTabTimelineId",
        "roadmapOverviewMapDescriptionId",
      ]
    `);
    expect(Object.keys(result.current.derived).sort()).toMatchInlineSnapshot(`
      [
        "activeFilterReason",
        "activeFilterTags",
        "advancedFiltersCount",
        "chainTaskIds",
        "consultantBoardPlanHref",
        "defaultViewportEnd",
        "defaultViewportStart",
        "deliveryBoardHref",
        "dependencyCanvasHeight",
        "dependencyChainShouldDim",
        "dependencySvgPathsByDepId",
        "downstreamTaskCount",
        "drawerTask",
        "filteredTaskIds",
        "focusedTask",
        "groups",
        "hasActiveFilters",
        "highlightedTaskIds",
        "hoveredDependency",
        "isHeavyTaskLoad",
        "isMonthScale",
        "items",
        "laneMoveMenuEligible",
        "mapX",
        "mapY",
        "overviewTasks",
        "overviewWindow",
        "ownerOptions",
        "selectableLanesForJump",
        "selectedTask",
        "sortedVisibleDependencies",
        "taskByIdFull",
        "taskPlanBoardMove",
        "taskTitleById",
        "timelineEditableTaskIds",
        "timelineRangeMs",
        "timelineTasks",
        "visibleDependencies",
      ]
    `);
    expect(Object.keys(result.current.handlers).sort()).toMatchInlineSnapshot(`
      [
        "applyLaneFocusFilter",
        "applyPresetBlocked",
        "applyPresetCriticalPath",
        "applyPresetExecution",
        "captureBaseline",
        "clearBaseline",
        "downloadIcal",
        "downloadSprintPlanCsv",
        "handleMainPanelTablistKeyDown",
        "handleOverviewKeyDown",
        "handleOverviewPointer",
        "handleTimelineGridKeyDown",
        "handleTimelineItemMove",
        "handleTimelineItemResize",
        "jumpTimelineRangeByDirection",
        "jumpTimelineToToday",
        "resetView",
        "scrollTimelineByDirection",
        "selectTask",
        "sortArrow",
        "toggleDependencySort",
      ]
    `);
  });
});
