import {
  type HTMLAttributes,
  type Key,
  type ReactNode,
} from 'react';
import { Diamond } from '@phosphor-icons/react';
import dayjs from 'dayjs';

import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '../../ui/context-menu';
import {
  baselineDeltaDays,
  type RoadmapGanttBaselineSnapshot,
} from '../../../lib/roadmap-gantt-baseline-storage';
import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttDependency,
  type RoadmapGanttTask,
} from '../../../lib/roadmap-gantt-mapper';
import { buildTaskTooltipData } from '../lib/build-task-tooltip-data';
import type { GanttTaskItem } from '../lib/timeline-item-types';

export type RoadmapGanttTaskBarProps = {
  item: GanttTaskItem;
  rawItemRootProps: HTMLAttributes<HTMLDivElement> & { key?: Key };
  tooltipSource: RoadmapGanttTask | undefined;
  baselineSnapshot: RoadmapGanttBaselineSnapshot | null;
  projectionDependencies: readonly RoadmapGanttDependency[];
  showSlack: boolean;
  showScheduleProgress: boolean;
  isKeyboardFocus: boolean;
  selectableLanesForJump: readonly { id: string; title: string }[];
  onLaneFocusFilter: (lane: { id: string; title: string }) => void;
  /**
   * Captured at item-renderer call time so render branches relying on `Date.now()`
   * (schedule-elapsed bar, tooltip elapsed text) are deterministic per render.
   */
  nowMs: number;
};

/**
 * Tooltip + context-menu wrapping the rendered Gantt task bar.
 * All visual data (baseline ghost, slack tail, schedule-elapsed, dependency counts)
 * is computed via {@link buildTaskTooltipData}.
 */
export function RoadmapGanttTaskBar(props: RoadmapGanttTaskBarProps) {
  const {
    item,
    rawItemRootProps,
    tooltipSource,
    baselineSnapshot,
    projectionDependencies,
    showSlack,
    showScheduleProgress,
    isKeyboardFocus,
    selectableLanesForJump,
    onLaneFocusFilter,
    nowMs,
  } = props;

  const { key: timelineItemReactKey, ...itemRootAttrs } = rawItemRootProps;

  const tooltipData = tooltipSource
    ? buildTaskTooltipData({
        task: tooltipSource,
        baselineSnapshot,
        projectionDependencies,
        showSlack,
        nowMs,
      })
    : null;

  let tooltipBody: ReactNode = null;
  if (tooltipSource?.kind === 'milestone' && tooltipData) {
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
  } else if (tooltipSource && tooltipData) {
    const bRow = baselineSnapshot?.tasks[tooltipSource.id];
    tooltipBody = (
      <div className="space-y-1 text-left text-xs font-normal leading-relaxed text-foreground">
        <div className="font-medium">{tooltipSource.title}</div>
        <div>
          {dayjs(tooltipSource.start_time).format('YYYY-MM-DD')}
          {ORCHESTRATION_UI_COPY.roadmapGanttTooltipDateRangeSep}
          {dayjs(tooltipSource.end_time).format('YYYY-MM-DD')}
        </div>
        <div>{`${tooltipData.durationDays}${ORCHESTRATION_UI_COPY.roadmapGanttDurationDaysSuffix}`}</div>
        {showScheduleProgress ? (
          <>
            <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttScheduleElapsedTooltipPrefix}: ${Math.round(tooltipData.scheduleElapsedPct * 100)}%`}</div>
            <div className="ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapGanttScheduleElapsedHint}</div>
          </>
        ) : null}
        {tooltipSource.owner ? <div>{tooltipSource.owner}</div> : null}
        {tooltipSource.impact ? <div>{tooltipSource.impact}</div> : null}
        {tooltipSource.onCriticalPath ? (
          <div>{ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathBadge}</div>
        ) : tooltipData.floatDays != null && tooltipData.floatDays > 0 ? (
          <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttSlackTooltipPrefix}: ${tooltipData.floatDays}${ORCHESTRATION_UI_COPY.roadmapGanttDurationDaysSuffix}`}</div>
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
        <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttBlocksLabel}: ${tooltipData.blocksDirect}`}</div>
        <div>{`${ORCHESTRATION_UI_COPY.roadmapGanttBlockedByLabel}: ${tooltipData.blockedByDirect}`}</div>
      </div>
    );
  }

  const baselineGhost = tooltipData?.baselineGhost ?? null;
  const slackFlexGrow = tooltipData?.slackFlexGrow ?? 0;
  const scheduleElapsedPct = tooltipData?.scheduleElapsedPct ?? 0;

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
                      <span
                        className="roadmap-gantt-confidence-dot"
                        data-level={tooltipSource.confidence}
                        aria-hidden
                      />
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
        <ContextMenuContent className="max-h-72 min-w-[length:var(--marketing-dropdown-min-width)] overflow-y-auto">
          <ContextMenuLabel className="text-xs font-normal text-muted-foreground">
            {ORCHESTRATION_UI_COPY.roadmapGanttLaneMoveMenuLabel}
          </ContextMenuLabel>
          {selectableLanesForJump.map((lane) => (
            <ContextMenuItem
              key={lane.id}
              className="text-xs"
              onSelect={() => {
                onLaneFocusFilter(lane);
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
}
