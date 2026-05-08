import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const {
  mockGetPipelineStatus,
  mockRunNextPhase,
  invalidateAuditRelatedQueriesMock,
  invalidateAuditsListsAndDashboardMock,
  realtimeHandlers,
} = vi.hoisted(() => ({
  mockGetPipelineStatus: vi.fn(),
  mockRunNextPhase: vi.fn(),
  invalidateAuditRelatedQueriesMock: vi.fn(),
  invalidateAuditsListsAndDashboardMock: vi.fn(),
  realtimeHandlers: {
    pipelineEventsInsert: null as null | ((payload: { new: unknown }) => void),
    auditsUpdate: null as null | ((payload: { new: unknown }) => void),
  },
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

vi.mock('../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => {
      const api = {
        on: vi.fn(
          (
            _event: string,
            config: { table?: string },
            handler: (payload: { new: unknown }) => void,
          ) => {
            if (config.table === 'pipeline_events') realtimeHandlers.pipelineEventsInsert = handler;
            if (config.table === 'audits') realtimeHandlers.auditsUpdate = handler;
            return api;
          },
        ),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      };
      return api;
    }),
  },
}));

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
  realtimeHandlers.pipelineEventsInsert = null;
  realtimeHandlers.auditsUpdate = null;
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

  it('does not apply error or loading teardown from superseded loads after auditId changes', async () => {
    const settles: Array<{
      resolve: (v: typeof PIPELINE_STATUS_FIXTURE) => void;
      reject: (e: unknown) => void;
    }> = [];

    mockGetPipelineStatus.mockImplementation(
      async () =>
        new Promise((resolve, reject) => {
          settles.push({
            resolve: resolve as (v: typeof PIPELINE_STATUS_FIXTURE) => void,
            reject,
          });
        }),
    );

    const { result, rerender } = renderHook(({ aid }: { aid: string }) => usePipeline(aid), {
      initialProps: { aid: 'audit-1' },
    });

    await waitFor(() => expect(settles.length).toBe(1));

    rerender({ aid: 'audit-2' });

    await waitFor(() => expect(settles.length).toBe(2));

    await act(async () => {
      settles[0].reject(new Error('stale_audit_1_failure'));
    });
    expect(result.current.error).toBeNull();

    await act(async () => {
      settles[1].resolve(PIPELINE_STATUS_FIXTURE);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.state).not.toBeNull();
  });

  it('clears snapshot errors and resets next-phase busy when switching auditId before loads settle', async () => {
    const settles: Array<{ resolve: (v: typeof PIPELINE_STATUS_FIXTURE) => void }> = [];

    mockGetPipelineStatus.mockImplementation(
      async () =>
        new Promise(resolve => {
          settles.push({
            resolve: resolve as (v: typeof PIPELINE_STATUS_FIXTURE) => void,
          });
        }),
    );

    const { result, rerender } = renderHook(({ aid }: { aid: string }) => usePipeline(aid), {
      initialProps: { aid: 'audit-1' },
    });

    await waitFor(() => expect(settles.length).toBe(1));

    rerender({ aid: 'audit-2' });

    await waitFor(() => expect(settles.length).toBe(2));

    expect(result.current.state).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.runNextPhaseBusy).toBe(false);

    await act(async () => {
      settles[1].resolve({ ...PIPELINE_STATUS_FIXTURE, current_phase: 7 });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state?.current_phase).toBe(7);
  });

  it('refetches pipeline status when Realtime fires before the initial load snapshot exists', async () => {
    const settles: Array<{ resolve: (v: typeof PIPELINE_STATUS_FIXTURE) => void }> = [];

    mockGetPipelineStatus.mockImplementation(
      async () =>
        new Promise(resolve => {
          settles.push({
            resolve: resolve as (v: typeof PIPELINE_STATUS_FIXTURE) => void,
          });
        }),
    );

    const { result } = renderHook(() => usePipeline('audit-rt'));

    await waitFor(() => expect(settles.length).toBe(1));
    await waitFor(() => expect(realtimeHandlers.pipelineEventsInsert).not.toBeNull());

    const row = {
      id: 'evt-1',
      audit_id: 'audit-rt',
      phase: 2,
      event_type: 'log',
      message: 'hello',
      data: {},
      created_at: new Date().toISOString(),
    };

    await act(async () => {
      realtimeHandlers.pipelineEventsInsert?.({ new: row });
    });

    await waitFor(() => expect(settles.length).toBe(2));
    expect(mockGetPipelineStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      settles[0].resolve(PIPELINE_STATUS_FIXTURE);
      settles[1].resolve(PIPELINE_STATUS_FIXTURE);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state).not.toBeNull();
  });
});
