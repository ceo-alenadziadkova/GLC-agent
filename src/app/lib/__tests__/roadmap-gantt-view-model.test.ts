import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import {
  FOCUSED_FIRST_TIMELINE_TASK_SENTINEL,
  PRESET_BLOCKED_PATCH,
  PRESET_CRITICAL_PATH_PATCH,
  PRESET_EXECUTION_PATCH,
  RESET_VIEW_PATCH,
  applyPresetPatch,
  buildFocusedTaskAnnouncementMessage,
  buildRoadmapGanttUrlSearchParams,
  dependencySortReducer,
  formatDependencySortArrow,
  pickNextActivePanel,
  readInitialActivePanel,
  readInitialDependenciesTab,
  readInitialDependencySort,
  readInitialDependencyView,
  readInitialLaneFilter,
  readInitialShowAdvancedControls,
  readInitialShowRestoredViewNotice,
  readInitialStatusFilter,
  type RoadmapGanttPresetSetters,
  type RoadmapGanttUrlSnapshot,
} from '../roadmap-gantt-view-model';
import {
  ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY,
  ROADMAP_TIMELINE_DENSITY_STORAGE_KEY,
  ROADMAP_TIMELINE_SCALE_STORAGE_KEY,
} from '../roadmap-gantt-url-params';
import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttTask,
} from '../roadmap-gantt-mapper';

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

function makeStorage(initial: Record<string, string> = {}): Pick<Storage, 'getItem'> {
  return {
    getItem: (key: string) => (key in initial ? initial[key]! : null),
  };
}

