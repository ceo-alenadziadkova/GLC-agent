import { describe, expect, it } from 'vitest';

import { buildGanttTimelineItems } from '../build-timeline-items';
import type { RoadmapGanttTask } from '../../../../lib/roadmap-gantt-mapper';

function task(partial: Partial<RoadmapGanttTask> & Pick<RoadmapGanttTask, 'id'>): RoadmapGanttTask {
  return {
    group: 'tech_delivery',
    title: partial.id,
    start_time: 0,
    end_time: 1000,
    owner: '',
    description: '',
    impact: '',
    status: 'planned',
    deliverables: [],
    dependencyIds: [],
    isEstimated: false,
    kind: 'task',
    onCriticalPath: false,
    isOverdue: false,
    topPriorityBucket: null,
    confidence: null,
    earlyStartMs: null,
    earlyFinishMs: null,
    lateStartMs: null,
    lateFinishMs: null,
    totalFloatMs: null,
    freeFloatMs: null,
    ...partial,
  };
}

describe('buildGanttTimelineItems', () => {
  it('only sets canMove/canResize/canChangeGroup for editable task ids', () => {
    const items = buildGanttTimelineItems({
      timelineTasks: [task({ id: 't1' }), task({ id: 't2' })],
      timelineEditableTaskIds: new Set(['t1']),
      chainTaskIds: null,
    });
    const byId = new Map(items.map((i) => [i.id, i] as const));
    expect(byId.get('t1')?.canMove).toBe(true);
    expect(byId.get('t1')?.canResize).toBe('both');
    expect(byId.get('t1')?.canChangeGroup).toBe(true);
    expect(byId.get('t2')?.canMove).toBe(false);
    expect(byId.get('t2')?.canResize).toBe(false);
    expect(byId.get('t2')?.canChangeGroup).toBe(false);
  });

  it('milestones are never editable even when their id is in the editable set', () => {
    const items = buildGanttTimelineItems({
      timelineTasks: [task({ id: 'm1', kind: 'milestone' })],
      timelineEditableTaskIds: new Set(['m1']),
      chainTaskIds: null,
    });
    expect(items[0]?.canMove).toBe(false);
    expect(items[0]?.canResize).toBe(false);
    expect(items[0]?.canChangeGroup).toBe(false);
  });

  it('marks tasks outside chain as dimmed when chainTaskIds is provided', () => {
    const items = buildGanttTimelineItems({
      timelineTasks: [task({ id: 't1' }), task({ id: 't2' })],
      timelineEditableTaskIds: new Set(),
      chainTaskIds: new Set(['t1']),
    });
    const byId = new Map(items.map((i) => [i.id, i] as const));
    expect(byId.get('t1')?.className).not.toContain('roadmap-gantt-item-dimmed');
    expect(byId.get('t2')?.className).toContain('roadmap-gantt-item-dimmed');
  });

  it('annotates status, critical path, overdue, priority buckets and milestone class', () => {
    const items = buildGanttTimelineItems({
      timelineTasks: [
        task({
          id: 't1',
          status: 'in-progress',
          onCriticalPath: true,
          isOverdue: true,
          topPriorityBucket: '7d',
          isEstimated: true,
        }),
        task({ id: 'm1', kind: 'milestone', topPriorityBucket: '30d' }),
      ],
      timelineEditableTaskIds: new Set(),
      chainTaskIds: null,
    });
    expect(items[0]?.className).toContain('roadmap-gantt-item-status-in-progress');
    expect(items[0]?.className).toContain('roadmap-gantt-item-critical');
    expect(items[0]?.className).toContain('roadmap-gantt-item-overdue');
    expect(items[0]?.className).toContain('roadmap-gantt-item-priority-7d');
    expect(items[0]?.className).toContain('roadmap-gantt-item-estimated');
    expect(items[1]?.className).toContain('roadmap-gantt-milestone-item');
    expect(items[1]?.className).toContain('roadmap-gantt-item-priority-30d');
  });
});
