import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { ORCHESTRATION_LAB_FOCUS_QUERY_KEY, ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE } from '../../config/orchestration-ui-limits';
import { useOrchestrationFocusScroll } from '../useOrchestrationFocusScroll';

vi.mock('../../config/app-feature-flags', () => ({
  APP_FEATURE_FLAGS: { orchestrationRoadmapUiEnabled: true },
}));

describe('useOrchestrationFocusScroll', () => {
  const setSearchParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('strips roadmap focus param for consultant session', async () => {
    const searchParams = {
      get: (k: string) => (k === ORCHESTRATION_LAB_FOCUS_QUERY_KEY ? ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE : null),
    };
    renderHook(() =>
      useOrchestrationFocusScroll({
        searchParams,
        setSearchParams,
        isClient: false,
      }),
    );
    await waitFor(() => {
      expect(setSearchParams).toHaveBeenCalled();
    });
  });

  it('does nothing for portal client', () => {
    const searchParams = {
      get: (k: string) => (k === ORCHESTRATION_LAB_FOCUS_QUERY_KEY ? ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE : null),
    };
    renderHook(() =>
      useOrchestrationFocusScroll({
        searchParams,
        setSearchParams,
        isClient: true,
      }),
    );
    expect(setSearchParams).not.toHaveBeenCalled();
  });
});
