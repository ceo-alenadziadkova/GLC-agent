import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

// ─── Hoisted mocks (available before vi.mock hoisting) ─────────────────────

const { mockGetAudit } = vi.hoisted(() => ({
  mockGetAudit: vi.fn(),
}));

vi.mock('../../data/apiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/apiService')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getAudit: mockGetAudit,
    },
  };
});

// Import hook AFTER mock
import { useAudit } from '../useAudit';

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function TestWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAudit', () => {
  it('sets loading while fetching when there is no cache', async () => {
    mockGetAudit.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAudit('audit-123'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.audit).toBeNull();
  });

  it('sets audit and clears loading on successful fetch', async () => {
    const fakeAudit = { meta: { id: 'audit-123', status: 'completed' }, domains: {} };
    mockGetAudit.mockResolvedValue(fakeAudit);

    const { result } = renderHook(() => useAudit('audit-123'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.audit).toEqual(fakeAudit);
    expect(result.current.error).toBeNull();
  });

  it('sets error and clears loading when fetch fails', async () => {
    mockGetAudit.mockRejectedValue(new Error('Audit not found'));

    const { result } = renderHook(() => useAudit('audit-123'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Audit not found');
    expect(result.current.audit).toBeNull();
  });
});
