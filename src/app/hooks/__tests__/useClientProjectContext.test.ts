import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getClientProjectContext = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    getClientProjectContext: (...a: unknown[]) => getClientProjectContext(...a),
  },
  ApiError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { useClientProjectContext } from '../useClientProjectContext';

afterEach(() => {
  getClientProjectContext.mockReset();
});

describe('useClientProjectContext', () => {
  it('fetches when auditId is set and enabled', async () => {
    getClientProjectContext.mockResolvedValue({
      context: { version: 1, auditId: 'a1', bankResponses: {}, projectNarrative: null, auditEnrichment: {}, updatedAt: '2026-01-01T00:00:00.000Z' },
      precheck: {},
    });
    const { result } = renderHook(() =>
      useClientProjectContext({ auditId: 'a1', enabled: true, briefSyncKey: '{}' }),
    );
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    if (result.current.state.status === 'ready') {
      expect(result.current.state.context?.auditId).toBe('a1');
    }
    expect(getClientProjectContext).toHaveBeenCalledWith('a1');
  });

  it('stays idle when disabled', () => {
    getClientProjectContext.mockResolvedValue({ context: null, precheck: {} });
    const { result } = renderHook(() =>
      useClientProjectContext({ auditId: 'a1', enabled: false, briefSyncKey: '{}' }),
    );
    expect(result.current.state.status).toBe('idle');
    expect(getClientProjectContext).not.toHaveBeenCalled();
  });

  it('keeps ready data while refetching (no loading flash after first success)', async () => {
    const payload = {
      context: {
        version: 1,
        auditId: 'a1',
        bankResponses: {},
        projectNarrative: null,
        auditEnrichment: {},
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      precheck: { byKey: { performance_lighthouse: { performance_score: 50 } } } as Record<string, unknown>,
    };
    getClientProjectContext
      .mockResolvedValueOnce(payload)
      .mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(payload), 40);
          }),
      );
    const { result } = renderHook(() =>
      useClientProjectContext({ auditId: 'a1', enabled: true, briefSyncKey: '{}' }),
    );
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    if (result.current.state.status === 'ready') {
      expect(result.current.state.precheck).toBeDefined();
    }
    getClientProjectContext.mockClear();
    getClientProjectContext.mockResolvedValue(payload);

    void result.current.refetch();
    await waitFor(() => {
      if (result.current.state.status !== 'ready') {
        return false;
      }
      return result.current.state.isRefreshing === true;
    });
    expect(result.current.state.status).toBe('ready');
    if (result.current.state.status === 'ready') {
      expect(result.current.state.isRefreshing).toBe(true);
      expect(result.current.state.precheck).toBeDefined();
    }
    await waitFor(() => {
      if (result.current.state.status !== 'ready') {
        return false;
      }
      return result.current.state.isRefreshing === false;
    });
  });
});
