import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useDomainBenchmarks } from '../useDomainBenchmarks';

const getLatestSnapshot = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    getLatestSnapshot: (...args: unknown[]) => getLatestSnapshot(...args),
  },
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useDomainBenchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLatestSnapshot.mockResolvedValue(null);
  });

  it('loads snapshots per domain when enabled', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDomainBenchmarks({ enabled: true, industry: 'saas' }), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => {
      expect(getLatestSnapshot).toHaveBeenCalled();
    });
    expect(result.current).toBeDefined();
  });
});
