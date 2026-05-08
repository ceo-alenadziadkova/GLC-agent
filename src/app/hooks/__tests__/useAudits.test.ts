import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '../../lib/tanstack-react-query';
import { createElement, type ReactNode } from 'react';
import type { AuditMeta } from '../../data/audit/contracts/core/audit-meta.types';

const { mockListAudits, mockDeleteAudit } = vi.hoisted(() => ({
  mockListAudits: vi.fn(),
  mockDeleteAudit: vi.fn(),
}));

vi.mock('../../data/apiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/apiService')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      listAudits: mockListAudits,
      deleteAudit: mockDeleteAudit,
    },
  };
});

vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

import { useAudits } from '../useAudits';

function makeAudit(id: string): AuditMeta {
  return {
    id,
    user_id: 'user-1',
    client_id: null,
    company_url: `https://${id}.example.com`,
    company_name: `Company ${id}`,
    industry: 'SaaS',
    status: 'completed',
    current_phase: 7,
    overall_score: 4.2,
    product_mode: 'full',
    execution_plan: null,
    token_budget: 5000,
    tokens_used: 1000,
    snapshot_token: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function TestWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAudits', () => {
  it('accumulates pages and exposes hasMore/loadMore correctly', async () => {
    mockListAudits
      .mockResolvedValueOnce({
        data: [makeAudit('a1')],
        total: 3,
        limit: 2,
        offset: 0,
      })
      .mockResolvedValueOnce({
        data: [makeAudit('a2'), makeAudit('a3')],
        total: 3,
        limit: 2,
        offset: 1,
      });

    const { result } = renderHook(() => useAudits(2), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.audits).toHaveLength(1);
    expect(result.current.total).toBe(3);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.audits).toHaveLength(3));
    expect(result.current.hasMore).toBe(false);
  });
});
