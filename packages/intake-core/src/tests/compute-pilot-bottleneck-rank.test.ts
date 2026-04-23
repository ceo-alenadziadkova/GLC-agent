import { describe, expect, it } from 'vitest';

import { computePilotCriticalBottleneckRank } from '../core/evaluate-critical-signals.js';

const visible = new Set(['a2', 'a5', 'f1', 'f2', 'd2', 'd_closing_flow', 'a11', 'a12']);

function eligible() {
  return { eligible: visible };
}

describe('computePilotCriticalBottleneckRank', () => {
  it('returns null when industry is not answered', () => {
    const r = computePilotCriticalBottleneckRank({ responses: {}, plan: eligible() });
    expect(r).toBeNull();
  });

  it('returns 0 (unknown) when many signals are unanswered (E-commerce path)', () => {
    const r = computePilotCriticalBottleneckRank({
      responses: { a2: { value: 'E-commerce', source: 'client' } },
      plan: eligible(),
    });
    expect(r).toBe(0);
  });
});
