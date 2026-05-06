import { describe, it, expect } from 'vitest';
import type { PipelineEvent } from '../data/auditTypes';
import { comparePipelineEventsNewestFirst } from './pipeline-event-sort';

function ev(partial: Partial<PipelineEvent> & Pick<PipelineEvent, 'id' | 'created_at'>): PipelineEvent {
  return {
    audit_id: 'a1',
    phase: 1,
    event_type: 'log',
    message: 'm',
    data: {},
    ...partial,
  } as PipelineEvent;
}

describe('comparePipelineEventsNewestFirst', () => {
  it('orders by event_seq when both are present (higher seq first)', () => {
    const older = ev({
      id: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      event_seq: 10,
    });
    const newer = ev({
      id: 2,
      created_at: '2026-01-01T00:00:00.000Z',
      event_seq: 11,
    });
    const sorted = [older, newer].sort(comparePipelineEventsNewestFirst);
    expect(sorted[0]!.id).toBe(2);
  });

  it('falls back to created_at when event_seq ties or is missing', () => {
    const a = ev({ id: 1, created_at: '2026-01-01T00:00:01.000Z' });
    const b = ev({ id: 2, created_at: '2026-01-01T00:00:02.000Z' });
    expect([a, b].sort(comparePipelineEventsNewestFirst)[0]!.id).toBe(2);
    const sameT = ev({ id: 10, created_at: '2026-01-01T00:00:00.000Z' });
    const sameT2 = ev({ id: 20, created_at: '2026-01-01T00:00:00.000Z' });
    expect([sameT, sameT2].sort(comparePipelineEventsNewestFirst)[0]!.id).toBe(20);
  });
});
