import { beforeEach, describe, expect, it, vi } from 'vitest';

const accessMocks = vi.hoisted(() => ({ resolve: vi.fn() }));
const supabaseFromMock = vi.hoisted(() => vi.fn());
const sendApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../services/plan-board/plan-board-access.js', () => ({
  resolveAuditPlanBoardAccess: accessMocks.resolve,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: { from: supabaseFromMock },
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { patchPipelinePhaseResultController } from '../routes/audits/controllers/patch-pipeline-phase-result.controller.js';

function createReq(overrides: Partial<{ body: unknown; params: Record<string, string>; userId: string; userRole: string }>) {
  return {
    body: overrides.body ?? { result: { summary: 'Updated summary' } },
    params: overrides.params ?? { id: 'audit-1', phase: '1' },
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

describe('patchPipelinePhaseResultController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMocks.resolve.mockResolvedValue({ ok: true, kind: 'consultant_owner' });
    supabaseFromMock.mockImplementation(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    }));
  });

  it('updates domain phase result for consultant owner', async () => {
    const req = createReq({});
    const res = createRes();

    await patchPipelinePhaseResultController(req, res);

    expect(sendApiErrorMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true, phase_number: 1, updated: true });
  });

  it('forbids client access', async () => {
    accessMocks.resolve.mockResolvedValueOnce({ ok: true, kind: 'client' });
    const req = createReq({ userRole: 'client' });
    const res = createRes();

    await patchPipelinePhaseResultController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });
});
