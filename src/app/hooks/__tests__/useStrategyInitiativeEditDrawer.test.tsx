import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useStrategyInitiativeEditDrawer } from '../useStrategyInitiativeEditDrawer';

const minimalInitiative = {
  id: 'init-1',
  title: 'Test',
  description: 'Desc',
  impact: 'high' as const,
  effort: 'low' as const,
};

describe('useStrategyInitiativeEditDrawer', () => {
  it('opens drawer with bucket and target', () => {
    const { result } = renderHook(() => useStrategyInitiativeEditDrawer());
    expect(result.current.initiativeEditOpen).toBe(false);
    act(() => {
      result.current.openInitiativeEditor('quick_wins', minimalInitiative);
    });
    expect(result.current.initiativeEditOpen).toBe(true);
    expect(result.current.initiativeEditBucket).toBe('quick_wins');
    expect(result.current.initiativeEditTarget).toEqual(minimalInitiative);
  });
});
