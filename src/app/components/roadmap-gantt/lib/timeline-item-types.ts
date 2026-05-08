import type { TimelineItemBase } from 'react-calendar-timeline';

import type { RoadmapGanttTask } from '../../../lib/roadmap-gantt-mapper';

/**
 * Internal item shape consumed by react-calendar-timeline inside the roadmap Gantt view.
 * Carries presentation flags derived from the projection task plus visual className tokens.
 */
export type GanttTaskItem = TimelineItemBase<number> & {
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
