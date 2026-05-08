import { beforeEach, describe, expect, it, vi } from 'vitest';

const ffMocks = vi.hoisted(() => ({
  orchPackEnabled: true,
  reconcilePreviewEnabled: true,
}));

const accessMocks = vi.hoisted(() => ({ resolve: vi.fn() }));
const readMocks = vi.hoisted(() => ({ fetch: vi.fn() }));
const previewMocks = vi.hoisted(() => ({ build: vi.fn() }));
const sendApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => ffMocks.orchPackEnabled,
    isPlanBoardReconcileDiffPreviewEnabled: () => ffMocks.reconcilePreviewEnabled,
  };
});

vi.mock('../services/plan-board/plan-board-access.js', () => ({
  resolveAuditPlanBoardAccess: accessMocks.resolve,
}));

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  fetchPersistedGlcOrchestrationPackForUser: readMocks.fetch,
}));

vi.mock('../services/plan-board/plan-board-reconcile-preview.service.js', () => ({
  buildPlanBoardReconcilePreviewForAudit: previewMocks.build,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { API_ERROR_CODES } from '../config/api-error-codes.js';
import { postPlanBoardReconcilePreviewController } from '../routes/audits/controllers/post-plan-board-reconcile-preview.controller.js';

function createReq(
  overrides: Partial<{ params: Record<string, string>; userId: string; userRole: string }>,
): import('../middleware/auth.js').AuthRequest {
  return {
    params: overrides.params ?? { id: 'audit-1' },
    userId: overrides.userId ?? 'user-1',
    userRole: overrides.userRole ?? 'consultant',
  } as import('../middleware/auth.js').AuthRequest;
}

function createRes(): import('express').Response {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as import('express').Response;
}

describe('postPlanBoardReconcilePreviewController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ffMocks.orchPackEnabled = true;
    ffMocks.reconcilePreviewEnabled = true;
    accessMocks.resolve.mockResolvedValue({ ok: true, kind: 'consultant_owner' });
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack: {
        graph: { nodes: [], edges: [] },
        input_quality: { degraded: false },
      },
      orchestration_pack_version: 3,
    });
    previewMocks.build.mockResolvedValue({
      ok: true,
      preview: {
        orchestration_pack_version: 3,
        matched: 2,
        orphaned_node_removed: 0,
        orphaned_lane_changed: 0,
        auto_created: 0,
        sample_new_backlog_cards: [],
        sample_orphan_node_removed: [],
      },
    });
  });

  it('returns 403 when reconcile preview feature is disabled', async () => {
    ffMocks.reconcilePreviewEnabled = false;
    const req = createReq({});
    const res = createRes();

    await postPlanBoardReconcilePreviewController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      403,
      API_ERROR_CODES.PLAN_BOARD_RECONCILE_PREVIEW_DISABLED,
      expect.any(String),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns preview metrics when enabled', async () => {
    const req = createReq({});
    const res = createRes();

    await postPlanBoardReconcilePreviewController(req, res);

    expect(sendApiErrorMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orchestration_pack_version: 3,
        matched: 2,
        orphaned_node_removed: 0,
        orphaned_lane_changed: 0,
        auto_created: 0,
      }),
    );
  });
});
