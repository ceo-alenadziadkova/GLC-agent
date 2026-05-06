import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useStrategyConstraints } from '../useStrategyConstraints';
import type { StrategyRoadmap } from '../../data/audit/contracts/report/report-domain.types';

const patchStrategyLabContext = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    patchStrategyLabContext: (...args: unknown[]) => patchStrategyLabContext(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../lib/strategy-lab-context-cache', () => ({
  applyStrategyLabContextPatchToAuditCache: vi.fn(),
}));

function wrap(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const strategyBase: StrategyRoadmap = {
  id: 'sr-1',
  audit_id: 'a1',
  status: 'ready',
  executive_summary: null,
  overall_score: null,
  quick_wins: [],
  medium_term: [],
  strategic: [],
  scorecard: [],
  effective_constraints: {
    company_stage: 'growth',
    budget_band: 'unknown',
    team_scale: 'unknown',
  },
};

describe('useStrategyConstraints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs drafts from strategy effective_constraints', async () => {
    const qc = new QueryClient();
    const { result } = renderHook(
      () =>
        useStrategyConstraints({
          auditId: 'a1',
          strategy: strategyBase,
          isClient: false,
          queryClient: qc,
          reload: vi.fn(),
        }),
      { wrapper: wrap(qc) },
    );
    await waitFor(() => {
      expect(result.current.constraintStageDraft).toBe('growth');
    });
  });

  it('persists overrides when auditId is set', async () => {
    patchStrategyLabContext.mockResolvedValue({
      strategy_lab_context: { company_stage: 'scale', budget_band: null, team_scale: null },
    });
    const qc = new QueryClient();
    const reload = vi.fn();
    const { result } = renderHook(
      () =>
        useStrategyConstraints({
          auditId: 'a1',
          strategy: strategyBase,
          isClient: false,
          queryClient: qc,
          reload,
        }),
      { wrapper: wrap(qc) },
    );
    await act(async () => {
      await result.current.handleSaveConstraintOverrides();
    });
    expect(patchStrategyLabContext).toHaveBeenCalledWith('a1', {
      company_stage: 'growth',
      budget_band: 'unknown',
      team_scale: 'unknown',
    });
  });
});
