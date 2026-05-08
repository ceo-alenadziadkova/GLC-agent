import { describe, expect, it } from 'vitest';

import { applyIntelligenceInferredSelections } from './apply-intelligence-inferred';

describe('applyIntelligenceInferredSelections', () => {
  it('applies selected low/medium cells and overwrites prior answers when the user approved in confirm', () => {
    const next = applyIntelligenceInferredSelections(
      {
        a1: { value: 'existing', source: 'consultant' },
        b1: { value: null, source: 'unknown' },
      },
      [
        { questionId: 'a1', confidence: 'medium', suggestedValue: 'x' },
        { questionId: 'b1', confidence: 'medium', suggestedValue: 'icp text' },
        { questionId: 'c1', confidence: 'low', suggestedValue: 'nope' },
      ],
      new Set(['a1', 'b1', 'c1']),
      'consultant',
    );
    expect(next.a1).toEqual({ value: 'x', source: 'consultant' });
    expect(next.b1).toEqual({ value: 'icp text', source: 'consultant' });
    expect(next.c1).toEqual({ value: 'nope', source: 'consultant' });
  });

  it('leaves a row unchanged when not selected', () => {
    const next = applyIntelligenceInferredSelections(
      { a1: { value: 'keep', source: 'consultant' } },
      [{ questionId: 'a1', confidence: 'medium', suggestedValue: 'x' }],
      new Set(),
      'consultant',
    );
    expect(next.a1).toEqual({ value: 'keep', source: 'consultant' });
  });
});
