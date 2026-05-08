import { describe, expect, it } from 'vitest';

import type { AuditTimelineDto } from '../../data/api/orchestration-types';
import {
  buildOutgoingIncoming,
  buildPriorityMap,
  transitivePredecessors,
  transitiveSuccessors,
} from '../roadmap-gantt-graph-helpers';

describe('roadmap-gantt-graph-helpers', () => {
  it('buildOutgoingIncoming indexes edges by from and to', () => {
    const { outgoing, incoming } = buildOutgoingIncoming([
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ]);
    expect(outgoing.get('a')).toEqual(['b']);
    expect(incoming.get('c')).toEqual(['b']);
  });

  it('walks transitive predecessors and successors', () => {
    const { outgoing, incoming } = buildOutgoingIncoming([
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ]);
    expect([...transitivePredecessors('c', incoming)].sort()).toEqual(['a', 'b']);
    expect([...transitiveSuccessors('a', outgoing)].sort()).toEqual(['b', 'c']);
  });

  it('prefers top_priorities over legacy top_7d/top_30d when present', () => {
    const timeline = {
      top_priorities: [{ bucket: '30d' as const, action_id: 'x', reason_code: 'r' }],
      top_7d: ['x'],
      top_30d: [],
    } as unknown as AuditTimelineDto;
    const map = buildPriorityMap(timeline);
    expect(map.get('x')).toBe('30d');
  });

  it('falls back to top_7d and top_30d lists', () => {
    const timeline = {
      top_7d: ['a'],
      top_30d: ['b'],
    } as unknown as AuditTimelineDto;
    const map = buildPriorityMap(timeline);
    expect(map.get('a')).toBe('7d');
    expect(map.get('b')).toBe('30d');
  });
});
