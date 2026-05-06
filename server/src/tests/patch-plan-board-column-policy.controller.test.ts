import { beforeEach, describe, expect, it, vi } from 'vitest';

const accessMocks = vi.hoisted(() => ({ resolve: vi.fn() }));
const ffMocks = vi.hoisted(() => ({ orchPack: true, customCols: true }));

const fetchFieldsMocks = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    user_id: 'owner-1',
    plan_board_column_policy: null,
  }),
);
const entitledMocks = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const remapMocks = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true as const }));

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => ffMocks.orchPack,
    isPlanBoardCustomColumnsFeatureEnabled: () => ffMocks.customCols,
  };
});

vi.mock('../services/plan-board/plan-board-access.js', () => ({
  resolveAuditPlanBoardAccess: accessMocks.resolve,
}));

vi.mock('../services/plan-board/plan-board-column-policy.service.js', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../services/plan-board/plan-board-column-policy.service.js')>();
  return {
    ...actual,
    fetchAuditPlanBoardPolicyFields: fetchFieldsMocks,
    fetchPlanBoardOwnerEntitled: entitledMocks,
    remapAllPlanBoardCardsForPolicyChange: remapMocks,
  };
});

const supabaseFromMock = vi.hoisted(() => vi.fn());
vi.mock('../services/supabase.js', () => ({
  supabase: { from: supabaseFromMock },
}));

const sendApiErrorMock = vi.hoisted(() => vi.fn());
vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { API_ERROR_CODES } from '../config/api-error-codes.js';
import { patchPlanBoardColumnPolicyController } from '../routes/audits/controllers/patch-plan-board-column-policy.controller.js';

function createRes(): import('express').Response {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as import('express').Response;
}

describe('patchPlanBoardColumnPolicyController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ffMocks.orchPack = true;
    ffMocks.customCols = true;
    accessMocks.resolve.mockResolvedValue({ ok: true, kind: 'consultant_owner' });
    fetchFieldsMocks.mockResolvedValue({
      user_id: 'owner-1',
      plan_board_column_policy: null,
    });
    entitledMocks.mockResolvedValue(true);
    remapMocks.mockResolvedValue({ ok: true });
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'audits') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
        };
      }
      return {};
    });
  });

  it('returns 403 when custom columns feature gate is off', async () => {
    ffMocks.customCols = false;
    const res = createRes();

    await patchPlanBoardColumnPolicyController(
      { params: { id: 'a1' }, userId: 'u1', body: { kind: 'reset' } } as never,
      res,
    );

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      403,
      API_ERROR_CODES.PLAN_BOARD_CUSTOM_COLUMNS_DISABLED,
      expect.any(String),
    );
  });

  it('returns 200 on reset when entitled', async () => {
    const res = createRes();

    await patchPlanBoardColumnPolicyController(
      { params: { id: 'a1' }, userId: 'u1', body: { kind: 'reset' } } as never,
      res,
    );

    expect(remapMocks).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
