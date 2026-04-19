import { describe, expect, it } from 'vitest';

import type { StrategyInitiative } from '../../data/auditTypes';
import { compareStrategyInitiatives, sortStrategyInitiatives } from '../strategy-lab-sort';

function base(p: Partial<StrategyInitiative> & Pick<StrategyInitiative, 'id' | 'title'>): StrategyInitiative {
  return {
    description: 'd',
    impact: 'medium',
    effort: 'medium',
    ...p,
  };
}

describe('strategy-lab-sort', () => {
  it('orders by impact high first', () => {
    const a = base({ id: '1', title: 'A', impact: 'low' });
    const b = base({ id: '2', title: 'B', impact: 'high' });
    expect(compareStrategyInitiatives(a, b, 'impact')).toBeGreaterThan(0);
  });

  it('roi mode prefers high impact and low effort', () => {
    const hiEffort = base({ id: '1', title: 'H', impact: 'high', effort: 'high' });
    const balanced = base({ id: '2', title: 'B', impact: 'high', effort: 'low' });
    const sorted = sortStrategyInitiatives([hiEffort, balanced], 'roi');
    expect(sorted[0].id).toBe('2');
  });
});