describe('readInitial* helpers', () => {
  it('readInitialDependencySort defaults to from/asc and parses URL', () => {
    expect(readInitialDependencySort(new URLSearchParams())).toEqual({ key: 'from', direction: 'asc' });
    expect(readInitialDependencySort(new URLSearchParams('depSort=to&depDir=desc'))).toEqual({
      key: 'to',
      direction: 'desc',
    });
    expect(readInitialDependencySort(new URLSearchParams('depSort=type'))).toEqual({
      key: 'type',
      direction: 'asc',
    });
    expect(readInitialDependencySort(new URLSearchParams('depSort=garbage'))).toEqual({
      key: 'from',
      direction: 'asc',
    });
  });

  it('readInitialStatusFilter returns "all" for missing/invalid values', () => {
    expect(readInitialStatusFilter(new URLSearchParams())).toBe('all');
    expect(readInitialStatusFilter(new URLSearchParams('status=planned'))).toBe('planned');
    expect(readInitialStatusFilter(new URLSearchParams('status=in-progress'))).toBe('in-progress');
    expect(readInitialStatusFilter(new URLSearchParams('status=done'))).toBe('done');
    expect(readInitialStatusFilter(new URLSearchParams('status=garbage'))).toBe('all');
  });

  it('readInitialLaneFilter prefers explicit lane param, then comma-separated lanes, then "all"', () => {
    expect(readInitialLaneFilter(new URLSearchParams())).toBe('all');
    expect(readInitialLaneFilter(new URLSearchParams('lane=tech_delivery'))).toBe('tech_delivery');
    // When lane carries comma-separated values, the explicit branch returns the raw value as-is.
    expect(readInitialLaneFilter(new URLSearchParams('lane=a,b'))).toBe('a,b');
    // Empty lane param falls through to readPlanLaneFilterKeys (which also reads "lane"); result is "all".
    expect(readInitialLaneFilter(new URLSearchParams('lane='))).toBe('all');
  });

  it('readInitialDependencyView accepts only documented values', () => {
    expect(readInitialDependencyView(new URLSearchParams())).toBe('all');
    expect(readInitialDependencyView(new URLSearchParams('depView=selected'))).toBe('selected');
    expect(readInitialDependencyView(new URLSearchParams('depView=hide-weak'))).toBe('hide-weak');
    expect(readInitialDependencyView(new URLSearchParams('depView=garbage'))).toBe('all');
  });

  it('readInitialActivePanel and readInitialDependenciesTab parse URL', () => {
    expect(readInitialActivePanel(new URLSearchParams())).toBe('timeline');
    expect(readInitialActivePanel(new URLSearchParams('panel=dependencies'))).toBe('dependencies');
    expect(readInitialDependenciesTab(new URLSearchParams())).toBe('graph');
    expect(readInitialDependenciesTab(new URLSearchParams('depTab=table'))).toBe('table');
    expect(readInitialDependenciesTab(new URLSearchParams('depTab=other'))).toBe('graph');
  });

  it('readInitialShowAdvancedControls returns true when any advanced filter is present', () => {
    expect(readInitialShowAdvancedControls(new URLSearchParams())).toBe(false);
    expect(readInitialShowAdvancedControls(new URLSearchParams('owner=alice'))).toBe(true);
    expect(readInitialShowAdvancedControls(new URLSearchParams('cp=1'))).toBe(true);
    expect(readInitialShowAdvancedControls(new URLSearchParams('cp=0'))).toBe(false);
    expect(readInitialShowAdvancedControls(new URLSearchParams('q=  '))).toBe(false);
    expect(readInitialShowAdvancedControls(new URLSearchParams('q=hello'))).toBe(true);
  });

  it('readInitialShowRestoredViewNotice respects URL overrides and storage presence', () => {
    const sp = new URLSearchParams();
    expect(readInitialShowRestoredViewNotice(sp, null)).toBe(false);
    expect(readInitialShowRestoredViewNotice(sp, makeStorage())).toBe(false);

    const storedScale = makeStorage({ [ROADMAP_TIMELINE_SCALE_STORAGE_KEY]: 'day' });
    expect(readInitialShowRestoredViewNotice(sp, storedScale)).toBe(true);

    const storedRange = makeStorage({ [ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY]: '60' });
    expect(readInitialShowRestoredViewNotice(sp, storedRange)).toBe(true);

    const storedDensity = makeStorage({ [ROADMAP_TIMELINE_DENSITY_STORAGE_KEY]: 'compact' });
    expect(readInitialShowRestoredViewNotice(sp, storedDensity)).toBe(true);

    const spWithScale = new URLSearchParams('scale=day');
    expect(readInitialShowRestoredViewNotice(spWithScale, storedScale)).toBe(false);

    const spWithRange = new URLSearchParams('range=30');
    expect(readInitialShowRestoredViewNotice(spWithRange, storedRange)).toBe(false);

    const spWithDensity = new URLSearchParams('density=compact');
    expect(readInitialShowRestoredViewNotice(spWithDensity, storedDensity)).toBe(false);
  });
});

describe('dependencySortReducer', () => {
  it('switches key and resets direction to asc', () => {
    expect(dependencySortReducer({ key: 'from', direction: 'desc' }, 'to')).toEqual({
      key: 'to',
      direction: 'asc',
    });
  });

  it('flips direction when the key is unchanged', () => {
    expect(dependencySortReducer({ key: 'from', direction: 'asc' }, 'from')).toEqual({
      key: 'from',
      direction: 'desc',
    });
    expect(dependencySortReducer({ key: 'from', direction: 'desc' }, 'from')).toEqual({
      key: 'from',
      direction: 'asc',
    });
  });
});

describe('formatDependencySortArrow', () => {
  it('returns empty for non-matching key and arrow for matching', () => {
    expect(formatDependencySortArrow({ key: 'from', direction: 'asc' }, 'to')).toBe('');
    expect(formatDependencySortArrow({ key: 'from', direction: 'asc' }, 'from')).toBe(' ▲');
    expect(formatDependencySortArrow({ key: 'from', direction: 'desc' }, 'from')).toBe(' ▼');
  });
});

