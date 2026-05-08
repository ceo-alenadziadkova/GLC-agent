import { useCallback, type ReactNode, type Key, type HTMLAttributes } from 'react';
import Timeline, {
  TimelineHeaders,
  DateHeader,
  SidebarHeader,
  TimelineMarkers,
  TodayMarker,
  type ReactCalendarTimelineProps,
  type TimelineGroupBase,
} from 'react-calendar-timeline';
import 'react-calendar-timeline/style.css';
import './RoadmapGanttTimelinePanel.css';
import './RoadmapGanttOverview.css';
import './RoadmapGanttTaskBar.css';

import {
  ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD,
  ROADMAP_GANTT_TIMELINE_LINE_HEIGHT_PX,
  ROADMAP_GANTT_TIMELINE_MAX_ZOOM_DAY_MS,
  ROADMAP_GANTT_TIMELINE_MAX_ZOOM_MONTH_MS,
  ROADMAP_GANTT_TIMELINE_MIN_ZOOM_MS,
} from '../../../config/roadmap-gantt-view-preferences';
import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';
import { TooltipProvider } from '../../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { RoadmapGanttOverviewStrip } from '../RoadmapGanttOverviewStrip';
import { RoadmapGanttToolbar } from '../RoadmapGanttToolbar';
import { verticalLineClassNamesForTime } from '../lib/vertical-line-classes';
import type { GanttTaskItem } from '../lib/timeline-item-types';
import type { UseRoadmapGanttViewResult } from '../../../hooks/useRoadmapGanttView';
import type { RoadmapGanttProjection } from '../../../lib/roadmap-gantt-mapper';
import { RoadmapGanttTaskBar } from './RoadmapGanttTaskBar';
import { RoadmapGanttEmptyState } from './RoadmapGanttEmptyState';

export type RoadmapGanttTimelinePanelProps = {
  ctl: UseRoadmapGanttViewResult;
  projection: RoadmapGanttProjection;
  toolbarLeadingSlot?: ReactNode | undefined;
};

/**
 * Timeline panel: header counts, heavy-load notice, toolbar, scroll buttons,
 * lane-move dropdown, overview strip, the `react-calendar-timeline` grid and
 * the empty-state card.
 */
