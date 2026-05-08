import { beforeEach, describe, expect, it, vi } from 'vitest';

const platformAdminMock = vi.hoisted(() => ({ canManage: vi.fn() }));
const serviceMock = vi.hoisted(() => ({ apply: vi.fn() }));
const supabaseFromMock = vi.hoisted(() => vi.fn());
const sendApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/platform-admin.js', () => ({
  canManagePlatformSettings: platformAdminMock.canManage,
}));

vi.mock('../services/audits/audit-token-budget-topup.service.js', () => ({
  applyAuditTokenBudgetTopup: serviceMock.apply,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: { from: supabaseFromMock },
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { patchAuditTokenBudgetController } from '../routes/audits/controllers/patch-audit-token-budget.controller.js';

function createReq(overrides: {
  body?: unknown;
  params?: Record<string, string>;
  userId?: string | undefined;
  userRole?: string;
} = {}) {
  return {
    body: overrides.body ?? { delta_tokens: 50_000 },
    params: overrides.params ?? { id: 'audit-1' },
    userId: 'userId' in overrides ? overrides.userId : 'user-1',
    userRole: overrides.userRole ?? 'consultant',
  } as import('../middleware/auth.js').AuthRequest;
}

function createRes() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  } as unknown as import('express').Response;
}

function mockAuditFound(): void {
  supabaseFromMock.mockImplementation(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: { id: 'audit-1' }, error: null })),
      })),
    })),
  }));
}

describe('patchAuditTokenBudgetController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platformAdminMock.canManage.mockResolvedValue(true);
    mockAuditFound();
    serviceMock.apply.mockResolvedValue({
      ok: true,
      grant_id: 'grant-1',
      previous_budget: 200_000,
      token_budget: 250_000,
      tokens_used: 199_000,
      tokens_remaining: 51_000,
    });
  });

  it('returns 401 when unauthenticated', async () => {
    const req = createReq({ userId: undefined as unknown as string });
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(res, 401, expect.any(String), expect.any(String));
    expect(serviceMock.apply).not.toHaveBeenCalled();
  });

  it('returns 403 PLATFORM_ADMIN_ONLY for non-consultant role', async () => {
    const req = createReq({ userRole: 'client' });
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(res, 403, 'PLATFORM_ADMIN_ONLY', expect.any(String));
    expect(serviceMock.apply).not.toHaveBeenCalled();
  });

  it('returns 403 PLATFORM_ADMIN_ONLY when consultant is not platform admin', async () => {
    platformAdminMock.canManage.mockResolvedValueOnce(false);
    const req = createReq({});
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(res, 403, 'PLATFORM_ADMIN_ONLY', expect.any(String));
    expect(serviceMock.apply).not.toHaveBeenCalled();
  });

  it('returns 400 AUDITS_TOKEN_BUDGET_TOPUP_INVALID for missing delta', async () => {
    const req = createReq({ body: {} });
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      400,
      'AUDITS_TOKEN_BUDGET_TOPUP_INVALID',
      expect.any(String),
      expect.any(Object),
    );
    expect(serviceMock.apply).not.toHaveBeenCalled();
  });

  it('returns 400 for delta above max', async () => {
    const req = createReq({ body: { delta_tokens: 999_999_999 } });
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      400,
      'AUDITS_TOKEN_BUDGET_TOPUP_INVALID',
      expect.any(String),
      expect.any(Object),
    );
  });

  it('returns 400 for non-integer delta', async () => {
    const req = createReq({ body: { delta_tokens: 1234.5 } });
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      400,
      'AUDITS_TOKEN_BUDGET_TOPUP_INVALID',
      expect.any(String),
      expect.any(Object),
    );
  });

  it('returns 404 when audit row missing', async () => {
    supabaseFromMock.mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    }));
    const req = createReq({});
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(res, 404, 'AUDITS_NOT_FOUND', expect.any(String));
    expect(serviceMock.apply).not.toHaveBeenCalled();
  });

  it('returns 200 with updated budget on success', async () => {
    const req = createReq({ body: { delta_tokens: 50_000, reason: 'extra context' } });
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).not.toHaveBeenCalled();
    expect(serviceMock.apply).toHaveBeenCalledWith({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 50_000,
      reason: 'extra context',
    });
    expect(res.json).toHaveBeenCalledWith({
      grant_id: 'grant-1',
      previous_budget: 200_000,
      token_budget: 250_000,
      tokens_used: 199_000,
      tokens_remaining: 51_000,
    });
  });

  it('maps service audit_not_found to 404', async () => {
    serviceMock.apply.mockResolvedValueOnce({ ok: false, reason: 'audit_not_found' });
    const req = createReq({});
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(res, 404, 'AUDITS_NOT_FOUND', expect.any(String));
  });

  it('maps service rpc_failed to 500 AUDITS_TOKEN_BUDGET_TOPUP_FAILED', async () => {
    serviceMock.apply.mockResolvedValueOnce({ ok: false, reason: 'rpc_failed' });
    const req = createReq({});
    const res = createRes();

    await patchAuditTokenBudgetController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      500,
      'AUDITS_TOKEN_BUDGET_TOPUP_FAILED',
      expect.any(String),
    );
  });
});
