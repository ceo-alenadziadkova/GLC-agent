import { describe, expect, it } from 'vitest';

import {
  buildChainTaskIds,
  buildHighlightedTaskIds,
  filterRoadmapGanttVisibleDependencies,
  sortRoadmapGanttDependencies,
} from '../roadmap-gantt-dependency-filters';
import type { RoadmapGanttDependency } from '../roadmap-gantt-mapper';

function dep(partial: Partial<RoadmapGanttDependency> & Pick<RoadmapGanttDependency, 'id' | 'from' | 'to'>): RoadmapGanttDependency {
  return {
    kind: 'FS',
    strength: 'strong',
    blocking: false,
    crossLane: false,
    onCriticalPath: false,
    ...partial,
  };
}

describe('filterRoadmapGanttVisibleDependencies', () => {
  const ids = new Set(['t1', 't2', 't3']);
  const deps: RoadmapGanttDependency[] = [
    dep({ id: 'd1', from: 't1', to: 't2', kind: 'FS', blocking: true }),
    dep({ id: 'd2', from: 't2', to: 't3', kind: 'SS', blocking: false }),
    dep({ id: 'd3', from: 't1', to: 't3', kind: 'FF', strength: 'weak' }),
    dep({ id: 'd4', from: 't1', to: 'tx', kind: 'FS' }),
  ];

  it('drops dependencies whose endpoints are not in the visible task set', () => {
    const visible = filterRoadmapGanttVisibleDependencies({
      deps,
      filteredTaskIds: ids,
      dependencyTypeFilter: 'all',
      blockedOnly: false,
      dependencyView: 'all',
      selectedTaskId: null,
    });
    expect(visible.map((d) => d.id)).toEqual(['d1', 'd2', 'd3']);
  });

  it('filters by dependency kind', () => {
    const visible = filterRoadmapGanttVisibleDependencies({
      deps,
      filteredTaskIds: ids,
      dependencyTypeFilter: 'FS',
      blockedOnly: false,
      dependencyView: 'all',
      selectedTaskId: null,
    });
    expect(visible.map((d) => d.id)).toEqual(['d1']);
  });

  it('filters blockedOnly', () => {
    const visible = filterRoadmapGanttVisibleDependencies({
      deps,
      filteredTaskIds: ids,
      dependencyTypeFilter: 'all',
      blockedOnly: true,
      dependencyView: 'all',
      selectedTaskId: null,
    });
    expect(visible.map((d) => d.id)).toEqual(['d1']);
  });

  it('filters by selected task only when dependencyView is "selected"', () => {
    const visible = filterRoadmapGanttVisibleDependencies({
      deps,
      filteredTaskIds: ids,
      dependencyTypeFilter: 'all',
      blockedOnly: false,
      dependencyView: 'selected',
      selectedTaskId: 't3',
    });
    expect(visible.map((d) => d.id)).toEqual(['d2', 'd3']);
  });

  it('returns empty when "selected" view has no selected task', () => {
    const visible = filterRoadmapGanttVisibleDependencies({
      deps,
      filteredTaskIds: ids,
      dependencyTypeFilter: 'all',
      blockedOnly: false,
      dependencyView: 'selected',
      selectedTaskId: null,
    });
    expect(visible).toEqual([]);
  });

  it('hides weak edges in "hide-weak" view', () => {
    const visible = filterRoadmapGanttVisibleDependencies({
      deps,
      filteredTaskIds: ids,
      dependencyTypeFilter: 'all',
      blockedOnly: false,
      dependencyView: 'hide-weak',
      selectedTaskId: null,
    });
    expect(visible.map((d) => d.id)).toEqual(['d1', 'd2']);
  });
});

describe('sortRoadmapGanttDependencies', () => {
  const titles = new Map<string, string>([
    ['t1', 'Alpha'],
    ['t2', 'Bravo'],
    ['t3', 'Charlie'],
  ]);

  const deps: RoadmapGanttDependency[] = [
    dep({ id: 'd1', from: 't2', to: 't3', kind: 'FS' }),
    dep({ id: 'd2', from: 't1', to: 't3', kind: 'SS' }),
    dep({ id: 'd3', from: 't1', to: 't2', kind: 'FF' }),
  ];

  it('sorts by from ASC with tie-breaks on to/type', () => {
    const sorted = sortRoadmapGanttDependencies({
      deps,
      taskTitleById: titles,
      sort: { key: 'from', direction: 'asc' },
    });
    expect(sorted.map((d) => d.id)).toEqual(['d3', 'd2', 'd1']);
  });

  it('reverses when direction is desc', () => {
    const sorted = sortRoadmapGanttDependencies({
      deps,
      taskTitleById: titles,
      sort: { key: 'from', direction: 'desc' },
    });
    expect(sorted.map((d) => d.id)).toEqual(['d1', 'd2', 'd3']);
  });

  it('sorts by type', () => {
    const sorted = sortRoadmapGanttDependencies({
      deps,
      taskTitleById: titles,
      sort: { key: 'type', direction: 'asc' },
    });
    // FF -> "Finish -> Finish", FS -> "Finish -> Start", SS -> "Start -> Start"
    expect(sorted.map((d) => d.kind)).toEqual(['FF', 'FS', 'SS']);
  });
});

describe('buildHighlightedTaskIds', () => {
  it('returns empty set without a hovered dep', () => {
    expect(buildHighlightedTaskIds(null).size).toBe(0);
  });

  it('returns endpoints of the hovered dep', () => {
    const set = buildHighlightedTaskIds(dep({ id: 'd1', from: 'a', to: 'b' }));
    expect([...set].sort()).toEqual(['a', 'b']);
  });
});

describe('buildChainTaskIds', () => {
  const projection = {
    tasks: [
      { id: 't1', kind: 'task' as const },
      { id: 't2', kind: 'task' as const },
      { id: 't3', kind: 'task' as const },
    ],
    upstreamByTask: new Map<string, ReadonlySet<string>>([
      ['t2', new Set(['t1'])],
    ]),
    downstreamByTask: new Map<string, ReadonlySet<string>>([
      ['t2', new Set(['t3'])],
    ]),
  } as Parameters<typeof buildChainTaskIds>[0]['projection'];

  it('returns null when disabled', () => {
    expect(buildChainTaskIds({ projection, selectedTaskId: 't2', enabled: false })).toBeNull();
  });

  it('returns null when selected task not found among task kind', () => {
    expect(buildChainTaskIds({ projection, selectedTaskId: 'tx', enabled: true })).toBeNull();
  });

  it('returns up/down/self union', () => {
    const ids = buildChainTaskIds({ projection, selectedTaskId: 't2', enabled: true });
    expect(ids).not.toBeNull();
    expect([...(ids ?? new Set<string>())].sort()).toEqual(['t1', 't2', 't3']);
  });
});
