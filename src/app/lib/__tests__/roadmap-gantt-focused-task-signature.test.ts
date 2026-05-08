import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { buildFocusedTaskLiveRegionSig } from '../roadmap-gantt-focused-task-signature';
import type { RoadmapGanttTask } from '../roadmap-gantt-mapper';

function buildTask(overrides: Partial<RoadmapGanttTask> = {}): RoadmapGanttTask {
  return {
    id: 'a',
    group: 'tech_delivery',
    title: 'Task A',
    start_time: dayjs('2026-01-01').valueOf(),
    end_time: dayjs('2026-01-10').valueOf(),
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
    ...overrides,
  };
}

describe('buildFocusedTaskLiveRegionSig', () => {
  it('returns empty string for null/undefined task', () => {
    expect(buildFocusedTaskLiveRegionSig(null)).toBe('');
    expect(buildFocusedTaskLiveRegionSig(undefined)).toBe('');
  });

  it('produces a stable signature for identical input', () => {
    const a = buildTask();
    const b = buildTask();
    expect(buildFocusedTaskLiveRegionSig(a)).toBe(buildFocusedTaskLiveRegionSig(b));
  });

  it('changes when title changes', () => {
    const before = buildFocusedTaskLiveRegionSig(buildTask({ title: 'A' }));
    const after = buildFocusedTaskLiveRegionSig(buildTask({ title: 'B' }));
    expect(before).not.toBe(after);
  });

  it('changes when timing or lane changes', () => {
    const before = buildFocusedTaskLiveRegionSig(buildTask());
    expect(buildFocusedTaskLiveRegionSig(buildTask({ start_time: 0 }))).not.toBe(before);
    expect(buildFocusedTaskLiveRegionSig(buildTask({ end_time: 0 }))).not.toBe(before);
    expect(buildFocusedTaskLiveRegionSig(buildTask({ group: 'marketing_narrative' }))).not.toBe(before);
  });
});
