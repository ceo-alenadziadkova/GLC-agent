import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  eq: [] as Array<[string, unknown]>,
  orCount: 0,
  selectResult: {
    data: [{ id: 'a1' }] as Array<{ id: string }> | null,
    error: null as { message: string; code?: string } | null,
  },
  singleResult: {
    data: { id: 'a1' } as Record<string, unknown> | null,
    error: null as { message: string; code?: string } | null,
  },
  updateMode: false,
}));

const queryBuilder = vi.hoisted(() => {
  const builder = {
    update: vi.fn(() => {
      calls.updateMode = true;
      return builder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      calls.eq.push([column, value]);
      return builder;
    }),
    in: vi.fn(() => builder),
    or: vi.fn(() => {
      calls.orCount += 1;
      return builder;
    }),
    select: vi.fn(() => (calls.updateMode ? Promise.resolve(calls.selectResult) : builder)),
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

import {
  claimPipelineRetry,
  claimPipelineFinalizeAfterLastGate,
  claimPipelineNext,
  claimPipelineResumeFromCancelled,
  claimPipelineStart,
  claimPipelineStop,
  fetchAuditForNext,
} from '../services/pipeline-routes/repository/pipeline-audit.repository.js';
import { PIPELINE_RETRY_CLAIM_OWNERSHIP } from '../config/pipeline-retry-claim.js';

describe('pipeline audit repository claim scoping', () => {
  beforeEach(() => {
    calls.eq = [];
    calls.orCount = 0;
    calls.selectResult = { data: [{ id: 'a1' }], error: null };
    calls.singleResult = { data: { id: 'a1' }, error: null };
    calls.updateMode = false;
    queryBuilder.update.mockClear();
    queryBuilder.eq.mockClear();
    queryBuilder.in.mockClear();
    queryBuilder.or.mockClear();
    queryBuilder.select.mockClear();
    queryBuilder.single.mockClear();
  });

  it('claimPipelineFinalizeAfterLastGate scopes by audit id and does not use OR filter', async () => {
    const claimed = await claimPipelineFinalizeAfterLastGate('audit-1', 'client-1', '2026-01-01T00:00:00.000Z');
    expect(claimed).toBe(true);
    expect(calls.orCount).toBe(0);
    expect(calls.eq).toContainEqual(['id', 'audit-1']);
    expect(calls.eq).toContainEqual(['user_id', 'client-1']);
  });

  it('claimPipeline* mutations keep id-scoped updates without OR filter', async () => {
    await claimPipelineStart('audit-2', 'client-2', '2026-01-01T00:00:00.000Z');
    await claimPipelineNext('audit-3', 'client-3', '2026-01-01T00:00:00.000Z', 'auto');
    await claimPipelineStop('audit-4', 'client-4', '2026-01-01T00:00:00.000Z');

    expect(calls.orCount).toBe(0);
    expect(calls.eq).toContainEqual(['id', 'audit-2']);
    expect(calls.eq).toContainEqual(['id', 'audit-3']);
    expect(calls.eq).toContainEqual(['id', 'audit-4']);
  });

  it('claimPipelineNext throws when the optimistic update returns a database error', async () => {
    calls.selectResult = {
      data: null,
      error: { message: 'statement timeout', code: '57014' },
    };

    await expect(
      claimPipelineNext('audit-5', 'client-5', '2026-01-01T00:00:00.000Z', 'auto'),
    ).rejects.toThrow('[pipeline_claim] claimPipelineNext failed: statement timeout');
  });

  it('claim retry and resume mutations throw instead of returning a false claim on database errors', async () => {
    calls.selectResult = {
      data: null,
      error: { message: 'write conflict', code: '40001' },
    };

    await expect(
      claimPipelineRetry('audit-6', '2026-01-01T00:00:00.000Z', 'auto', {
        kind: PIPELINE_RETRY_CLAIM_OWNERSHIP.owner,
        actorUserId: 'client-6',
      }),
    ).rejects.toThrow('[pipeline_claim] claimPipelineRetry failed: write conflict');

    await expect(claimPipelineResumeFromCancelled('audit-7', '2026-01-01T00:00:00.000Z')).rejects.toThrow(
      '[pipeline_claim] claimPipelineResumeFromCancelled failed: write conflict',
    );
  });

  it('audit fetches return null only for the expected no-row PostgREST code', async () => {
    calls.singleResult = {
      data: null,
      error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    };

    await expect(fetchAuditForNext('audit-missing', 'client-8')).resolves.toBeNull();
  });

  it('audit fetches throw on database errors instead of masquerading as missing rows', async () => {
    calls.singleResult = {
      data: null,
      error: { message: 'statement timeout', code: '57014' },
    };

    await expect(fetchAuditForNext('audit-error', 'client-9')).rejects.toThrow(
      '[pipeline_audit_read] fetchAuditForNext failed: statement timeout',
    );
  });
});
