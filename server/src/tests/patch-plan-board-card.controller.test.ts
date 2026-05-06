import { beforeEach, describe, expect, it, vi } from 'vitest';

const ffMocks = vi.hoisted(() => ({ orchPackEnabled: true, strictManualInProgress: false }));

/** Mutable row snapshot for GET card select in default supabase mock. */
const cardRowMocks = vi.hoisted(() => ({
  column_id: 'next_up',
  source: 'pack' as 'pack' | 'manual',
}));

const accessMocks = vi.hoisted(() => ({ resolve: vi.fn() }));

const readMocks = vi.hoisted(() => ({ fetch: vi.fn() }));

const idempoMocks = vi.hoisted(() => ({
  get: vi.fn(),
  store: vi.fn(),
}));

const pipelineMocks = vi.hoisted(() => ({
  emitMove: vi.fn(),
  emitPin: vi.fn(),
  emit409: vi.fn(),
  countPinned: vi.fn(),
}));

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => ffMocks.orchPackEnabled,
    isPlanBoardStrictManualInProgressBlocked: () => ffMocks.strictManualInProgress,
  };
});

vi.mock('../services/plan-board/plan-board-access.js', () => ({
  resolveAuditPlanBoardAccess: accessMocks.resolve,
}));

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  fetchPersistedGlcOrchestrationPackForUser: readMocks.fetch,
}));

vi.mock('../lib/idempotency.js', () => ({
  getStoredIdempotentResponse: idempoMocks.get,
  storeIdempotentResponse: idempoMocks.store,
  isIdempotencyPayloadConflictError: (e: unknown) =>
    e instanceof Error && e.message === 'IDEMPOTENCY_PAYLOAD_CONFLICT_MESSAGE',
}));

vi.mock('../services/plan-board/plan-board-pipeline-events.js', () => ({
  emitPlanBoardCardMoved: pipelineMocks.emitMove,
  emitPlanBoardCardPinned: pipelineMocks.emitPin,
  emitPlanBoardConflict409: pipelineMocks.emit409,
  countPinnedPlanBoardCards: pipelineMocks.countPinned,
}));

const supabaseFromMock = vi.hoisted(() => vi.fn());
vi.mock('../services/supabase.js', () => ({
  supabase: { from: supabaseFromMock },
}));

const sendApiErrorMock = vi.hoisted(() => vi.fn());
vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { API_ERROR_CODES } from '../config/api-error-codes.js';
import { patchPlanBoardCardController } from '../routes/audits/controllers/patch-plan-board-card.controller.js';

function createReq(overrides: Partial<{ body: unknown; params: Record<string, string>; userId: string; userRole: string; header: (k: string) => string | undefined }>): import('../middleware/auth.js').AuthRequest {
  return {
    body: overrides.body ?? { expected_pack_version: 2 },
    params: overrides.params ?? { id: 'audit-1', cardId: 'card-1' },
    userId: overrides.userId ?? 'user-1',
    userRole: overrides.userRole ?? 'consultant',
    header: overrides.header ?? ((_k: string) => undefined),
  } as import('../middleware/auth.js').AuthRequest;
}

function createRes(): import('express').Response {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as import('express').Response;
}

