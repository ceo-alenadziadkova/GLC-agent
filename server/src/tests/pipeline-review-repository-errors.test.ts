import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  eq: [] as Array<[string, unknown]>,
  orderBy: null as string | null,
  singleResult: {
    data: { audit_id: 'audit-1', after_phase: 4, status: 'pending' } as Record<string, unknown> | null,
    error: null as { message: string; code?: string } | null,
  },
  maybeSingleResult: {
    data: { audit_id: 'audit-1', after_phase: 4, status: 'pending' } as Record<string, unknown> | null,
    error: null as { message: string; code?: string } | null,
  },
  orderResult: {
    data: [] as unknown[] | null,
    error: null as { message: string; code?: string } | null,
  },
}));

const queryBuilder = vi.hoisted(() => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      calls.eq.push([column, value]);
      return builder;
    }),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => calls.singleResult),
    maybeSingle: vi.fn(async () => calls.maybeSingleResult),
    order: vi.fn((column: string) => {
      calls.orderBy = column;
      return Promise.resolve(calls.orderResult);
    }),
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

import { POSTGREST_NO_ROWS_CODE } from '../config/postgrest-codes.js';
import {
  fetchAnyPendingReviewForAudit,
  fetchPendingReviewAfterPhase,
  fetchReviewPointsForAudit,
} from '../services/pipeline-routes/repository/pipeline-review.repository.js';

describe('pipeline review repository error handling', () => {
  beforeEach(() => {
    calls.eq = [];
    calls.orderBy = null;
    calls.singleResult = {
      data: { audit_id: 'audit-1', after_phase: 4, status: 'pending' },
      error: null,
    };
    calls.maybeSingleResult = {
      data: { audit_id: 'audit-1', after_phase: 4, status: 'pending' },
      error: null,
    };
    calls.orderResult = { data: [], error: null };
    queryBuilder.select.mockClear();
    queryBuilder.eq.mockClear();
    queryBuilder.limit.mockClear();
    queryBuilder.single.mockClear();
    queryBuilder.maybeSingle.mockClear();
    queryBuilder.order.mockClear();
  });

  it('returns null for the expected no-row pending review response', async () => {
    calls.singleResult = {
      data: null,
      error: {
        message: 'JSON object requested, multiple (or no) rows returned',
        code: POSTGREST_NO_ROWS_CODE,
      },
    };

    await expect(fetchPendingReviewAfterPhase('audit-1', 4)).resolves.toBeNull();
  });

  it('throws pending-review read errors instead of treating them as no open gate', async () => {
    calls.singleResult = {
      data: null,
      error: { message: 'statement timeout', code: '57014' },
    };

    await expect(fetchPendingReviewAfterPhase('audit-1', 4)).rejects.toMatchObject({
      message: 'statement timeout',
      code: '57014',
    });
  });

  it('throws audit-wide pending-review read errors before finalization can skip a gate', async () => {
    calls.maybeSingleResult = {
      data: null,
      error: { message: 'permission denied for table review_points', code: '42501' },
    };

    await expect(fetchAnyPendingReviewForAudit('audit-1')).rejects.toMatchObject({
      message: 'permission denied for table review_points',
      code: '42501',
    });
  });

  it('throws review point list read errors instead of returning an empty list', async () => {
    calls.orderResult = {
      data: null,
      error: { message: 'connection reset', code: 'ECONNRESET' },
    };

    await expect(fetchReviewPointsForAudit('audit-1')).rejects.toMatchObject({
      message: 'connection reset',
      code: 'ECONNRESET',
    });
    expect(calls.orderBy).toBe('after_phase');
  });
});