describe('buildFocusedTaskAnnouncementMessage', () => {
  const lanes = [
    { id: 'tech_delivery', title: 'Tech delivery' },
    { id: ROADMAP_GANTT_MILESTONE_LANE_ID, title: 'Milestones' },
  ];

  it('returns empty for missing task', () => {
    expect(
      buildFocusedTaskAnnouncementMessage(null, lanes, { template: 'Focused {title}. Lane {lane}.' }),
    ).toBe('');
  });

  it('substitutes title and lane title', () => {
    const msg = buildFocusedTaskAnnouncementMessage(
      buildTask({ id: 'a', title: 'Migrate Postgres', group: 'tech_delivery' }),
      lanes,
      { template: 'Focused {title}. Lane {lane}.' },
    );
    expect(msg).toBe('Focused Migrate Postgres. Lane Tech delivery.');
  });

  it('falls back to group id when no matching lane', () => {
    const lanesWithoutTask = [{ id: 'tech_delivery', title: 'Tech delivery' }];
    const msg = buildFocusedTaskAnnouncementMessage(
      buildTask({ id: 'a', title: 'Misc', group: 'marketing_narrative' }),
      lanesWithoutTask,
      { template: '{title}/{lane}' },
    );
    expect(msg).toBe('Misc/marketing_narrative');
  });
});

