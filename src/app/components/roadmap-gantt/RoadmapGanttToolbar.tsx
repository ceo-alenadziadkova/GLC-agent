import type { ReactNode } from 'react';

import { ArrowsClockwise, DownloadSimple } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  DEPENDENCY_KIND_HINT,
  DEPENDENCY_KIND_LABEL,
  DEPENDENCY_KIND_ORDER,
  DEPENDENCY_KIND_SHORT_LABEL,
} from '../../lib/roadmap-gantt-dep-kind-labels';
import type { RoadmapGanttBaselineSnapshot } from '../../lib/roadmap-gantt-baseline-storage';
import type { RoadmapGanttProjection } from '../../lib/roadmap-gantt-mapper';
import { ROADMAP_GANTT_MILESTONE_LANE_ID } from '../../lib/roadmap-gantt-mapper';

export type RoadmapGanttToolbarProps = {
  projection: RoadmapGanttProjection;
  groups: TimelineGroupBase[];
  filteredTasksCount: number;
  visibleDependenciesCount: number;
  showRestoredViewNotice: boolean;
  onDismissRestoredDefaults: () => void;
  onDismissRestoredNotice: () => void;
  densityMode: 'compact' | 'comfortable';
  onDensityChange: (mode: 'compact' | 'comfortable') => void;
  isMonthScale: boolean;
  onTimeScaleDay: () => void;
  onTimeScaleMonth: () => void;
  dayRangeDays: 30 | 60 | 90;
  onDayRangeChange: (days: 30 | 60 | 90) => void;
  onJumpToToday: () => void;
  baselineSnapshot: RoadmapGanttBaselineSnapshot | null;
  titleQuery: string;
  onTitleQueryChange: (q: string) => void;
  roadmapToolbarMoreOpen: boolean;
  onRoadmapToolbarMoreOpenChange: (open: boolean) => void;
  onJumpRangePrevious: () => void;
  onJumpRangeNext: () => void;
  criticalPathOnly: boolean;
  onCriticalPathOnlyChange: (v: boolean) => void;
  highlightDependencyChain: boolean;
  onHighlightDependencyChainChange: (v: boolean) => void;
  showSlack: boolean;
  onShowSlackChange: (v: boolean) => void;
  showScheduleProgress: boolean;
  onShowScheduleProgressChange: (v: boolean) => void;
  dependencyTypeFilter: 'all' | 'FS' | 'SS' | 'FF' | 'SF';
  onDependencyTypeFilterChange: (v: 'all' | 'FS' | 'SS' | 'FF' | 'SF') => void;
  blockedOnly: boolean;
  onBlockedOnlyChange: (v: boolean) => void;
  onPresetBlocked: () => void;
  onPresetExecution: () => void;
  onPresetCriticalPath: () => void;
  showAdvancedControls: boolean;
  onToggleAdvancedControls: () => void;
  advancedFiltersCount: number;
  onResetView: () => void;
  sprintExportBusy: boolean;
  onDownloadSprintCsv: () => void;
  onCaptureBaseline: () => void;
  onClearBaseline: () => void;
  baselineClearDisabled: boolean;
  icalExportBusy: boolean;
  onDownloadIcal: () => void;
  ownerFilter: string;
  ownerOptions: string[];
  statusFilter: 'all' | 'planned' | 'in-progress' | 'done';
  laneFilter: string;
  dependencyView: 'all' | 'selected' | 'hide-weak';
  onOwnerFilterChange: (v: string) => void;
  onStatusFilterChange: (v: 'all' | 'planned' | 'in-progress' | 'done') => void;
  onLaneFilterChange: (v: string) => void;
  onDependencyViewChange: (v: 'all' | 'selected' | 'hide-weak') => void;
  hasActiveFilters: boolean;
  activeFilterTags: ReadonlyArray<{ id: string; label: string; clear: () => void }>;
  activeFilterReason: string;
  /** Optional leading controls (e.g. consultant-only Plan actions). Rendered inside the primary toolbar row. */
  toolbarLeadingSlot?: ReactNode | undefined;
};

