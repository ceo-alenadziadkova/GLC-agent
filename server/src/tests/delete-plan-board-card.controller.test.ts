import { beforeEach, describe, expect, it, vi } from 'vitest';

const ffMocks = vi.hoisted(() => ({ orchPackEnabled: true }));
const accessMocks = vi.hoisted(() => ({ resolve: vi.fn() }));
const readMocks = vi.hoisted(() => ({ fetch: vi.fn() }));
const supabaseFromMock = vi.hoisted(() => vi.fn());
const sendApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => ffMocks.orchPackEnabled,
  };
});

vi.mock('../services/plan-board/plan-board-access.js', () => ({
  resolveAuditPlanBoardAccess: accessMocks.resolve,
}));

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  fetchPersistedGlcOrchestrationPackForUser: readMocks.fetch,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: { from: supabaseFromMock },
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { deletePlanBoardCardController } from '../routes/audits/controllers/delete-plan-board-card.controller.js';

function createReq(overrides: Partial<{ body: unknown; params: Record<string, string>; userId: string; userRole: string }>) {
  return {
    body: overrides.body ?? { expected_pack_version: 2 },
    params: overrides.params ?? { id: 'audit-1', cardId: 'card-1' },
    userId: overrides.userId ?? 'user-1',
    userRole: overrides.userRole ?? 'consultant',
  } as import('../middleware/auth.js').AuthRequest;
}

function createRes() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as import('express').Response;
}

describe('deletePlanBoardCardController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ffMocks.orchPackEnabled = true;
    accessMocks.resolve.mockResolvedValue({ ok: true, kind: 'consultant_owner' });
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack: { graph: { nodes: [], edges: [] } },
      orchestration_pack_version: 2,
    });
    supabaseFromMock.mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    }));
  });

  it('deletes card for consultant owner', async () => {
    const req = createReq({});
    const res = createRes();

    await deletePlanBoardCardController(req, res);

    expect(sendApiErrorMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true, pack_version_used: 2 });
  });

  it('forbids client role', async () => {
    accessMocks.resolve.mockResolvedValueOnce({ ok: true, kind: 'client' });
    const req = createReq({ userRole: 'client' });
    const res = createRes();

    await deletePlanBoardCardController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });
});
