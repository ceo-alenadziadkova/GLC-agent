import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  applyTimelineTaskOverride,
  mergeTimelineTaskOverrides,
  revertTimelineTaskOverride,
  type RoadmapGanttTimelineTaskOverrides,
} from '../roadmap-gantt-timeline-overrides';
import type { RoadmapGanttTask } from '../roadmap-gantt-mapper';

function buildTask(id: string, kind: 'task' | 'milestone' = 'task'): RoadmapGanttTask {
  return {
    id,
    group: 'tech_delivery',
    title: id,
    start_time: dayjs('2026-01-01').valueOf(),
    end_time: dayjs('2026-01-10').valueOf(),
    owner: '',
    description: '',
    impact: '',
    status: 'planned',
    deliverables: [],
    dependencyIds: [],
    isEstimated: false,
    kind,
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
  };
}

describe('mergeTimelineTaskOverrides', () => {
  it('returns the original task when no override exists', () => {
    const tasks = [buildTask('a'), buildTask('b')];
    expect(mergeTimelineTaskOverrides(tasks, {})).toEqual(tasks);
  });

  it('applies start/end/group overrides for tasks of kind "task"', () => {
    const a = buildTask('a');
    const overrides: RoadmapGanttTimelineTaskOverrides = {
      a: { start_time: 100, end_time: 200, group: 'marketing_narrative' },
    };
    const result = mergeTimelineTaskOverrides([a], overrides);
    expect(result[0]).toMatchObject({
      id: 'a',
      start_time: 100,
      end_time: 200,
      group: 'marketing_narrative',
    });
  });

  it('does not apply overrides to milestones', () => {
    const milestone = buildTask('m', 'milestone');
    const overrides: RoadmapGanttTimelineTaskOverrides = {
      m: { start_time: 100, end_time: 200, group: 'marketing_narrative' },
    };
    expect(mergeTimelineTaskOverrides([milestone], overrides)[0]).toEqual(milestone);
  });
});

describe('applyTimelineTaskOverride', () => {
  it('records a fresh override entry', () => {
    const next = applyTimelineTaskOverride(
      {},
      { taskId: 'a', startMs: 1, endMs: 2, groupId: 'tech_delivery' },
    );
    expect(next).toEqual({ a: { start_time: 1, end_time: 2, group: 'tech_delivery' } });
  });

  it('replaces an existing entry without mutating the previous map', () => {
    const prev: RoadmapGanttTimelineTaskOverrides = {
      a: { start_time: 0, end_time: 0, group: 'tech_delivery' },
    };
    const next = applyTimelineTaskOverride(prev, {
      taskId: 'a',
      startMs: 10,
      endMs: 20,
      groupId: 'marketing_narrative',
    });
    expect(prev.a?.start_time).toBe(0);
    expect(next.a?.start_time).toBe(10);
    expect(next.a?.group).toBe('marketing_narrative');
  });
});

describe('revertTimelineTaskOverride', () => {
  it('removes the override when no restored value is provided', () => {
    const prev: RoadmapGanttTimelineTaskOverrides = {
      a: { start_time: 1, end_time: 2, group: 'tech_delivery' },
    };
    const next = revertTimelineTaskOverride(prev, 'a', null);
    expect(next).toEqual({});
  });

  it('restores the previous override value when provided', () => {
    const prev: RoadmapGanttTimelineTaskOverrides = {};
    const next = revertTimelineTaskOverride(prev, 'a', {
      start_time: 5,
      end_time: 10,
      group: 'tech_delivery',
    });
    expect(next.a).toEqual({ start_time: 5, end_time: 10, group: 'tech_delivery' });
  });
});
