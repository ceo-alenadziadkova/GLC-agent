import { type KeyboardEvent, type RefObject } from 'react';

import type { RoadmapGanttTask } from '../../lib/roadmap-gantt-mapper';

export type RoadmapGanttOverviewStripProps = {
  filteredTasksLength: number;
  emptyFilteredLabel: string;
  overviewTasks: RoadmapGanttTask[];
  mapX: (ts: number) => number;
  isOverviewDragging: boolean;
  onOverviewDraggingChange: (next: boolean) => void;
  onOverviewPointer: (clientX: number) => void;
  onOverviewKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  overviewWindowWidthPct: number;
  overviewWindowLeftPct: number;
  trackRef: RefObject<HTMLDivElement | null>;
  descriptionId: string;
  ariaLabel: string;
};

/**
 * Minimap-style horizon strip: pointer drag scrubs main timeline scroll; keyboard ops handled by parent.
 */
export function RoadmapGanttOverviewStrip({
  filteredTasksLength,
  emptyFilteredLabel,
  overviewTasks,
  mapX,
  isOverviewDragging,
  onOverviewDraggingChange,
  onOverviewPointer,
  onOverviewKeyDown,
  overviewWindowWidthPct,
  overviewWindowLeftPct,
  trackRef,
  descriptionId,
  ariaLabel,
}: RoadmapGanttOverviewStripProps) {
  if (filteredTasksLength === 0) {
    return (
      <div className="roadmap-overview-strip roadmap-overview-strip-empty" role="presentation" data-empty="true">
        <span className="roadmap-overview-empty-label">{emptyFilteredLabel}</span>
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className={['roadmap-overview-strip', isOverviewDragging ? 'roadmap-overview-strip--dragging' : ''].filter(Boolean).join(' ')}
      role="group"
      data-empty="false"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-describedby={descriptionId}
      onKeyDown={onOverviewKeyDown}
      onMouseDown={(event) => {
        onOverviewDraggingChange(true);
        onOverviewPointer(event.clientX);
      }}
      onMouseMove={(event) => {
        if ((event.buttons & 1) !== 1) return;
        onOverviewPointer(event.clientX);
      }}
      onMouseUp={() => onOverviewDraggingChange(false)}
      onMouseLeave={() => onOverviewDraggingChange(false)}
    >
      {overviewTasks.map((task) => {
        const left = mapX(task.start_time);
        const width = Math.max(mapX(task.end_time) - left, 0.8);
        return (
          <span key={`${task.id}-overview`} className="roadmap-overview-task" style={{ left: `${left}%`, width: `${width}%` }} />
        );
      })}
      <span
        className="roadmap-overview-window"
        style={{
          width: `${overviewWindowWidthPct}%`,
          left: `${overviewWindowLeftPct}%`,
        }}
      />
    </div>
  );
}
