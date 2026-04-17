import { describe, expect, it } from 'vitest';
import { selectFilteredQuestionIds, toggleValueInSet } from './selectors';

describe('intake-plan-question-trace selectors', () => {
  it('filters by query and selected layer/state', () => {
    const ids = selectFilteredQuestionIds({
      sortedIds: ['a1', 'a2'],
      reasonsById: {
        a1: [{ questionId: 'a1', layer: 'canon', state: 'visible', code: 'c1' }],
        a2: [{ questionId: 'a2', layer: 'policy', state: 'hidden', code: 'p1' }],
      },
      query: 'a',
      layerFilter: new Set(['canon']),
      stateFilter: new Set(['visible']),
    });
    expect(ids).toEqual(['a1']);
  });

  it('toggles set membership deterministically', () => {
    const base = new Set(['x']);
    const removed = toggleValueInSet(base, 'x', false);
    const added = toggleValueInSet(removed, 'y', true);
    expect([...added]).toEqual(['y']);
  });
});
