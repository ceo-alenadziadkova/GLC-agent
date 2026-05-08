import { describe, expect, it } from 'vitest';

import { computeCpmSchedule } from '../roadmap-gantt-cpm';

const DAY_MS = 86_400_000;

describe('computeCpmSchedule', () => {
  it('returns null when dependencies contain a cycle', () => {
    const tasks = [
      { id: 'x', start_time: 0, end_time: DAY_MS },
      { id: 'y', start_time: DAY_MS, end_time: 2 * DAY_MS },
    ];
    const deps = [
      { from: 'x', to: 'y', kind: 'FS' as const },
      { from: 'y', to: 'x', kind: 'FS' as const },
    ];
    expect(computeCpmSchedule(tasks, deps)).toBeNull();
  });

  it('computes FS chain forward pass so successor ES follows predecessor EF', () => {
    const tasks = [
      { id: 'a', start_time: 0, end_time: DAY_MS },
      { id: 'b', start_time: 0, end_time: 2 * DAY_MS },
    ];
    const deps = [{ from: 'a', to: 'b', kind: 'FS' as const }];
    const cpm = computeCpmSchedule(tasks, deps);
    expect(cpm).not.toBeNull();
    expect(cpm!.get('b')!.earlyStartMs).toBeGreaterThanOrEqual(DAY_MS);
  });

  it('matches totalFloatMs and freeFloatMs on an unconstrained sink task', () => {
    const tasks = [
      { id: 'a', start_time: 0, end_time: DAY_MS },
      { id: 'b', start_time: DAY_MS, end_time: 2 * DAY_MS },
    ];
    const deps = [{ from: 'a', to: 'b', kind: 'FS' as const }];
    const cpm = computeCpmSchedule(tasks, deps)!;
    const sink = cpm.get('b')!;
    expect(sink.freeFloatMs).toBe(sink.totalFloatMs);
  });
});