describe('patchPlanBoardCardController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ffMocks.orchPackEnabled = true;
    ffMocks.strictManualInProgress = false;
    cardRowMocks.column_id = 'next_up';
    cardRowMocks.source = 'pack';
    accessMocks.resolve.mockResolvedValue({ ok: true, kind: 'consultant_owner' });
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack: { graph: { nodes: [], edges: [] } },
      orchestration_pack_version: 2,
    });
    idempoMocks.get.mockResolvedValue({ key: 'idemp-key-1', hash: '{}' });
    idempoMocks.store.mockResolvedValue(undefined);
    pipelineMocks.countPinned.mockResolvedValue(0);

    let selectKind: 'card' | 'count' | 'noop' = 'card';
    supabaseFromMock.mockImplementation((_table: string) => ({
      select: vi.fn((_cols?: unknown, opts?: { count?: string; head?: boolean }) => ({
        eq: vi.fn().mockImplementation(() =>
          opts?.head
            ? { error: null }
            : {
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data:
                      selectKind === 'card'
                        ? {
                            id: 'card-1',
                            column_id: cardRowMocks.column_id,
                            source: cardRowMocks.source,
                            delivery_area: 'board',
                          }
                        : null,
                    error: null,
                  })),
                })),
              },
        ),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    }));
    selectKind = 'card';
  });

  it('returns 400 when Idempotency-Key is absent', async () => {
    idempoMocks.get.mockResolvedValueOnce({ key: null });
    const req = createReq({});
    const res = createRes();

    await patchPlanBoardCardController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 400, expect.any(String), expect.any(String));
  });

  it('returns 403 for client PATCH that changes delivery_area', async () => {
    accessMocks.resolve.mockResolvedValueOnce({ ok: true, kind: 'client' });
    const req = createReq({
      userRole: 'client',
      body: { delivery_area: 'archived', expected_pack_version: 2 },
      header: (k: string) => {
        const low = k.toLowerCase();
        if (low === 'idempotency-key') return 'idem-uuid';
        return undefined;
      },
    });
    const res = createRes();

    await patchPlanBoardCardController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });

  it('returns 403 for client when destination column is disallowed', async () => {
    accessMocks.resolve.mockResolvedValueOnce({ ok: true, kind: 'client' });
    const req = createReq({
      userRole: 'client',
      body: { to_column: 'backlog', expected_pack_version: 2 },
      header: (k: string) => (k.toLowerCase() === 'idempotency-key' ? 'idem-uuid' : undefined),
    });
    let selectKind = 'card' as const;
    supabaseFromMock.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data:
                selectKind === 'card'
                  ? {
                      id: 'card-1',
                      column_id: 'next_up',
                      source: 'pack',
                      delivery_area: 'board',
                    }
                  : null,
              error: null,
            })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    }));
    selectKind = 'card';
    const res = createRes();

    await patchPlanBoardCardController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      403,
      expect.any(String),
      expect.stringContaining('transition'),
    );
  });

  it('returns 409 when expected_pack_version mismatches persisted pack row', async () => {
    readMocks.fetch.mockResolvedValueOnce({
      status: 'ok',
      pack: { graph: { nodes: [], edges: [] } },
      orchestration_pack_version: 3,
    });

    const req = createReq({
      body: { expected_pack_version: 2 },
      header: (k: string) => (k.toLowerCase() === 'idempotency-key' ? 'idem-stale-v1' : undefined),
    });
    const res = createRes();

    await patchPlanBoardCardController(req, res);

    expect(pipelineMocks.emit409).toHaveBeenCalledWith(
      expect.objectContaining({
        auditId: 'audit-1',
        payload: expect.objectContaining({
          reason: 'stale_pack_version',
          pack_version_seen: 2,
          pack_version_actual: 3,
        }),
      }),
    );
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      409,
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
  });

  it('consultant PATCH succeeds when transition is allowed', async () => {
    const req = createReq({
      body: { to_column: 'in_progress', expected_pack_version: 2 },
      header: (k: string) => (k.toLowerCase() === 'idempotency-key' ? 'idem-ok' : undefined),
    });
    const res = createRes();

    await patchPlanBoardCardController(req, res);

    expect(sendApiErrorMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ pack_version_used: 2, ok: true });
    expect(pipelineMocks.emitMove).toHaveBeenCalled();
  });

  it('returns 409 for manual cards moving into in_progress when strict flag is enabled', async () => {
    ffMocks.strictManualInProgress = true;
    cardRowMocks.source = 'manual';

    const req = createReq({
      body: { to_column: 'in_progress', expected_pack_version: 2 },
      header: (k: string) => (k.toLowerCase() === 'idempotency-key' ? 'idem-strict-manual-ip' : undefined),
    });
    const res = createRes();

    await patchPlanBoardCardController(req, res);

    expect(pipelineMocks.emit409).toHaveBeenCalledWith(
      expect.objectContaining({
        auditId: 'audit-1',
        payload: expect.objectContaining({
          reason: 'manual_in_progress_blocked',
          pack_version_seen: 2,
          pack_version_actual: 2,
        }),
      }),
    );
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      409,
      API_ERROR_CODES.PLAN_BOARD_MANUAL_IN_PROGRESS_BLOCKED,
      expect.any(String),
      expect.any(Object),
    );
    expect(pipelineMocks.emitMove).not.toHaveBeenCalled();
  });
});
