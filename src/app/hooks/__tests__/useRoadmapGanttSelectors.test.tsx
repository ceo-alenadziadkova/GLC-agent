import dayjs from 'dayjs';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRoadmapGanttSelectors } from '../useRoadmapGanttSelectors';
import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttTask,
} from '../../lib/roadmap-gantt-mapper';
import type { RoadmapGanttActiveFilterTagDescriptor } from '../../lib/roadmap-gantt-active-filter-tags';

function buildTask(overrides: Partial<RoadmapGanttTask> & Pick<RoadmapGanttTask, 'id'>): RoadmapGanttTask {
  return {
    id: overrides.id,
    group: overrides.group ?? 'tech_delivery',
    title: overrides.title ?? overrides.id,
    start_time: overrides.start_time ?? dayjs('2026-01-01').valueOf(),
    end_time: overrides.end_time ?? dayjs('2026-01-10').valueOf(),
    owner: overrides.owner ?? '',
    description: overrides.description ?? '',
    impact: overrides.impact ?? '',
    status: overrides.status ?? 'planned',
    deliverables: overrides.deliverables ?? [],
    dependencyIds: overrides.dependencyIds ?? [],
    isEstimated: overrides.isEstimated ?? false,
    kind: overrides.kind ?? 'task',
    onCriticalPath: overrides.onCriticalPath ?? false,
    isOverdue: overrides.isOverdue ?? false,
    topPriorityBucket: overrides.topPriorityBucket ?? null,
    confidence: overrides.confidence ?? null,
    earlyStartMs: overrides.earlyStartMs ?? null,
    earlyFinishMs: overrides.earlyFinishMs ?? null,
    lateStartMs: overrides.lateStartMs ?? null,
    lateFinishMs: overrides.lateFinishMs ?? null,
    totalFloatMs: overrides.totalFloatMs ?? null,
    freeFloatMs: overrides.freeFloatMs ?? null,
  };
}

const TASK_A = buildTask({ id: 'a', title: 'Migrate Postgres', group: 'tech_delivery' });
const TASK_B = buildTask({ id: 'b', title: 'Refresh landing', group: 'marketing_narrative' });

const LANES = [
  { id: 'tech_delivery', title: 'Tech delivery' },
  { id: 'marketing_narrative', title: 'Marketing narrative' },
  { id: ROADMAP_GANTT_MILESTONE_LANE_ID, title: 'Milestones' },
];

function buildArgs(overrides: {
  focusedTaskId?: string | null;
  rawActiveFilterTags?: RoadmapGanttActiveFilterTagDescriptor[];
} = {}) {
  const setters = {
    setDependencyTypeFilter: vi.fn(),
    setBlockedOnly: vi.fn(),
    setOwnerFilter: vi.fn(),
    setStatusFilter: vi.fn(),
    setLaneFilter: vi.fn(),
    setDependencyView: vi.fn(),
    setCriticalPathOnly: vi.fn(),
    setTitleQuery: vi.fn(),
  };
  return {
    args: {
      focusedTaskId: overrides.focusedTaskId ?? null,
      projectionTasks: [TASK_A, TASK_B],
      projectionLanes: LANES,
      rawActiveFilterTags: overrides.rawActiveFilterTags ?? [],
      filterClearSetters: setters,
    },
    setters,
  };
}

describe('useRoadmapGanttSelectors', () => {
  it('returns empty signature and announcement when there is no focused task', () => {
    const { args } = buildArgs();
    const { result } = renderHook(() => useRoadmapGanttSelectors(args));
    expect(result.current.focusedTaskLiveRegionSig).toBe('');
    expect(result.current.focusedTaskAnnouncement).toBe('');
  });

  it('builds a stable signature for the same focused task across renders', () => {
    const { args } = buildArgs({ focusedTaskId: 'a' });
    const { result, rerender } = renderHook(
      ({ focusedTaskId }) => useRoadmapGanttSelectors({ ...args, focusedTaskId }),
      { initialProps: { focusedTaskId: 'a' } },
    );
    const first = result.current.focusedTaskLiveRegionSig;
    expect(first).not.toBe('');
    rerender({ focusedTaskId: 'a' });
    expect(result.current.focusedTaskLiveRegionSig).toBe(first);
  });

  it('signature changes when the focused task switches', () => {
    const { args } = buildArgs({ focusedTaskId: 'a' });
    const { result, rerender } = renderHook(
      ({ focusedTaskId }) => useRoadmapGanttSelectors({ ...args, focusedTaskId }),
      { initialProps: { focusedTaskId: 'a' as string | null } },
    );
    const first = result.current.focusedTaskLiveRegionSig;
    rerender({ focusedTaskId: 'b' });
    expect(result.current.focusedTaskLiveRegionSig).not.toBe(first);
  });

  it('builds an announcement message using the focused task title and lane label', () => {
    const { args } = buildArgs({ focusedTaskId: 'a' });
    const { result } = renderHook(() => useRoadmapGanttSelectors(args));
    expect(result.current.focusedTaskAnnouncement).toBe(
      'Focused task Migrate Postgres. Lane Tech delivery.',
    );
  });

  it('merges raw active filter tags with the per-tag clear callbacks', () => {
    const raw: RoadmapGanttActiveFilterTagDescriptor[] = [
      { id: 'depType', label: 'Dependency: FS' },
      { id: 'blocked', label: 'Blocked only' },
      { id: 'title', label: 'Search: hello' },
    ];
    const { args, setters } = buildArgs({ rawActiveFilterTags: raw });
    const { result } = renderHook(() => useRoadmapGanttSelectors(args));

    expect(result.current.activeFilterTags).toHaveLength(3);
    expect(result.current.activeFilterTags[0]?.id).toBe('depType');
    expect(result.current.activeFilterTags[0]?.label).toBe('Dependency: FS');

    result.current.tagClearById.depType();
    expect(setters.setDependencyTypeFilter).toHaveBeenCalledWith('all');
    result.current.tagClearById.blocked();
    expect(setters.setBlockedOnly).toHaveBeenCalledWith(false);
    result.current.tagClearById.owner();
    expect(setters.setOwnerFilter).toHaveBeenCalledWith('all');
    result.current.tagClearById.status();
    expect(setters.setStatusFilter).toHaveBeenCalledWith('all');
    result.current.tagClearById.lane();
    expect(setters.setLaneFilter).toHaveBeenCalledWith('all');
    result.current.tagClearById.depView();
    expect(setters.setDependencyView).toHaveBeenCalledWith('all');
    result.current.tagClearById.cpOnly();
    expect(setters.setCriticalPathOnly).toHaveBeenCalledWith(false);
    result.current.tagClearById.title();
    expect(setters.setTitleQuery).toHaveBeenCalledWith('');
  });
});
