import { describe, expect, it } from 'vitest';

import {
  buildActiveFilterTags,
  type RoadmapGanttActiveFilterTagsCopy,
  type RoadmapGanttActiveFilterTagsState,
} from '../roadmap-gantt-active-filter-tags';

const COPY: RoadmapGanttActiveFilterTagsCopy = {
  dependencyPrefix: 'Dependency: ',
  blockedOnlyLabel: 'Blocked only',
  ownerPrefix: 'Owner: ',
  statusPrefix: 'Status: ',
  lanePrefix: 'Lane: ',
  dependencyViewPrefix: 'Dependency view: ',
  dependencyViewSelectedLabel: 'selected task',
  dependencyViewHideWeakLabel: 'hide weak',
  criticalPathLabel: 'Critical path only',
  titleQueryPrefix: 'Search: ',
};

const BASE_STATE: RoadmapGanttActiveFilterTagsState = {
  dependencyTypeFilter: 'all',
  blockedOnly: false,
  ownerFilter: 'all',
  statusFilter: 'all',
  laneFilter: 'all',
  dependencyView: 'all',
  criticalPathOnly: false,
  titleQuery: '',
};

describe('buildActiveFilterTags', () => {
  it('returns empty result when no filters are active', () => {
    const result = buildActiveFilterTags({ state: BASE_STATE, lanes: [], copy: COPY });
    expect(result.tags).toEqual([]);
    expect(result.reason).toBe('');
    expect(result.hasActiveFilters).toBe(false);
    expect(result.advancedFiltersCount).toBe(0);
  });

  it('builds dependency / blocked / owner / status / lane / depView / cpOnly / title tags', () => {
    const result = buildActiveFilterTags({
      state: {
        ...BASE_STATE,
        dependencyTypeFilter: 'FS',
        blockedOnly: true,
        ownerFilter: 'alice',
        statusFilter: 'in-progress',
        laneFilter: 'lane-x',
        dependencyView: 'selected',
        criticalPathOnly: true,
        titleQuery: '  build me  ',
      },
      lanes: [{ id: 'lane-x', title: 'Lane X' }],
      copy: COPY,
    });
    expect(result.tags.map((t) => t.id)).toEqual([
      'depType',
      'blocked',
      'owner',
      'status',
      'lane',
      'depView',
      'cpOnly',
      'title',
    ]);
    expect(result.tags.find((t) => t.id === 'lane')?.label).toBe('Lane: Lane X');
    expect(result.tags.find((t) => t.id === 'depView')?.label).toBe('Dependency view: selected task');
    expect(result.tags.find((t) => t.id === 'title')?.label).toBe('Search: build me');
    expect(result.hasActiveFilters).toBe(true);
    expect(result.advancedFiltersCount).toBe(6);
    expect(result.reason).toContain('Owner: alice');
  });

  it('falls back to lane id when title is missing', () => {
    const result = buildActiveFilterTags({
      state: { ...BASE_STATE, laneFilter: 'orphan-lane' },
      lanes: [],
      copy: COPY,
    });
    expect(result.tags[0]?.label).toBe('Lane: orphan-lane');
  });

  it('does not count an empty/whitespace-only title query', () => {
    const result = buildActiveFilterTags({
      state: { ...BASE_STATE, titleQuery: '   ' },
      lanes: [],
      copy: COPY,
    });
    expect(result.tags).toEqual([]);
    expect(result.hasActiveFilters).toBe(false);
  });
});
