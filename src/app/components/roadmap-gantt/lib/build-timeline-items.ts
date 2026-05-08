import type { RoadmapGanttTask } from '../../../lib/roadmap-gantt-mapper';
import type { GanttTaskItem } from './timeline-item-types';

/**
 * Build the array of `react-calendar-timeline` items from the projection's filtered tasks.
 *
 * - DnD/resize/lane-change is gated by {@link timelineEditableTaskIds} (Plan Board hydration).
 * - Visual class tokens reflect status/critical-path/overdue/priority/dependency-chain dimming.
 */
export function buildGanttTimelineItems(args: {
  timelineTasks: readonly RoadmapGanttTask[];
  timelineEditableTaskIds: ReadonlySet<string>;
  chainTaskIds: ReadonlySet<string> | null;
}): GanttTaskItem[] {
  const { timelineTasks, timelineEditableTaskIds, chainTaskIds } = args;
  return timelineTasks.map((task) => {
    const editable = task.kind === 'task' && timelineEditableTaskIds.has(task.id);
    const className = [
      task.isEstimated ? 'roadmap-gantt-item-estimated' : 'roadmap-gantt-item-solid',
      `roadmap-gantt-item-status-${task.status}`,
      task.onCriticalPath ? 'roadmap-gantt-item-critical' : '',
      task.isOverdue ? 'roadmap-gantt-item-overdue' : '',
      task.topPriorityBucket === '7d' ? 'roadmap-gantt-item-priority-7d' : '',
      task.topPriorityBucket === '30d' ? 'roadmap-gantt-item-priority-30d' : '',
      task.kind === 'milestone' ? 'roadmap-gantt-milestone-item' : '',
      chainTaskIds != null && task.kind === 'task' && !chainTaskIds.has(task.id)
        ? 'roadmap-gantt-item-dimmed'
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      id: task.id,
      group: task.group,
      title: task.title,
      start_time: task.start_time,
      end_time: task.end_time,
      canMove: editable,
      canResize: editable ? 'both' : false,
      canChangeGroup: editable,
      status: task.status,
      kind: task.kind,
      onCriticalPath: task.onCriticalPath,
      isOverdue: task.isOverdue,
      topPriorityBucket: task.topPriorityBucket,
      confidence: task.confidence,
      className,
    };
  });
}
