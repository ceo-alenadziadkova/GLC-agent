import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  computeRoadmapGanttViewportEnd,
  pickNearestTimelineTaskForTime,
} from '../roadmap-gantt-viewport';
import type { RoadmapGanttTask } from '../roadmap-gantt-mapper';

const baseStart = dayjs('2026-01-01').valueOf();
const baseEnd = dayjs('2026-12-31').valueOf();

describe('computeRoadmapGanttViewportEnd', () => {
  it('returns projection.defaultTimeEnd in month scale regardless of dayRangeDays', () => {
    expect(
      computeRoadmapGanttViewportEnd({
        defaultTimeStart: baseStart,
        defaultTimeEnd: baseEnd,
        isMonthScale: true,
        dayRangeDays: 30,
      }),
    ).toBe(baseEnd);
  });

  it('clamps to dayRangeDays after start in day scale', () => {
    const result = computeRoadmapGanttViewportEnd({
      defaultTimeStart: baseStart,
      defaultTimeEnd: baseEnd,
      isMonthScale: false,
      dayRangeDays: 30,
    });
    const expected = dayjs(baseStart).add(30, 'day').endOf('day').valueOf();
    expect(result).toBe(expected);
  });

  it('does not extend past defaultTimeEnd', () => {
    const tightEnd = dayjs(baseStart).add(7, 'day').valueOf();
    const result = computeRoadmapGanttViewportEnd({
      defaultTimeStart: baseStart,
      defaultTimeEnd: tightEnd,
      isMonthScale: false,
      dayRangeDays: 60,
    });
    expect(result).toBe(tightEnd);
  });
});

function buildTask(id: string, startIso: string, endIso: string): RoadmapGanttTask {
  return {
    id,
    group: 'tech_delivery',
    title: id,
    start_time: dayjs(startIso).valueOf(),
    end_time: dayjs(endIso).valueOf(),
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
  };
}

describe('pickNearestTimelineTaskForTime', () => {
  it('returns null for empty list', () => {
    expect(pickNearestTimelineTaskForTime([], 0)).toBeNull();
  });

  it('prefers a task whose range contains the target time', () => {
    const a = buildTask('a', '2026-01-01', '2026-01-10');
    const b = buildTask('b', '2026-01-15', '2026-01-20');
    const target = dayjs('2026-01-05').valueOf();
    expect(pickNearestTimelineTaskForTime([b, a], target)?.id).toBe('a');
  });

  it('falls back to nearest edge when target is outside every range', () => {
    const a = buildTask('a', '2026-01-01', '2026-01-05');
    const b = buildTask('b', '2026-02-01', '2026-02-05');
    const target = dayjs('2026-01-25').valueOf();
    expect(pickNearestTimelineTaskForTime([a, b], target)?.id).toBe('b');
  });
});
