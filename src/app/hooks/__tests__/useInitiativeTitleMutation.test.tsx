import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useInitiativeTitleMutation } from '../useInitiativeTitleMutation';
import { api } from '../../data/apiService';
import { invalidatePlanWorkspaceQueries } from '../../lib/plan-workspace-queries';

vi.mock('../../data/apiService', () => ({
  api: {
    patchPipelinePhaseResult: vi.fn(),
  },
}));

vi.mock('../../lib/plan-workspace-queries', () => ({
  invalidatePlanWorkspaceQueries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useInitiativeTitleMutation', () => {
  beforeEach(() => {
    vi.mocked(api.patchPipelinePhaseResult).mockReset();
    vi.mocked(invalidatePlanWorkspaceQueries).mockClear();
  });

  it('patches strategy phase with preserved fields and invalidates plan workspace', async () => {
    vi.mocked(api.patchPipelinePhaseResult).mockResolvedValue({ ok: true, phase_number: 7, updated: true });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useInitiativeTitleMutation({ auditId: 'audit-1' }), {
      wrapper: wrapper(qc),
    });

    await result.current.mutateAsync({
      bucket: 'quick_wins',
      initiative: {
        id: 'i1',
        title: 'Old',
        description: 'Desc body',
        board_identity_key: 'kw:1',
      },
      title: 'New title',
    });

    expect(api.patchPipelinePhaseResult).toHaveBeenCalledWith(
      'audit-1',
      expect.any(Number),
      expect.objectContaining({
        result: {
          quick_wins: [
            expect.objectContaining({
              id: 'i1',
              title: 'New title',
              description: 'Desc body',
              board_identity_key: 'kw:1',
            }),
          ],
        },
      }),
    );
    await waitFor(() => {
      expect(invalidatePlanWorkspaceQueries).toHaveBeenCalledWith(qc, 'audit-1');
    });
  });
});
