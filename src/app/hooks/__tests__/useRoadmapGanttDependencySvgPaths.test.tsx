import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD } from '../../config/roadmap-gantt-view-preferences';
import type { TimelineGroupBase } from 'react-calendar-timeline';

import { useRoadmapGanttDependencySvgPaths } from '../useRoadmapGanttDependencySvgPaths';
import type { RoadmapGanttTask } from '../../lib/roadmap-gantt-mapper';

function stubTask(row: Partial<RoadmapGanttTask> & Pick<RoadmapGanttTask, 'id'>): RoadmapGanttTask {
  return {
    id: row.id,
    title: row.title ?? row.id,
    group: row.group ?? ('l1' as RoadmapGanttTask['group']),
    start_time: row.start_time ?? 0,
    end_time: row.end_time ?? 86_400_000,
    kind: row.kind ?? 'task',
    status: row.status ?? 'planned',
    onCriticalPath: row.onCriticalPath ?? false,
    isOverdue: row.isOverdue ?? false,
    isEstimated: row.isEstimated ?? false,
    topPriorityBucket: row.topPriorityBucket ?? null,
    confidence: row.confidence ?? null,
    dependencyIds: row.dependencyIds ?? [],
    description: row.description ?? '',
    owner: row.owner ?? '',
    impact: row.impact ?? '',
    deliverables: row.deliverables ?? [],
    earlyStartMs: row.earlyStartMs ?? null,
    earlyFinishMs: row.earlyFinishMs ?? null,
    lateStartMs: row.lateStartMs ?? null,
    lateFinishMs: row.lateFinishMs ?? null,
    totalFloatMs: row.totalFloatMs ?? null,
    freeFloatMs: row.freeFloatMs ?? null,
  };
}

describe('useRoadmapGanttDependencySvgPaths', () => {
  it('returns empty path map under heavy task load threshold', () => {
    const groups: TimelineGroupBase[] = [{ id: 'l1', title: 'Lane' }];
    const tasks: RoadmapGanttTask[] = Array.from({ length: ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD }, (_, i) =>
      stubTask({ id: `t${i}`, group: 'l1' }),
    );

    const { result } = renderHook(() =>
      useRoadmapGanttDependencySvgPaths({
        filteredTasks: tasks,
        groups,
        projection: { defaultTimeStart: 0, defaultTimeEnd: 10 * 86_400_000 },
        visibleDependencies: [],
      }),
    );

    expect(result.current.dependencySvgPathsByDepId.size).toBe(0);
    expect(typeof result.current.mapX(0)).toBe('number');
    expect(typeof result.current.mapY('l1')).toBe('number');
  });

  it('builds path map when under heavy load threshold and edges exist', () => {
    const groups: TimelineGroupBase[] = [
      { id: 'l1', title: 'A' },
      { id: 'l2', title: 'B' },
    ];
    const tasks = [stubTask({ id: 'a', group: 'l1' }), stubTask({ id: 'b', group: 'l2' })];
    const { result } = renderHook(() =>
      useRoadmapGanttDependencySvgPaths({
        filteredTasks: tasks,
        groups,
        projection: { defaultTimeStart: 0, defaultTimeEnd: 10 * 86_400_000 },
        visibleDependencies: [
          {
            id: 'dep1',
            from: 'a',
            to: 'b',
            kind: 'FS',
            blocking: true,
            crossLane: true,
            strength: 'direct_blocker',
            onCriticalPath: false,
          },
        ],
      }),
    );

    expect(result.current.dependencySvgPathsByDepId.get('dep1')).toBeTruthy();
    expect(result.current.dependencySvgPathsByDepId.get('dep1')!.length).toBeGreaterThan(4);
  });

  it('keeps the last computed path map while freezeGeometry is true after dependencies change', () => {
    const groups: TimelineGroupBase[] = [
      { id: 'l1', title: 'A' },
      { id: 'l2', title: 'B' },
    ];
    const tasks = [stubTask({ id: 'a', group: 'l1' }), stubTask({ id: 'b', group: 'l2' })];
    const edge = {
      id: 'dep1',
      from: 'a',
      to: 'b',
      kind: 'FS' as const,
      blocking: true,
      crossLane: true,
      strength: 'direct_blocker' as const,
      onCriticalPath: false,
    };
    const { result, rerender } = renderHook(
      (p: { freeze: boolean; edges: typeof edge[] }) =>
        useRoadmapGanttDependencySvgPaths({
          filteredTasks: tasks,
          groups,
          projection: { defaultTimeStart: 0, defaultTimeEnd: 10 * 86_400_000 },
          visibleDependencies: p.edges,
          freezeGeometry: p.freeze,
        }),
      { initialProps: { freeze: false, edges: [edge] } },
    );

    const pathBefore = result.current.dependencySvgPathsByDepId.get('dep1');
    expect(pathBefore).toBeTruthy();

    rerender({ freeze: true, edges: [] });
    expect(result.current.dependencySvgPathsByDepId.get('dep1')).toBe(pathBefore);

    rerender({ freeze: false, edges: [] });
    expect(result.current.dependencySvgPathsByDepId.get('dep1')).toBeUndefined();
  });
});
