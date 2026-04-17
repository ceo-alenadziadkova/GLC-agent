import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

import { applyWordingActionRpcBatch } from '../routes/intake-trace-tool/repositories/intake-trace-wording.repository.js';

describe('intake trace wording rpc fallback policy', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('returns fallback for expected infra errors', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '42883', message: 'function does not exist' },
    });

    const result = await applyWordingActionRpcBatch(
      'user-1',
      'publish',
      ['q1'],
      '2026-01-01T00:00:00.000Z',
    );

    expect(result.status).toBe('fallback');
    if (result.status === 'fallback') {
      expect(result.reason).toContain('function');
    }
  });

  it('throws for unexpected rpc errors', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'internal error' },
    });

    await expect(
      applyWordingActionRpcBatch('user-1', 'rollback', ['q1'], '2026-01-01T00:00:00.000Z'),
    ).rejects.toThrow('internal error');
  });

  it('returns applied ids for successful rpc result', async () => {
    rpcMock.mockResolvedValue({
      data: [{ question_id: 'q1' }, { question_id: 'q2' }, { question_id: null }],
      error: null,
    });

    const result = await applyWordingActionRpcBatch(
      'user-1',
      'publish',
      ['q1', 'q2'],
      '2026-01-01T00:00:00.000Z',
    );

    expect(result).toEqual({ status: 'ok', appliedIds: ['q1', 'q2'] });
  });
});