export function RoadmapGanttTimelinePanel(props: RoadmapGanttTimelinePanelProps) {
  const { ctl, projection, toolbarLeadingSlot } = props;
  const { state, setters, derived, refs, ids, handlers } = ctl;

  const renderTimelineItem: NonNullable<ReactCalendarTimelineProps<GanttTaskItem>['itemRenderer']> = useCallback(
    ({ item, getItemProps }) => {
      const tooltipSource = derived.taskByIdFull.get(String(item.id));
      const rawItemRootProps = getItemProps({
        className: [item.className, tooltipSource?.kind === 'milestone' ? 'roadmap-gantt-milestone-root' : '']
          .filter(Boolean)
          .join(' '),
      }) as HTMLAttributes<HTMLDivElement> & { key?: Key };

      return (
        <RoadmapGanttTaskBar
          item={item}
          rawItemRootProps={rawItemRootProps}
          tooltipSource={tooltipSource}
          baselineSnapshot={state.baselineSnapshot}
          projectionDependencies={projection.dependencies}
          showSlack={state.showSlack}
          showScheduleProgress={state.showScheduleProgress}
          isKeyboardFocus={state.focusedTaskId === String(item.id)}
          selectableLanesForJump={derived.selectableLanesForJump}
          onLaneFocusFilter={handlers.applyLaneFocusFilter}
          nowMs={Date.now()}
        />
      );
    },
    [
      derived.selectableLanesForJump,
      derived.taskByIdFull,
      handlers.applyLaneFocusFilter,
      projection.dependencies,
      state.baselineSnapshot,
      state.focusedTaskId,
      state.showScheduleProgress,
      state.showSlack,
    ],
  );

  return (
    <div
      id={ids.mainPanelTimelineId}
      role="tabpanel"
      aria-labelledby={ids.mainTabTimelineId}
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold ds-text-primary">
            {ORCHESTRATION_UI_COPY.roadmapGanttTimelinePanelTitle}
          </h3>
          <p className="mt-1 text-xs ds-text-tertiary">
            {ORCHESTRATION_UI_COPY.roadmapGanttTimelinePanelHint}
          </p>
          {state.baselineSnapshot == null ? (
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
            .replace('{lanes}', String(derived.groups.length))
            .replace('{tasks}', String(derived.timelineTasks.length))}
        </div>
      </div>
      {derived.isHeavyTaskLoad ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs ds-text-secondary"
        >
          {ORCHESTRATION_UI_COPY.roadmapGanttHeavyTaskLoadTimelineNotice
            .replace('{count}', String(derived.timelineTasks.length))
            .replace('{threshold}', String(ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD))}
        </div>
      ) : null}
      <RoadmapGanttToolbar
        projection={projection}
        groups={derived.groups}
        filteredTasksCount={derived.timelineTasks.length}
        visibleDependenciesCount={derived.visibleDependencies.length}
        showRestoredViewNotice={state.showRestoredViewNotice}
        onDismissRestoredDefaults={() => {
          setters.setTimeScale('day');
          setters.setDayRangeDays(60);
          setters.setDensityMode('comfortable');
          setters.setShowRestoredViewNotice(false);
        }}
        onDismissRestoredNotice={() => setters.setShowRestoredViewNotice(false)}
        densityMode={state.densityMode}
        onDensityChange={setters.setDensityMode}
        isMonthScale={derived.isMonthScale}
        onTimeScaleDay={() => setters.setTimeScale('day')}
        onTimeScaleMonth={() => setters.setTimeScale('month')}
        dayRangeDays={state.dayRangeDays}
        onDayRangeChange={setters.setDayRangeDays}
        onJumpToToday={handlers.jumpTimelineToToday}
        baselineSnapshot={state.baselineSnapshot}
        titleQuery={state.titleQuery}
        onTitleQueryChange={setters.setTitleQuery}
        roadmapToolbarMoreOpen={state.roadmapToolbarMoreOpen}
        onRoadmapToolbarMoreOpenChange={setters.setRoadmapToolbarMoreOpen}
        onJumpRangePrevious={() => handlers.jumpTimelineRangeByDirection('previous')}
        onJumpRangeNext={() => handlers.jumpTimelineRangeByDirection('next')}
        criticalPathOnly={state.criticalPathOnly}
        onCriticalPathOnlyChange={setters.setCriticalPathOnly}
        highlightDependencyChain={state.highlightDependencyChain}
        onHighlightDependencyChainChange={setters.setHighlightDependencyChain}
        showSlack={state.showSlack}
        onShowSlackChange={setters.setShowSlack}
        showScheduleProgress={state.showScheduleProgress}
        onShowScheduleProgressChange={setters.setShowScheduleProgress}
        dependencyTypeFilter={state.dependencyTypeFilter}
        onDependencyTypeFilterChange={setters.setDependencyTypeFilter}
        blockedOnly={state.blockedOnly}
        onBlockedOnlyChange={setters.setBlockedOnly}
        onPresetBlocked={handlers.applyPresetBlocked}
        onPresetExecution={handlers.applyPresetExecution}
        onPresetCriticalPath={handlers.applyPresetCriticalPath}
        showAdvancedControls={state.showAdvancedControls}
        onToggleAdvancedControls={() => setters.setShowAdvancedControls((prev) => !prev)}
        advancedFiltersCount={derived.advancedFiltersCount}
        onResetView={handlers.resetView}
        sprintExportBusy={state.sprintExportBusy}
        onDownloadSprintCsv={() => void handlers.downloadSprintPlanCsv()}
        onCaptureBaseline={handlers.captureBaseline}
        onClearBaseline={handlers.clearBaseline}
        baselineClearDisabled={state.baselineSnapshot == null}
        icalExportBusy={state.icalExportBusy}
        onDownloadIcal={handlers.downloadIcal}
        ownerFilter={state.ownerFilter}
        ownerOptions={derived.ownerOptions}
        statusFilter={state.statusFilter}
        laneFilter={state.laneFilter}
        dependencyView={state.dependencyView}
        onOwnerFilterChange={setters.setOwnerFilter}
        onStatusFilterChange={setters.setStatusFilter}
        onLaneFilterChange={setters.setLaneFilter}
        onDependencyViewChange={setters.setDependencyView}
        hasActiveFilters={derived.hasActiveFilters}
        activeFilterTags={derived.activeFilterTags}
        activeFilterReason={derived.activeFilterReason}
        toolbarLeadingSlot={toolbarLeadingSlot}
      />
      {derived.timelineTasks.length > 0 ? (
        <div className="roadmap-grid-area">
          <div
            className="roadmap-grid-scroll-controls"
            aria-label="Timeline horizontal controls"
            data-empty={derived.timelineTasks.length === 0 ? 'true' : 'false'}
          >
            <button
              type="button"
              className="roadmap-scroll-button"
              onClick={() => handlers.scrollTimelineByDirection('left')}
              aria-label="Scroll timeline left"
              disabled={derived.timelineTasks.length === 0 || !state.canScrollLeft}
            >
              ←
            </button>
            <button
              type="button"
              className="roadmap-scroll-button"
              onClick={() => handlers.scrollTimelineByDirection('right')}
              aria-label="Scroll timeline right"
              disabled={derived.timelineTasks.length === 0 || !state.canScrollRight}
            >
              →
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="roadmap-grid-hint m-0">
              {ORCHESTRATION_UI_COPY.roadmapGanttTimelineKeyboardShortcutsHint}
            </p>
            {derived.laneMoveMenuEligible ? (
              <DropdownMenu open={state.laneMoveMenuOpen} onOpenChange={setters.setLaneMoveMenuOpen}>
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
                  {derived.selectableLanesForJump.map((lane) => (
                    <DropdownMenuItem
                      key={lane.id}
                      className="text-xs"
                      onSelect={() => handlers.applyLaneFocusFilter(lane)}
                    >
                      {lane.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {state.gridNavAnnouncement}
          </span>
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {state.mainPanelTabAnnouncement}
          </span>
          <p id={ids.roadmapOverviewMapDescriptionId} className="sr-only">
            {ORCHESTRATION_UI_COPY.roadmapGanttOverviewMapLongDescription}
          </p>
          <p className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttOverviewKeyboardHint}</p>
          <p className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttOverviewPointerHint}</p>
          <RoadmapGanttOverviewStrip
            filteredTasksLength={derived.timelineTasks.length}
            emptyFilteredLabel={ORCHESTRATION_UI_COPY.roadmapGanttOverviewEmptyFilteredLabel}
            overviewTasks={derived.overviewTasks}
            mapX={derived.mapX}
            isOverviewDragging={state.isOverviewDragging}
            onOverviewDraggingChange={setters.setIsOverviewDragging}
            onOverviewPointer={handlers.handleOverviewPointer}
            onOverviewKeyDown={handlers.handleOverviewKeyDown}
            overviewWindowWidthPct={derived.overviewWindow.widthPct}
            overviewWindowLeftPct={derived.overviewWindow.leftPct}
            trackRef={refs.overviewTrackRef}
            descriptionId={ids.roadmapOverviewMapDescriptionId}
            ariaLabel={ORCHESTRATION_UI_COPY.roadmapGanttOverviewMapAriaLabel}
          />
          <div
            ref={refs.timelineShellRef}
            className={[
              'roadmap-gantt-shell',
              state.densityMode === 'compact' ? 'roadmap-gantt-shell-compact' : 'roadmap-gantt-shell-comfortable',
              state.canScrollLeft ? 'roadmap-gantt-shell-can-scroll-left' : '',
              state.canScrollRight ? 'roadmap-gantt-shell-can-scroll-right' : '',
            ].join(' ')}
            tabIndex={0}
            role="grid"
            aria-label={ORCHESTRATION_UI_COPY.roadmapGanttTimelineGridAriaLabel}
            data-testid="roadmap-timeline-grid"
            onKeyDown={handlers.handleTimelineGridKeyDown}
          >
            <TooltipProvider delayDuration={180}>
              <Timeline<GanttTaskItem, TimelineGroupBase>
                key={`roadmap-timeline-${state.timeScale}-${state.dayRangeDays}`}
                groups={derived.groups}
                items={derived.items.map((item) => ({
                  ...item,
                  className: [
                    item.className,
                    derived.highlightedTaskIds.has(item.id) ? 'roadmap-gantt-item-highlighted' : '',
                    state.focusedTaskId === item.id ? 'roadmap-gantt-item-focused' : '',
                  ]
                    .filter(Boolean)
                    .join(' '),
                }))}
                defaultTimeStart={derived.defaultViewportStart}
                defaultTimeEnd={derived.defaultViewportEnd}
                lineHeight={ROADMAP_GANTT_TIMELINE_LINE_HEIGHT_PX}
                itemHeightRatio={0.72}
                sidebarWidth={220}
                rightSidebarWidth={0}
                canMove
                canResize="both"
                canChangeGroup
                stackItems
                itemRenderer={renderTimelineItem}
                minZoom={ROADMAP_GANTT_TIMELINE_MIN_ZOOM_MS}
                maxZoom={
                  derived.isMonthScale
                    ? ROADMAP_GANTT_TIMELINE_MAX_ZOOM_MONTH_MS
                    : ROADMAP_GANTT_TIMELINE_MAX_ZOOM_DAY_MS
                }
                verticalLineClassNamesForTime={(start) =>
                  verticalLineClassNamesForTime(start, derived.isMonthScale)
                }
                onItemSelect={(itemId) => handlers.selectTask(String(itemId))}
                onItemClick={(itemId) => handlers.selectTask(String(itemId))}
                onItemMove={handlers.handleTimelineItemMove}
                onItemResize={handlers.handleTimelineItemResize}
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
                    unit={derived.isMonthScale ? 'year' : 'month'}
                    labelFormat={(timeRange) =>
                      timeRange[0].format(derived.isMonthScale ? 'YYYY' : 'MMMM YYYY')
                    }
                  />
                  <DateHeader
                    className="roadmap-day-header"
                    unit={derived.isMonthScale ? 'month' : 'day'}
                    labelFormat={(timeRange) => timeRange[0].format(derived.isMonthScale ? 'MMM' : 'D')}
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
      {derived.timelineTasks.length === 0 ? (
        <RoadmapGanttEmptyState
          hasActiveFilters={derived.hasActiveFilters}
          activeFilterReason={derived.activeFilterReason}
          onResetView={handlers.resetView}
        />
      ) : null}
    </div>
  );
}