describe('applyPresetPatch', () => {
  function makeSetters() {
    const calls: Record<string, unknown[]> = {};
    const wrap = (key: string) =>
      vi.fn((value: unknown) => {
        calls[key] = [...(calls[key] ?? []), value];
      });
    const setters: Required<RoadmapGanttPresetSetters> = {
      setTimeScale: wrap('setTimeScale') as RoadmapGanttPresetSetters['setTimeScale'] & ReturnType<typeof vi.fn>,
      setDayRangeDays: wrap('setDayRangeDays') as never,
      setDependencyTypeFilter: wrap('setDependencyTypeFilter') as never,
      setOwnerFilter: wrap('setOwnerFilter') as never,
      setStatusFilter: wrap('setStatusFilter') as never,
      setLaneFilter: wrap('setLaneFilter') as never,
      setBlockedOnly: wrap('setBlockedOnly') as never,
      setDependencyView: wrap('setDependencyView') as never,
      setCriticalPathOnly: wrap('setCriticalPathOnly') as never,
      setHighlightDependencyChain: wrap('setHighlightDependencyChain') as never,
      setTitleQuery: wrap('setTitleQuery') as never,
      setShowSlack: wrap('setShowSlack') as never,
      setShowScheduleProgress: wrap('setShowScheduleProgress') as never,
      setDependencySort: wrap('setDependencySort') as never,
      setSelectedTaskId: wrap('setSelectedTaskId') as never,
      setFocusedTaskId: wrap('setFocusedTaskId') as never,
      setActivePanel: wrap('setActivePanel') as never,
      setDependenciesTab: wrap('setDependenciesTab') as never,
      setShowAdvancedControls: wrap('setShowAdvancedControls') as never,
      setShowRestoredViewNotice: wrap('setShowRestoredViewNotice') as never,
    };
    return { setters, calls };
  }

  it('RESET_VIEW_PATCH calls all reset setters and resolves first-task sentinel', () => {
    const { setters, calls } = makeSetters();
    applyPresetPatch(RESET_VIEW_PATCH, setters, 'first-task');
    expect(calls.setDependencyTypeFilter).toEqual(['all']);
    expect(calls.setOwnerFilter).toEqual(['all']);
    expect(calls.setStatusFilter).toEqual(['all']);
    expect(calls.setLaneFilter).toEqual(['all']);
    expect(calls.setBlockedOnly).toEqual([false]);
    expect(calls.setDependencyView).toEqual(['all']);
    expect(calls.setCriticalPathOnly).toEqual([false]);
    expect(calls.setTitleQuery).toEqual(['']);
    expect(calls.setHighlightDependencyChain).toEqual([true]);
    expect(calls.setShowSlack).toEqual([false]);
    expect(calls.setShowScheduleProgress).toEqual([true]);
    expect(calls.setDependencySort).toEqual([{ key: 'from', direction: 'asc' }]);
    expect(calls.setSelectedTaskId).toEqual([null]);
    expect(calls.setFocusedTaskId).toEqual(['first-task']);
    expect(calls.setActivePanel).toEqual(['timeline']);
    expect(calls.setDependenciesTab).toEqual(['graph']);
    expect(calls.setShowAdvancedControls).toEqual([false]);
    expect(calls.setShowRestoredViewNotice).toEqual([false]);
  });

  it('RESET_VIEW_PATCH passes null to focused-task setter when no first task is supplied', () => {
    const { setters, calls } = makeSetters();
    applyPresetPatch(RESET_VIEW_PATCH, setters, null);
    expect(calls.setFocusedTaskId).toEqual([null]);
  });

  it('PRESET_BLOCKED_PATCH only calls setters that the patch defines', () => {
    const { setters, calls } = makeSetters();
    applyPresetPatch(PRESET_BLOCKED_PATCH, setters);
    expect(calls.setTimeScale).toEqual(['day']);
    expect(calls.setDayRangeDays).toEqual([30]);
    expect(calls.setDependencyTypeFilter).toEqual(['all']);
    expect(calls.setBlockedOnly).toEqual([true]);
    expect(calls.setDependencyView).toEqual(['hide-weak']);
    expect(calls.setStatusFilter).toEqual(['all']);
    expect(calls.setShowAdvancedControls).toEqual([true]);
    expect(calls.setOwnerFilter).toBeUndefined();
    expect(calls.setLaneFilter).toBeUndefined();
    expect(calls.setSelectedTaskId).toBeUndefined();
  });

  it('PRESET_EXECUTION_PATCH and PRESET_CRITICAL_PATH_PATCH apply their fields', () => {
    {
      const { setters, calls } = makeSetters();
      applyPresetPatch(PRESET_EXECUTION_PATCH, setters);
      expect(calls.setTimeScale).toEqual(['day']);
      expect(calls.setDayRangeDays).toEqual([60]);
      expect(calls.setDependencyTypeFilter).toEqual(['FS']);
      expect(calls.setStatusFilter).toEqual(['in-progress']);
      expect(calls.setShowAdvancedControls).toEqual([true]);
    }
    {
      const { setters, calls } = makeSetters();
      applyPresetPatch(PRESET_CRITICAL_PATH_PATCH, setters);
      expect(calls.setTimeScale).toEqual(['month']);
      expect(calls.setCriticalPathOnly).toEqual([true]);
      expect(calls.setBlockedOnly).toEqual([false]);
      expect(calls.setShowAdvancedControls).toEqual([true]);
    }
  });

  it('does not call setters that are not provided', () => {
    const noop: RoadmapGanttPresetSetters = {};
    expect(() => applyPresetPatch(RESET_VIEW_PATCH, noop, 'x')).not.toThrow();
  });

  it('explicit focused-task value overrides the sentinel', () => {
    const { setters, calls } = makeSetters();
    applyPresetPatch({ focusedTaskId: 'pinned' }, setters, 'first');
    expect(calls.setFocusedTaskId).toEqual(['pinned']);
  });

  it('FOCUSED_FIRST_TIMELINE_TASK_SENTINEL constant is the documented sentinel', () => {
    expect(RESET_VIEW_PATCH.focusedTaskId).toBe(FOCUSED_FIRST_TIMELINE_TASK_SENTINEL);
  });
});

