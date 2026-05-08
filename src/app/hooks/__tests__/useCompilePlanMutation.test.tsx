import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useCompilePlanMutation } from '../useCompilePlanMutation';

const postOrchestrationCompile = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    postOrchestrationCompile: (...args: unknown[]) => postOrchestrationCompile(...args),
  },
}));

function wrap(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useCompilePlanMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postOrchestrationCompile.mockResolvedValue({ manifest_snapshot_id: 'snap-1', pack: {} });
  });

  it('invokes compile API with audit id', async () => {
    const qc = new QueryClient();
    const settled = vi.fn();
    const { result } = renderHook(() => useCompilePlanMutation({ auditId: 'a1', onSettled: settled }), {
      wrapper: wrap(qc),
    });
    await act(async () => {
      await result.current.mutateAsync({ selected_domains: ['tech_infrastructure'], depth: 'standard' } as never);
    });
    await waitFor(() => {
      expect(postOrchestrationCompile).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({ selected_domains: ['tech_infrastructure'] }),
      );
    });
    expect(settled).toHaveBeenCalled();
  });
});
