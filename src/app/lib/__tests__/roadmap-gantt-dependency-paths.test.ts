import { describe, expect, it } from 'vitest';

import { buildDependencySvgPathMap, pathForRoadmapDependency } from '../roadmap-gantt-dependency-paths';
import type { RoadmapGanttTask } from '../roadmap-gantt-mapper';

describe('roadmap-gantt-dependency-paths', () => {
  const layout = {
    defaultTimeStart: 0,
    defaultTimeEnd: 100,
    laneIndexById: new Map([
      ['a', 0],
      ['b', 1],
    ]),
    laneHeight: 54,
  } as const;

  const taskById = new Map<string, Pick<RoadmapGanttTask, 'id' | 'start_time' | 'end_time' | 'group'>>([
    ['t1', { id: 't1', group: 'a', start_time: 10, end_time: 40 }],
    ['t2', { id: 't2', group: 'b', start_time: 50, end_time: 80 }],
    ['solo', { id: 'solo', group: 'a', start_time: 0, end_time: 10 }],
  ]);

  it('pathForRoadmapDependency returns FS connector', () => {
    const path = pathForRoadmapDependency({ from: 't1', to: 't2', kind: 'FS' }, taskById, layout);
    expect(path).toContain('M ');
    expect(path).toContain(' C ');
    expect(path).not.toContain('NaN');
  });

  it('buildDependencySvgPathMap skips unresolved endpoints', () => {
    const map = buildDependencySvgPathMap(
      [
        { id: 'd-good', from: 't1', to: 't2', kind: 'FS' },
        { id: 'd-bad', from: 'missing', to: 't2', kind: 'FS' },
      ],
      taskById,
      layout,
    );
    expect(map.has('d-good')).toBe(true);
    expect(map.has('d-bad')).toBe(false);
  });
});
