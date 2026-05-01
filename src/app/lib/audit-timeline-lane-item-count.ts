import type { AuditTimelineDto } from '../data/api/audits-orchestration';

/** Raw count of lane items returned by GET timeline (before Gantt mapper). */
export function countTimelineLaneItems(timeline: AuditTimelineDto): number {
  return timeline.lanes.reduce((sum, lane) => sum + lane.items.length, 0);
}