export function RoadmapGanttToolbar({
  projection,
  groups,
  filteredTasksCount,
  visibleDependenciesCount,
  showRestoredViewNotice,
  onDismissRestoredDefaults,
  onDismissRestoredNotice,
  densityMode,
  onDensityChange,
  isMonthScale,
  onTimeScaleDay,
  onTimeScaleMonth,
  dayRangeDays,
  onDayRangeChange,
  onJumpToToday,
  baselineSnapshot,
  titleQuery,
  onTitleQueryChange,
  roadmapToolbarMoreOpen,
  onRoadmapToolbarMoreOpenChange,
  onJumpRangePrevious,
  onJumpRangeNext,
  criticalPathOnly,
  onCriticalPathOnlyChange,
  highlightDependencyChain,
  onHighlightDependencyChainChange,
  showSlack,
  onShowSlackChange,
  showScheduleProgress,
  onShowScheduleProgressChange,
  dependencyTypeFilter,
  onDependencyTypeFilterChange,
  blockedOnly,
  onBlockedOnlyChange,
  onPresetBlocked,
  onPresetExecution,
  onPresetCriticalPath,
  showAdvancedControls,
  onToggleAdvancedControls,
  advancedFiltersCount,
  onResetView,
  sprintExportBusy,
  onDownloadSprintCsv,
  onCaptureBaseline,
  onClearBaseline,
  baselineClearDisabled,
  icalExportBusy,
  onDownloadIcal,
  ownerFilter,
  ownerOptions,
  statusFilter,
  laneFilter,
  dependencyView,
  onOwnerFilterChange,
  onStatusFilterChange,
  onLaneFilterChange,
  onDependencyViewChange,
  hasActiveFilters,
  activeFilterTags,
  activeFilterReason,
  toolbarLeadingSlot,
}: RoadmapGanttToolbarProps) {
  const baselineLegendChip =
    baselineSnapshot != null ? (
      <TooltipProvider delayDuration={180}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex max-w-[14rem] items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[length:var(--text-2xs)] ds-text-secondary">
              <span className="roadmap-baseline-legend-swatch shrink-0" aria-hidden />
              <span className="truncate">{ORCHESTRATION_UI_COPY.roadmapGanttBaselineGhostLegend}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs leading-snug">
            {`${ORCHESTRATION_UI_COPY.roadmapGanttBaselineTakenAtPrefix}: ${dayjs(baselineSnapshot.takenAtMs).format('YYYY-MM-DD HH:mm')}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : null;

  const dayHorizonChipGroup = !isMonthScale ? (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-1"
      role="group"
      aria-label={ORCHESTRATION_UI_COPY.roadmapGanttHorizonAriaLabel}
    >
      {([30, 60, 90] as const).map((days) => (
        <button
          key={days}
          type="button"
          onClick={() => onDayRangeChange(days)}
          aria-pressed={dayRangeDays === days}
          className={[
            'rounded px-2 py-1 text-xs transition-colors',
            dayRangeDays === days ? 'bg-muted ds-text-primary' : 'ds-text-secondary hover:bg-muted',
          ].join(' ')}
          title={ORCHESTRATION_UI_COPY.roadmapGanttHorizonDayButtonTitleTemplate.replace('{days}', String(days))}
        >
          {`${days}${ORCHESTRATION_UI_COPY.roadmapGanttHorizonDayChipSuffix}`}
        </button>
      ))}
    </div>
  ) : null;

  /** Primary toolbar row: density + day/month only (horizon chips and baseline legend live under More). */
  const primaryViewControls = (
    <div className="roadmap-controls-section roadmap-controls-toolbar-primary">
      <span className="sr-only">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarPrimaryRowScreenReaderTitle}</span>
      <label htmlFor="densityMode" className="text-xs font-medium ds-text-primary">
        {ORCHESTRATION_UI_COPY.roadmapGanttDensityLabel}
      </label>
      <select
        id="densityMode"
        value={densityMode}
        onChange={(event) => onDensityChange(event.target.value as 'compact' | 'comfortable')}
        className="rounded-md border border-border bg-card px-2 py-1 text-xs"
      >
        <option value="compact">{ORCHESTRATION_UI_COPY.roadmapGanttDensityCompact}</option>
        <option value="comfortable">{ORCHESTRATION_UI_COPY.roadmapGanttDensityComfortable}</option>
      </select>
      <div
        className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-1"
        role="group"
        aria-label={ORCHESTRATION_UI_COPY.roadmapGanttScaleAriaLabel}
      >
        <button
          type="button"
          onClick={onTimeScaleDay}
          aria-pressed={!isMonthScale}
          className={[
            'rounded px-2 py-1 text-xs transition-colors',
            !isMonthScale ? 'bg-muted ds-text-primary' : 'ds-text-secondary hover:bg-muted',
          ].join(' ')}
        >
          {ORCHESTRATION_UI_COPY.roadmapGanttScaleDaysToggle}
        </button>
        <button
          type="button"
          onClick={onTimeScaleMonth}
          aria-pressed={isMonthScale}
          className={[
            'rounded px-2 py-1 text-xs transition-colors',
            isMonthScale ? 'bg-muted ds-text-primary' : 'ds-text-secondary hover:bg-muted',
          ].join(' ')}
        >
          {ORCHESTRATION_UI_COPY.roadmapGanttScaleMonthsToggle}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="roadmap-controls-bar mb-3 space-y-2">
        {showRestoredViewNotice ? (
          <div className="roadmap-restore-notice">
            <span>{ORCHESTRATION_UI_COPY.roadmapRestoreSessionNoticeLead}</span>
            <button type="button" onClick={onDismissRestoredDefaults} className="underline underline-offset-2">
              {ORCHESTRATION_UI_COPY.roadmapRestoreSessionUseDefault}
            </button>
            <button type="button" onClick={onDismissRestoredNotice} className="underline underline-offset-2">
              {ORCHESTRATION_UI_COPY.roadmapRestoreSessionDismiss}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <h2 className="sr-only">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarPrimarySectionTitle}</h2>
          {toolbarLeadingSlot ? (
            <div className="flex flex-wrap items-center gap-2 self-end">{toolbarLeadingSlot}</div>
          ) : null}
          {primaryViewControls}
          <button
            type="button"
            onClick={onJumpToToday}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
            title={ORCHESTRATION_UI_COPY.roadmapGanttJumpTodayTitle}
          >
            {ORCHESTRATION_UI_COPY.roadmapGanttJumpTodayLabel}
          </button>
          <div className="flex min-w-[8rem] max-w-[16rem] flex-col gap-1">
            <span className="text-xs font-medium ds-text-primary">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarSearchSectionTitle}</span>
            <input
              id="roadmapTitleSearch"
              type="search"
              value={titleQuery}
              onChange={(event) => onTitleQueryChange(event.target.value)}
              placeholder={ORCHESTRATION_UI_COPY.roadmapGanttSearchPlaceholder}
              aria-label={ORCHESTRATION_UI_COPY.roadmapGanttSearchAriaLabel}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary"
            />
          </div>
          <Popover modal={false} open={roadmapToolbarMoreOpen} onOpenChange={onRoadmapToolbarMoreOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                aria-expanded={roadmapToolbarMoreOpen}
                aria-haspopup="dialog"
                title={ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreHint}
              >
                {roadmapToolbarMoreOpen
                  ? ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreCollapse
                  : ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreExpand}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="border-border bg-popover text-popover-foreground w-[min(100vw-2rem,36rem)] max-h-[min(70vh,32rem)] space-y-2 overflow-y-auto p-3"
            >
              <div className="roadmap-controls-section">
                <div className="roadmap-controls-section-title">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreViewTitle}</div>
                <p className="max-w-md text-[length:var(--text-2xs)] leading-relaxed ds-text-tertiary">
                  {ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreHintSecondary}
                </p>
              </div>
              <div className="roadmap-controls-section">
                <div className="roadmap-controls-section-title">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreHorizonTitle}</div>
                {dayHorizonChipGroup}
                {isMonthScale ? (
                  <p className="max-w-md text-[length:var(--text-2xs)] ds-text-secondary">
                    {ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreHorizonMonthScaleNote}
                  </p>
                ) : null}
              </div>
              {baselineSnapshot != null ? (
                <div className="roadmap-controls-section">
                  <div className="roadmap-controls-section-title">{ORCHESTRATION_UI_COPY.roadmapGanttBaselineMoreSectionTitle}</div>
                  {baselineLegendChip}
                  <p className="max-w-md text-[length:var(--text-2xs)] ds-text-secondary">{ORCHESTRATION_UI_COPY.roadmapGanttBaselineStripeLegendCaption}</p>
                </div>
              ) : null}
              <div className="roadmap-controls-section">
                <div className="roadmap-controls-section-title">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreNavigateTitle}</div>
                <button
                  type="button"
                  onClick={onJumpRangePrevious}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                  title={ORCHESTRATION_UI_COPY.roadmapGanttPrevRangeTitle}
                  aria-label={ORCHESTRATION_UI_COPY.roadmapGanttPrevRangeAriaLabel}
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttPrevRangeLabel}
                </button>
                <button
                  type="button"
                  onClick={onJumpRangeNext}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                  title={ORCHESTRATION_UI_COPY.roadmapGanttNextRangeTitle}
                  aria-label={ORCHESTRATION_UI_COPY.roadmapGanttNextRangeAriaLabel}
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttNextRangeLabel}
                </button>
              </div>
              <div className="roadmap-controls-section">
                <div className="roadmap-controls-section-title">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreAnalysisTitle}</div>
                <label className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary">
                  <input
                    id="roadmapCriticalPathOnly"
                    type="checkbox"
                    checked={criticalPathOnly}
                    onChange={(event) => onCriticalPathOnlyChange(event.target.checked)}
                  />
                  {ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathFilterLabel}
                </label>
                <label
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary"
                  title={ORCHESTRATION_UI_COPY.roadmapGanttChainHighlightToggleHint}
                >
                  <input
                    id="roadmapChainHighlight"
                    type="checkbox"
                    checked={highlightDependencyChain}
                    onChange={(event) => onHighlightDependencyChainChange(event.target.checked)}
                  />
                  {ORCHESTRATION_UI_COPY.roadmapGanttChainHighlightLabel}
                </label>
                <label className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary">
                  <input
                    id="roadmapShowSlack"
                    type="checkbox"
                    checked={showSlack}
                    onChange={(event) => onShowSlackChange(event.target.checked)}
                  />
                  {ORCHESTRATION_UI_COPY.roadmapGanttSlackToggleLabel}
                </label>
                <label className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary">
                  <input
                    id="roadmapShowScheduleProgress"
                    type="checkbox"
                    checked={showScheduleProgress}
                    onChange={(event) => onShowScheduleProgressChange(event.target.checked)}
                  />
                  {ORCHESTRATION_UI_COPY.roadmapGanttScheduleProgressToggleLabel}
                </label>
              </div>
              <div className="roadmap-controls-section">
                <div className="roadmap-controls-section-title">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreFiltersTitle}</div>
                <label htmlFor="dependencyTypeFilter" className="text-xs font-medium ds-text-primary">
                  {ORCHESTRATION_UI_COPY.roadmapGanttDependencyTypeLabel}
                </label>
                <select
                  id="dependencyTypeFilter"
                  value={dependencyTypeFilter}
                  onChange={(event) =>
                    onDependencyTypeFilterChange(event.target.value as 'all' | 'FS' | 'SS' | 'FF' | 'SF')
                  }
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                >
                  <option value="all">{ORCHESTRATION_UI_COPY.roadmapGanttDependencyTypeAll}</option>
                  <option value="FS">{`${DEPENDENCY_KIND_SHORT_LABEL.FS} (Finish -> Start)`}</option>
                  <option value="SS">{`${DEPENDENCY_KIND_SHORT_LABEL.SS} (Start -> Start)`}</option>
                  <option value="FF">{`${DEPENDENCY_KIND_SHORT_LABEL.FF} (Finish -> Finish)`}</option>
                  <option value="SF">{`${DEPENDENCY_KIND_SHORT_LABEL.SF} (Start -> Finish)`}</option>
                </select>
                <label className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary">
                  <input type="checkbox" checked={blockedOnly} onChange={(event) => onBlockedOnlyChange(event.target.checked)} />
                  {ORCHESTRATION_UI_COPY.roadmapGanttBlockedOnlyLabel}
                </label>
                <button
                  type="button"
                  onClick={onPresetBlocked}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttPresetBlocked30Label}
                </button>
                <button
                  type="button"
                  onClick={onPresetExecution}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttPresetExecutionLabel}
                </button>
                <button
                  type="button"
                  onClick={onPresetCriticalPath}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathPresetLabel}
                </button>
              </div>
              <div className="roadmap-controls-section roadmap-controls-section-actions">
                <div className="roadmap-controls-section-title">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreActionsTitle}</div>
                <button
                  type="button"
                  onClick={onToggleAdvancedControls}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                  aria-expanded={showAdvancedControls}
                >
                  {`${ORCHESTRATION_UI_COPY.roadmapGanttAdvancedLabel}${advancedFiltersCount > 0 ? ` (${advancedFiltersCount})` : ''}`}
                </button>
                <button
                  type="button"
                  onClick={onResetView}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttResetViewCta}
                </button>
                <button
                  type="button"
                  disabled={sprintExportBusy}
                  onClick={() => void onDownloadSprintCsv()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted disabled:opacity-60"
                >
                  {sprintExportBusy ? (
                    <ArrowsClockwise className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <DownloadSimple className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  {sprintExportBusy ? ORCHESTRATION_UI_COPY.sprintExportCsvBusy : ORCHESTRATION_UI_COPY.sprintExportCsvCta}
                </button>
                {baselineSnapshot == null ? (
                  <p className="basis-full text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttBaselineBeforeSetHint}</p>
                ) : null}
                <button
                  type="button"
                  onClick={onCaptureBaseline}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttBaselineSetCta}
                </button>
                <button
                  type="button"
                  disabled={baselineClearDisabled}
                  onClick={onClearBaseline}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted disabled:opacity-60"
                >
                  {ORCHESTRATION_UI_COPY.roadmapGanttBaselineClearCta}
                </button>
                <button
                  type="button"
                  disabled={icalExportBusy}
                  onClick={() => void onDownloadIcal()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted disabled:opacity-60"
                >
                  {icalExportBusy ? (
                    <ArrowsClockwise className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <DownloadSimple className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  {icalExportBusy ? ORCHESTRATION_UI_COPY.roadmapGanttIcalExportBusy : ORCHESTRATION_UI_COPY.roadmapGanttIcalExportCta}
                </button>
                {baselineSnapshot ? (
                  <span className="text-xs ds-text-secondary">
                    {`${ORCHESTRATION_UI_COPY.roadmapGanttBaselineTakenAtPrefix}: ${dayjs(baselineSnapshot.takenAtMs).format('YYYY-MM-DD HH:mm')}`}
                  </span>
                ) : null}
                <span className="max-w-md text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttBaselineLocalNotice}</span>
                <span className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarResetHint}</span>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <details className="roadmap-controls-metrics-disclosure mb-3 rounded-lg border border-border bg-muted/30 px-2 py-1">
          <summary className="cursor-pointer select-none px-2 py-2 text-xs font-medium ds-text-secondary">
            {ORCHESTRATION_UI_COPY.roadmapGanttToolbarLegendSummary}
          </summary>
          <p className="mb-3 px-2 text-[length:var(--text-2xs)] ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreHint}</p>
          <div className="roadmap-controls-metrics flex flex-wrap gap-2 px-2 pb-3 text-xs ds-text-tertiary" data-testid="roadmap-toolbar-metrics">
            <span className="rounded-full border border-border bg-card px-2 py-1 font-medium ds-text-secondary">
              {ORCHESTRATION_UI_COPY.roadmapGanttToolbarMetricsLanesTemplate.replace('{count}', String(groups.length))}
            </span>
            <span className="rounded-full border border-border bg-card px-2 py-1 font-medium ds-text-secondary">
              {ORCHESTRATION_UI_COPY.roadmapGanttToolbarMetricsTasksTemplate.replace('{count}', String(filteredTasksCount))}
            </span>
            <span className="rounded-full border border-border bg-card px-2 py-1 font-medium ds-text-secondary">
              {ORCHESTRATION_UI_COPY.roadmapGanttToolbarMetricsDependenciesTemplate.replace(
                '{count}',
                String(visibleDependenciesCount),
              )}
            </span>
            {!isMonthScale ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 font-medium ds-text-secondary">
                <span className="roadmap-weekend-legend-swatch shrink-0" aria-hidden />
                {ORCHESTRATION_UI_COPY.roadmapGanttWeekendLegendLabel}
              </span>
            ) : null}
            <TooltipProvider delayDuration={180}>
              {DEPENDENCY_KIND_ORDER.map((kind) => (
                <span key={kind} className="inline-flex items-center gap-1 rounded-full border border-transparent bg-card px-2 py-1">
                  <span className="roadmap-dep-kind-dot h-2 w-2 rounded-full" data-kind={kind} />
                  {DEPENDENCY_KIND_LABEL[kind]}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="roadmap-kind-help"
                        aria-label={ORCHESTRATION_UI_COPY.roadmapGanttDependencyKindHelpAriaTemplate.replace('{kind}', kind)}
                      >
                        ?
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={6}
                      className="border border-border bg-popover px-3 py-2 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-lg [&>svg]:hidden"
                    >
                      {DEPENDENCY_KIND_HINT[kind]}
                    </TooltipContent>
                  </Tooltip>
                </span>
              ))}
            </TooltipProvider>
          </div>
        </details>
      </div>
      {showAdvancedControls ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted p-2">
          <label htmlFor="ownerFilter" className="text-xs font-medium ds-text-primary">
            {ORCHESTRATION_UI_COPY.roadmapGanttOwnerFilterLabel}
          </label>
          <select
            id="ownerFilter"
            value={ownerFilter}
            onChange={(event) => onOwnerFilterChange(event.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            <option value="all">{ORCHESTRATION_UI_COPY.roadmapGanttOwnerAll}</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
          <label htmlFor="statusFilter" className="text-xs font-medium ds-text-primary">
            {ORCHESTRATION_UI_COPY.roadmapGanttStatusFilterLabel}
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as 'all' | 'planned' | 'in-progress' | 'done')}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            <option value="all">{ORCHESTRATION_UI_COPY.roadmapGanttStatusAll}</option>
            <option value="planned">{ORCHESTRATION_UI_COPY.roadmapGanttStatusPlanned}</option>
            <option value="in-progress">{ORCHESTRATION_UI_COPY.roadmapGanttStatusInProgress}</option>
            <option value="done">{ORCHESTRATION_UI_COPY.roadmapGanttStatusDone}</option>
          </select>
          <label htmlFor="laneFilter" className="text-xs font-medium ds-text-primary">
            {ORCHESTRATION_UI_COPY.roadmapGanttLaneFilterLabel}
          </label>
          <select
            id="laneFilter"
            value={laneFilter}
            onChange={(event) => onLaneFilterChange(event.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            <option value="all">{ORCHESTRATION_UI_COPY.roadmapGanttLaneAll}</option>
            {projection.lanes
              .filter((lane) => lane.id !== ROADMAP_GANTT_MILESTONE_LANE_ID)
              .map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.title}
                </option>
              ))}
          </select>
          <label htmlFor="dependencyView" className="text-xs font-medium ds-text-primary">
            {ORCHESTRATION_UI_COPY.roadmapGanttDependencyViewLabel}
          </label>
          <select
            id="dependencyView"
            value={dependencyView}
            onChange={(event) => onDependencyViewChange(event.target.value as 'all' | 'selected' | 'hide-weak')}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            <option value="all">{ORCHESTRATION_UI_COPY.roadmapGanttDependencyViewAll}</option>
            <option value="selected">{ORCHESTRATION_UI_COPY.roadmapGanttDependencyViewSelected}</option>
            <option value="hide-weak">{ORCHESTRATION_UI_COPY.roadmapGanttDependencyViewHideWeak}</option>
          </select>
        </div>
      ) : null}
      {hasActiveFilters ? (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs ds-text-secondary">
            <span className="rounded-full border border-border bg-muted px-2 py-1">
              {ORCHESTRATION_UI_COPY.roadmapGanttFilteredViewBadge}
            </span>
            {activeFilterTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={tag.clear}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 ds-text-secondary hover:bg-muted"
                title={ORCHESTRATION_UI_COPY.roadmapGanttClearFilterChipTitleTemplate.replace('{label}', tag.label)}
              >
                <span>{tag.label}</span>
                <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" onClick={onResetView} className="underline underline-offset-2">
              {ORCHESTRATION_UI_COPY.roadmapGanttClearAllFilters}
            </button>
          </div>
          <p className="text-xs ds-text-tertiary">
            {ORCHESTRATION_UI_COPY.roadmapGanttFilterLogicPrefix}
            {activeFilterReason || ORCHESTRATION_UI_COPY.roadmapGanttFilterLogicFallback}
          </p>
        </div>
      ) : null}
    </>
  );
}