describe('buildRoadmapGanttUrlSearchParams', () => {
  function baseSnapshot(): RoadmapGanttUrlSnapshot {
    return {
      timeScale: 'day',
      dayRangeDays: 60,
      densityMode: 'comfortable',
      dependencyTypeFilter: 'all',
      ownerFilter: 'all',
      statusFilter: 'all',
      laneFilter: 'all',
      blockedOnly: false,
      dependencyView: 'all',
      dependencySort: { key: 'from', direction: 'asc' },
      selectedTaskId: null,
      criticalPathOnly: false,
      highlightDependencyChain: true,
      titleQuery: '',
      showSlack: false,
      showScheduleProgress: true,
      activePanel: 'timeline',
      dependenciesTab: 'graph',
      roadmapToolbarMoreOpen: false,
    };
  }

  it('writes the canonical default snapshot to URL keys', () => {
    const next = buildRoadmapGanttUrlSearchParams(new URLSearchParams(), baseSnapshot());
    expect(next.get('scale')).toBe('day');
    expect(next.get('range')).toBe('60');
    expect(next.get('density')).toBe('comfortable');
    expect(next.get('depType')).toBe('all');
    expect(next.get('depSort')).toBe('from');
    expect(next.get('depDir')).toBe('asc');
    expect(next.get('panel')).toBe('timeline');
    expect(next.get('owner')).toBeNull();
    expect(next.get('status')).toBeNull();
    expect(next.get('lane')).toBeNull();
    expect(next.get('blocked')).toBeNull();
    expect(next.get('depView')).toBeNull();
    expect(next.get('task')).toBeNull();
    expect(next.get('cp')).toBeNull();
    expect(next.get('chain')).toBeNull();
    expect(next.get('q')).toBeNull();
    expect(next.get('slack')).toBeNull();
    expect(next.get('sched')).toBeNull();
    expect(next.get('depTab')).toBeNull();
    expect(next.get('more')).toBeNull();
  });

  it('drops range param when scale is month and writes depTab when active panel is dependencies', () => {
    const snap = { ...baseSnapshot(), timeScale: 'month' as const, activePanel: 'dependencies' as const, dependenciesTab: 'table' as const };
    const next = buildRoadmapGanttUrlSearchParams(new URLSearchParams(), snap);
    expect(next.get('range')).toBeNull();
    expect(next.get('panel')).toBe('dependencies');
    expect(next.get('depTab')).toBe('table');
  });

  it('writes blocked, depView, task, cp, chain=0, q, slack, sched=0, more when toggled', () => {
    const snap: RoadmapGanttUrlSnapshot = {
      ...baseSnapshot(),
      blockedOnly: true,
      dependencyView: 'hide-weak',
      selectedTaskId: 'task-7',
      criticalPathOnly: true,
      highlightDependencyChain: false,
      titleQuery: '  hello  ',
      showSlack: true,
      showScheduleProgress: false,
      ownerFilter: 'alice',
      statusFilter: 'in-progress',
      laneFilter: 'tech_delivery',
      roadmapToolbarMoreOpen: true,
    };
    const next = buildRoadmapGanttUrlSearchParams(new URLSearchParams(), snap);
    expect(next.get('blocked')).toBe('1');
    expect(next.get('depView')).toBe('hide-weak');
    expect(next.get('task')).toBe('task-7');
    expect(next.get('cp')).toBe('1');
    expect(next.get('chain')).toBe('0');
    expect(next.get('q')).toBe('hello');
    expect(next.get('slack')).toBe('1');
    expect(next.get('sched')).toBe('0');
    expect(next.get('owner')).toBe('alice');
    expect(next.get('status')).toBe('in-progress');
    expect(next.get('lane')).toBe('tech_delivery');
    expect(next.get('more')).toBe('1');
  });

  it('returns the same prev reference when nothing changes (no-op short-circuit)', () => {
    const prev = buildRoadmapGanttUrlSearchParams(new URLSearchParams(), baseSnapshot());
    const next = buildRoadmapGanttUrlSearchParams(prev, baseSnapshot());
    expect(next).toBe(prev);
  });

  it('preserves foreign params from prev', () => {
    const prev = new URLSearchParams('hash=42');
    const next = buildRoadmapGanttUrlSearchParams(prev, baseSnapshot());
    expect(next.get('hash')).toBe('42');
  });
});

describe('pickNextActivePanel', () => {
  it('rotates forward and clamps at end', () => {
    expect(pickNextActivePanel('timeline', 'forward')).toBe('dependencies');
    expect(pickNextActivePanel('dependencies', 'forward')).toBe('dependencies');
  });
  it('rotates backward and clamps at start', () => {
    expect(pickNextActivePanel('dependencies', 'backward')).toBe('timeline');
    expect(pickNextActivePanel('timeline', 'backward')).toBe('timeline');
  });
});
