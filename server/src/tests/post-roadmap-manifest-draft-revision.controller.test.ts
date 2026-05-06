import { beforeEach, describe, expect, it, vi } from 'vitest';

const ffMocks = vi.hoisted(() => ({
  orchPackEnabled: true,
  manifestDraftFromBoardEnabled: true,
}));

const accessMocks = vi.hoisted(() => ({ resolve: vi.fn() }));
const readMocks = vi.hoisted(() => ({ fetch: vi.fn() }));
const revisionMocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  list: vi.fn(),
}));
const idempotencyMocks = vi.hoisted(() => ({
  get: vi.fn(),
  store: vi.fn(),
}));
const sendApiErrorMock = vi.hoisted(() => vi.fn());
const supabaseFromMock = vi.hoisted(() => vi.fn());

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => ffMocks.orchPackEnabled,
    isManifestDraftRevisionsFromBoardEnabled: () => ffMocks.manifestDraftFromBoardEnabled,
  };
});

vi.mock('../services/plan-board/plan-board-access.js', () => ({
  resolveAuditPlanBoardAccess: accessMocks.resolve,
}));

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  fetchPersistedGlcOrchestrationPackForUser: readMocks.fetch,
}));

vi.mock('../services/orchestration/manifest-draft-revision.service.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/orchestration/manifest-draft-revision.service.js')>();
  return {
    ...actual,
    upsertManifestDraftRevision: revisionMocks.upsert,
    listManifestDraftRevisionsForAudit: revisionMocks.list,
  };
});

vi.mock('../lib/idempotency.js', () => ({
  getStoredIdempotentResponse: idempotencyMocks.get,
  storeIdempotentResponse: idempotencyMocks.store,
  isIdempotencyPayloadConflictError: (e: unknown) =>
    e instanceof Error && e.message === 'IDEMPOTENCY_PAYLOAD_CONFLICT_MESSAGE',
}));

vi.mock('../services/supabase.js', () => ({
  supabase: { from: supabaseFromMock },
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { API_ERROR_CODES } from '../config/api-error-codes.js';
import { postRoadmapManifestDraftRevisionController } from '../routes/audits/controllers/post-roadmap-manifest-draft-revision.controller.js';

function createReq(
  overrides: Partial<{
    body: unknown;
    params: Record<string, string>;
    userId: string;
    userRole: string;
    header: (k: string) => string | undefined;
  }>,
): import('../middleware/auth.js').AuthRequest {
  return {
    body:
      overrides.body ??
      ({
        canonical_node_key: 'k::node',
        expected_pack_version: 2,
        lane: 'seo',
      } as const),
    params: overrides.params ?? { id: 'audit-1' },
    userId: overrides.userId ?? 'user-1',
    userRole: overrides.userRole ?? 'consultant',
    header:
      overrides.header ??
      ((_k: string) => undefined),
  } as import('../middleware/auth.js').AuthRequest;
}

function createRes(): import('express').Response {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as import('express').Response;
}

describe('postRoadmapManifestDraftRevisionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ffMocks.orchPackEnabled = true;
    ffMocks.manifestDraftFromBoardEnabled = true;
    accessMocks.resolve.mockResolvedValue({ ok: true, kind: 'consultant_owner' });
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack: {
        graph: { nodes: [], edges: [] },
        input_quality: { degraded: false },
      },
      orchestration_pack_version: 2,
    });
    idempotencyMocks.get.mockResolvedValue({
      replay: null,
      key: 'idem-key',
      hash: '{}',
    });
    idempotencyMocks.store.mockResolvedValue(undefined);

    revisionMocks.upsert.mockResolvedValue({ ok: true, pending_count: 1 });
    revisionMocks.list.mockResolvedValue({
      rows: [
        {
          id: 'dr-1',
          audit_id: 'audit-1',
          canonical_node_key: 'k::node',
          requested_lane: 'seo',
          owner_hint: null,
          expected_pack_version_at_enqueue: 2,
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });

    supabaseFromMock.mockImplementation((_table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: 'card-row-1' },
                error: null,
              })),
            })),
          })),
        })),
      })),
    }));
  });

  it('returns 403 when FEATURE_MANIFEST_DRAFT_REVISIONS_FROM_BOARD is off', async () => {
    ffMocks.manifestDraftFromBoardEnabled = false;
    const req = createReq({});
    const res = createRes();

    await postRoadmapManifestDraftRevisionController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      403,
      API_ERROR_CODES.MANIFEST_DRAFT_REVISIONS_DISABLED,
      expect.any(String),
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 409 when persisted pack version does not match expected_pack_version', async () => {
    const req = createReq({});
    readMocks.fetch.mockResolvedValueOnce({
      status: 'ok',
      pack: { graph: { nodes: [], edges: [] }, input_quality: { degraded: false } },
      orchestration_pack_version: 5,
    });
    const res = createRes();

    await postRoadmapManifestDraftRevisionController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      409,
      API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_STALE_VERSION,
      expect.any(String),
      expect.objectContaining({ pack_version_actual: 5 }),
    );
  });

  it('returns 409 when persisted pack is governance-blocked', async () => {
    readMocks.fetch.mockResolvedValueOnce({
      status: 'ok',
      pack: { graph: { nodes: [], edges: [] }, input_quality: { degraded: true } },
      orchestration_pack_version: 2,
    });
    const req = createReq({});
    const res = createRes();

    await postRoadmapManifestDraftRevisionController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      409,
      API_ERROR_CODES.PLAN_BOARD_GOVERNANCE_BLOCKED,
      expect.any(String),
      expect.objectContaining({ code: 'governance_blocked' }),
    );
  });

  it('returns 200 with pending_count and digest on success', async () => {
    const req = createReq({});
    const res = createRes();

    await postRoadmapManifestDraftRevisionController(req, res);

    expect(sendApiErrorMock).not.toHaveBeenCalled();
    expect(revisionMocks.upsert).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        pending_count: 1,
        digest: expect.any(String),
      }),
    );
    expect(idempotencyMocks.store).toHaveBeenCalled();
  });
});
