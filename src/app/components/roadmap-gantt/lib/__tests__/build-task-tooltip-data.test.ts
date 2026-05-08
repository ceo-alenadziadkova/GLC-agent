import { describe, expect, it } from 'vitest';

import { buildTaskTooltipData } from '../build-task-tooltip-data';
import { ROADMAP_GANTT_DAY_MS } from '../../../../config/roadmap-gantt-view-preferences';
import type {
  RoadmapGanttDependency,
  RoadmapGanttTask,
} from '../../../../lib/roadmap-gantt-mapper';
import type { RoadmapGanttBaselineSnapshot } from '../../../../lib/roadmap-gantt-baseline-storage';

function task(partial: Partial<RoadmapGanttTask> & Pick<RoadmapGanttTask, 'id'>): RoadmapGanttTask {
  return {
    group: 'tech_delivery',
    title: partial.id,
    start_time: 0,
    end_time: 10 * ROADMAP_GANTT_DAY_MS,
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

function dep(id: string, from: string, to: string): RoadmapGanttDependency {
  return { id, from, to, kind: 'FS', strength: 'strong', blocking: false, crossLane: false, onCriticalPath: false };
}

describe('buildTaskTooltipData', () => {
  it('clamps scheduleElapsedPct to [0,1]', () => {
    const t = task({ id: 't1' });
    const before = buildTaskTooltipData({
      task: t,
      baselineSnapshot: null,
      projectionDependencies: [],
      showSlack: false,
      nowMs: -1000,
    });
    expect(before.scheduleElapsedPct).toBe(0);

    const after = buildTaskTooltipData({
      task: t,
      baselineSnapshot: null,
      projectionDependencies: [],
      showSlack: false,
      nowMs: t.end_time + 1_000_000,
    });
    expect(after.scheduleElapsedPct).toBe(1);
  });

  it('returns 0 scheduleElapsedPct for milestones', () => {
    const m = task({ id: 'm1', kind: 'milestone' });
    const data = buildTaskTooltipData({
      task: m,
      baselineSnapshot: null,
      projectionDependencies: [],
      showSlack: true,
      nowMs: 1000,
    });
    expect(data.scheduleElapsedPct).toBe(0);
    expect(data.slackFlexGrow).toBe(0);
  });

  it('computes baseline ghost when current and baseline windows overlap', () => {
    const t = task({ id: 't1', start_time: 0, end_time: 10 * ROADMAP_GANTT_DAY_MS });
    const snap: RoadmapGanttBaselineSnapshot = {
      schemaVersion: 1,
      takenAtMs: 0,
      tasks: { t1: { startMs: 2 * ROADMAP_GANTT_DAY_MS, endMs: 6 * ROADMAP_GANTT_DAY_MS } },
    };
    const data = buildTaskTooltipData({
      task: t,
      baselineSnapshot: snap,
      projectionDependencies: [],
      showSlack: false,
      nowMs: 0,
    });
    expect(data.baselineGhost).not.toBeNull();
    expect(data.baselineGhost?.leftPct).toBeCloseTo(20, 5);
    expect(data.baselineGhost?.widthPct).toBeCloseTo(40, 5);
  });

  it('returns null baseline ghost when ranges are disjoint', () => {
    const t = task({ id: 't1', start_time: 0, end_time: 5 * ROADMAP_GANTT_DAY_MS });
    const snap: RoadmapGanttBaselineSnapshot = {
      schemaVersion: 1,
      takenAtMs: 0,
      tasks: { t1: { startMs: 10 * ROADMAP_GANTT_DAY_MS, endMs: 12 * ROADMAP_GANTT_DAY_MS } },
    };
    const data = buildTaskTooltipData({
      task: t,
      baselineSnapshot: snap,
      projectionDependencies: [],
      showSlack: false,
      nowMs: 0,
    });
    expect(data.baselineGhost).toBeNull();
  });

  it('computes slack flex grow when totalFloatMs > 0 and showSlack is true', () => {
    const span = 5 * ROADMAP_GANTT_DAY_MS;
    const t = task({
      id: 't1',
      start_time: 0,
      end_time: span,
      totalFloatMs: 2 * ROADMAP_GANTT_DAY_MS,
    });
    const data = buildTaskTooltipData({
      task: t,
      baselineSnapshot: null,
      projectionDependencies: [],
      showSlack: true,
      nowMs: 0,
    });
    expect(data.slackFlexGrow).toBeCloseTo((2 * ROADMAP_GANTT_DAY_MS) / span, 5);
    expect(data.floatDays).toBe(2);
  });

  it('counts blocksDirect / blockedByDirect from dependencies', () => {
    const t = task({ id: 't2' });
    const deps: RoadmapGanttDependency[] = [
      dep('d1', 't2', 'tA'),
      dep('d2', 't2', 'tB'),
      dep('d3', 'tC', 't2'),
    ];
    const data = buildTaskTooltipData({
      task: t,
      baselineSnapshot: null,
      projectionDependencies: deps,
      showSlack: false,
      nowMs: 0,
    });
    expect(data.blocksDirect).toBe(2);
    expect(data.blockedByDirect).toBe(1);
  });
});
