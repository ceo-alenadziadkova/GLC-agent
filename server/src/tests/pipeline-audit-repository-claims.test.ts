import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  eq: [] as Array<[string, unknown]>,
  orCount: 0,
}));

const queryBuilder = vi.hoisted(() => {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      calls.eq.push([column, value]);
      return builder;
    }),
    in: vi.fn(() => builder),
    or: vi.fn(() => {
      calls.orCount += 1;
      return builder;
    }),
    select: vi.fn(async () => ({ data: [{ id: 'a1' }] })),
    single: vi.fn(async () => ({ data: null, error: null })),
  };
  return builder;
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => queryBuilder),
  },
}));

import {
  claimPipelineFinalizeAfterLastGate,
  claimPipelineNext,
  claimPipelineStart,
  claimPipelineStop,
} from '../services/pipeline-routes/repository/pipeline-audit.repository.js';

describe('pipeline audit repository claim scoping', () => {
  beforeEach(() => {
    calls.eq = [];
    calls.orCount = 0;
    queryBuilder.update.mockClear();
    queryBuilder.eq.mockClear();
    queryBuilder.in.mockClear();
    queryBuilder.or.mockClear();
    queryBuilder.select.mockClear();
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
});
