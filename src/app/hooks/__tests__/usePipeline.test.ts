import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const {
  mockGetPipelineStatus,
  mockRunNextPhase,
  invalidateAuditRelatedQueriesMock,
  invalidateAuditsListsAndDashboardMock,
} = vi.hoisted(() => ({
  mockGetPipelineStatus: vi.fn(),
  mockRunNextPhase: vi.fn(),
  invalidateAuditRelatedQueriesMock: vi.fn(),
  invalidateAuditsListsAndDashboardMock: vi.fn(),
}));

vi.mock('../../data/apiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/apiService')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getPipelineStatus: mockGetPipelineStatus,
      runNextPhase: mockRunNextPhase,
    },
  };
});

vi.mock('../../lib/glc-query-client', () => ({
  getGlcQueryClient: vi.fn(() => ({ __test: true })),
}));

vi.mock('../../lib/glc-invalidate-queries', () => ({
  invalidateAuditRelatedQueries: invalidateAuditRelatedQueriesMock,
  invalidateAuditsListsAndDashboard: invalidateAuditsListsAndDashboardMock,
}));

vi.mock('../../lib/supabase', () => {
  const channelApi = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };
  return {
    supabase: {
      channel: vi.fn(() => channelApi),
    },
  };
});

import { usePipeline } from '../usePipeline';

const PIPELINE_STATUS_FIXTURE = {
  status: 'review',
  current_phase: 4,
  tokens_used: 100,
  token_budget: 5000,
  execution_plan: null,
  events: [],
  reviews: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPipelineStatus.mockResolvedValue(PIPELINE_STATUS_FIXTURE);
  mockRunNextPhase.mockResolvedValue({ status: 'running', phase: 5 });
});

describe('usePipeline', () => {
  it('invalidates audit details and dashboards after runNextPhase', async () => {
    const { result } = renderHook(() => usePipeline('audit-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.runNextPhase();
    });

    expect(invalidateAuditRelatedQueriesMock).toHaveBeenCalledWith(expect.any(Object), 'audit-1');
    expect(invalidateAuditsListsAndDashboardMock).toHaveBeenCalledWith(expect.any(Object));
  });
});
