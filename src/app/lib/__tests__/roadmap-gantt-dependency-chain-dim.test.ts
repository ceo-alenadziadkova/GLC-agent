import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { buildDependencyChainShouldDim } from '../roadmap-gantt-dependency-chain-dim';
import type { RoadmapGanttDependency, RoadmapGanttTask } from '../roadmap-gantt-mapper';

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

function buildDep(from: string, to: string): RoadmapGanttDependency {
  return {
    id: `${from}-${to}`,
    from,
    to,
    kind: 'FS',
    strength: 'strong',
    blocking: false,
    crossLane: false,
    onCriticalPath: false,
  };
}

describe('buildDependencyChainShouldDim', () => {
  const tasks = [buildTask('a'), buildTask('b'), buildTask('c')];

  it('always returns false when chainTaskIds is null', () => {
    const dim = buildDependencyChainShouldDim({
      chainTaskIds: null,
      selectedTaskId: 'a',
      projectionTasks: tasks,
    });
    expect(dim(buildDep('a', 'b'))).toBe(false);
  });

  it('returns false when no task is selected', () => {
    const dim = buildDependencyChainShouldDim({
      chainTaskIds: new Set(['a']),
      selectedTaskId: null,
      projectionTasks: tasks,
    });
    expect(dim(buildDep('a', 'b'))).toBe(false);
  });

  it('returns false when selected id refers to a milestone', () => {
    const milestoneTasks = [buildTask('m', 'milestone'), buildTask('a')];
    const dim = buildDependencyChainShouldDim({
      chainTaskIds: new Set(['a']),
      selectedTaskId: 'm',
      projectionTasks: milestoneTasks,
    });
    expect(dim(buildDep('a', 'm'))).toBe(false);
  });

  it('returns false for dependencies fully inside the chain', () => {
    const dim = buildDependencyChainShouldDim({
      chainTaskIds: new Set(['a', 'b']),
      selectedTaskId: 'a',
      projectionTasks: tasks,
    });
    expect(dim(buildDep('a', 'b'))).toBe(false);
  });

  it('returns true when one endpoint is outside the chain', () => {
    const dim = buildDependencyChainShouldDim({
      chainTaskIds: new Set(['a', 'b']),
      selectedTaskId: 'a',
      projectionTasks: tasks,
    });
    expect(dim(buildDep('a', 'c'))).toBe(true);
  });
});
