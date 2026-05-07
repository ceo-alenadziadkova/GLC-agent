import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PIPELINE_AUDIT_ORCHESTRATOR_STATUS } from '../config/pipeline-status.js';

const calls = vi.hoisted(() => ({
  updatePatch: null as Record<string, unknown> | null,
  eq: [] as Array<[string, unknown]>,
  neq: [] as Array<[string, unknown]>,
  updateMode: false,
  selectResult: {
    data: [{ id: 'audit-1' }] as Array<{ id: string }> | null,
    error: null as { message: string; code?: string } | null,
  },
  singleResult: {
    data: { status: 'running' } as { status: string } | null,
    error: null as { message: string; code?: string } | null,
  },
}));

const queryBuilder = vi.hoisted(() => {
  const builder = {
    update: vi.fn((patch: Record<string, unknown>) => {
      calls.updateMode = true;
      calls.updatePatch = patch;
      return builder;
    }),
    select: vi.fn(() => (calls.updateMode ? Promise.resolve(calls.selectResult) : builder)),
    eq: vi.fn((column: string, value: unknown) => {
      calls.eq.push([column, value]);
      return builder;
    }),
    neq: vi.fn((column: string, value: unknown) => {
      calls.neq.push([column, value]);
      return builder;
    }),
    single: vi.fn(async () => calls.singleResult),
  };
  return builder;
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => queryBuilder),
  },
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { assertAuditNotCancelled, updateAuditIfNotCancelled } from '../services/pipeline/orchestrator/audit-cancel-guard.js';
import { PipelineCancelledError } from '../services/pipeline/orchestrator/pipeline-cancelled.error.js';

describe('audit cancel guard', () => {
  beforeEach(() => {
    calls.updatePatch = null;
    calls.eq = [];
    calls.neq = [];
    calls.updateMode = false;
    calls.selectResult = { data: [{ id: 'audit-1' }], error: null };
    calls.singleResult = { data: { status: 'running' }, error: null };
    queryBuilder.update.mockClear();
    queryBuilder.select.mockClear();
    queryBuilder.eq.mockClear();
    queryBuilder.neq.mockClear();
    queryBuilder.single.mockClear();
  });

  it('updates only when the audit is not cancelled', async () => {
    await expect(updateAuditIfNotCancelled('audit-1', { status: 'running' })).resolves.toBe(true);

    expect(calls.updatePatch).toEqual({ status: 'running' });
    expect(calls.eq).toContainEqual(['id', 'audit-1']);
    expect(calls.neq).toContainEqual(['status', PIPELINE_AUDIT_ORCHESTRATOR_STATUS.cancelled]);
  });

  it('returns false when the conditional update affects no rows', async () => {
    calls.selectResult = { data: [], error: null };

    await expect(updateAuditIfNotCancelled('audit-1', { status: 'running' })).resolves.toBe(false);
  });

  it('throws when the conditional update returns a database error', async () => {
    calls.selectResult = {
      data: null,
      error: { message: 'statement timeout', code: '57014' },
    };

    await expect(updateAuditIfNotCancelled('audit-1', { status: 'running' })).rejects.toThrow(
      'Failed to update audit: statement timeout',
    );
  });

  it('throws PipelineCancelledError when the audit is cancelled', async () => {
    calls.singleResult = {
      data: { status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.cancelled },
      error: null,
    };

    await expect(assertAuditNotCancelled('audit-1')).rejects.toBeInstanceOf(PipelineCancelledError);
  });

  it('throws on cancel-state read failures instead of proceeding under uncertainty', async () => {
    calls.singleResult = {
      data: null,
      error: { message: 'connection reset', code: 'ECONNRESET' },
    };

    await expect(assertAuditNotCancelled('audit-1')).rejects.toThrow(
      'Failed to verify audit cancel state: connection reset',
    );
  });
});
