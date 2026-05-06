import { beforeEach, describe, expect, it, vi } from 'vitest';

const flagMocks = vi.hoisted(() => ({ enabled: true }));

const readMocks = vi.hoisted(() => ({
  loadAuditExecutionPlanRow: vi.fn(),
  fetchPersistedGlcOrchestrationPackForUser: vi.fn(),
}));

const manifestMocks = vi.hoisted(() => ({
  insertRoadmapManifestSnapshot: vi.fn(),
  deleteRoadmapManifestSnapshotById: vi.fn(),
  assertManifestMatchesExecutionPlan: vi.fn(),
}));

const draftMocks = vi.hoisted(() => ({
  list: vi.fn(),
  clear: vi.fn(),
}));

const flowMocks = vi.hoisted(() => ({
  runOrchestrationPackPersistFlowFromManifest: vi.fn(),
}));

const sendApiErrorMock = vi.hoisted(() => vi.fn());
const idempotencyMocks = vi.hoisted(() => ({
  getStoredIdempotentResponse: vi.fn(),
  storeIdempotentResponse: vi.fn(),
  isIdempotencyPayloadConflictError: vi.fn(),
}));

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => flagMocks.enabled,
  };
});

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  loadAuditExecutionPlanRow: readMocks.loadAuditExecutionPlanRow,
  fetchPersistedGlcOrchestrationPackForUser: readMocks.fetchPersistedGlcOrchestrationPackForUser,
}));

vi.mock('../services/orchestration/roadmap-manifest.service.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/orchestration/roadmap-manifest.service.js')>();
  return {
    ...actual,
    insertRoadmapManifestSnapshot: manifestMocks.insertRoadmapManifestSnapshot,
    deleteRoadmapManifestSnapshotById: manifestMocks.deleteRoadmapManifestSnapshotById,
    assertManifestMatchesExecutionPlan: manifestMocks.assertManifestMatchesExecutionPlan,
  };
});

vi.mock('../services/orchestration/manifest-draft-revision.service.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/orchestration/manifest-draft-revision.service.js')>();
  return {
    ...actual,
    listManifestDraftRevisionsForAudit: draftMocks.list,
    clearManifestDraftRevisionsForAudit: draftMocks.clear,
  };
});

vi.mock('../services/orchestration/orchestration-pack-persist-run.service.js', () => ({
  runOrchestrationPackPersistFlowFromManifest: flowMocks.runOrchestrationPackPersistFlowFromManifest,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

vi.mock('../lib/idempotency.js', () => ({
  getStoredIdempotentResponse: idempotencyMocks.getStoredIdempotentResponse,
  storeIdempotentResponse: idempotencyMocks.storeIdempotentResponse,
  isIdempotencyPayloadConflictError: idempotencyMocks.isIdempotencyPayloadConflictError,
}));

import { API_ERROR_CODES } from '../config/api-error-codes.js';
import { postOrchestrationCompileController } from '../routes/audits/controllers/post-orchestration-compile.controller.js';
import { RoadmapManifestMismatchError } from '../services/orchestration/roadmap-manifest.service.js';

function createRes() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  } as unknown as import('express').Response;
}

const validBody = {
  schema_version: 3,
  change_scenario: 'hybrid',
  season_preset: 'rolling_90d',
  selected_domains: ['seo_digital'],
};

describe('postOrchestrationCompileController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagMocks.enabled = true;
    idempotencyMocks.getStoredIdempotentResponse.mockResolvedValue({
      replay: null,
      key: 'k',
      hash: 'h',
    });
    idempotencyMocks.isIdempotencyPayloadConflictError.mockReturnValue(false);
    readMocks.loadAuditExecutionPlanRow.mockResolvedValue({
      plan: { selected_domains: ['seo_digital'], depth: 'standard', source: 'user_selected' },
    });
    draftMocks.list.mockResolvedValue({ rows: [], error: null });
    manifestMocks.insertRoadmapManifestSnapshot.mockResolvedValue({ id: 'snap-1' });
    manifestMocks.assertManifestMatchesExecutionPlan.mockImplementation(() => {});
    readMocks.fetchPersistedGlcOrchestrationPackForUser.mockResolvedValue({ status: 'ok', pack: { graph: { nodes: [], edges: [] } } });
  });

  it('returns 200 with manifest_snapshot_id when pack flow succeeds', async () => {
    flowMocks.runOrchestrationPackPersistFlowFromManifest.mockResolvedValue({
      ok: true,
      pack: { graph: { nodes: [], edges: [] } },
      orchestration_pack_version: 2,
      last_revision_diff: null,
      last_revision_diff_summary: '',
      plan_governance: { reason_codes: [], decision: 'accept', decision_hint: 'accept_plan' },
      rollout_transition: { recommendedMode: 'shadow' },
    });

    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: validBody,
    } as unknown as import('../middleware/auth.js').AuthRequest;
    const res = createRes();

    await postOrchestrationCompileController(req, res);

    expect(manifestMocks.insertRoadmapManifestSnapshot).toHaveBeenCalled();
    expect(flowMocks.runOrchestrationPackPersistFlowFromManifest).toHaveBeenCalledWith(
      expect.objectContaining({ manifestSnapshotId: 'snap-1' }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest_snapshot_id: 'snap-1',
        orchestration_pack_version: 2,
      }),
    );
    expect(manifestMocks.deleteRoadmapManifestSnapshotById).not.toHaveBeenCalled();
  });

  it('deletes snapshot when pack flow fails (not_ready)', async () => {
    flowMocks.runOrchestrationPackPersistFlowFromManifest.mockResolvedValue({
      ok: false,
      kind: 'not_ready',
      reason_code: 'missing_timeline',
    });
    manifestMocks.deleteRoadmapManifestSnapshotById.mockResolvedValue({ error: null });

    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: validBody,
    } as unknown as import('../middleware/auth.js').AuthRequest;
    const res = createRes();

    await postOrchestrationCompileController(req, res);

    expect(manifestMocks.deleteRoadmapManifestSnapshotById).toHaveBeenCalledWith({
      auditId: 'audit-1',
      snapshotId: 'snap-1',
    });
    expect(sendApiErrorMock).toHaveBeenCalled();
  });

  it('returns 400 when manifest body fails schema validation (no DB reads)', async () => {
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: { schema_version: 3 },
    } as unknown as import('../middleware/auth.js').AuthRequest;
    const res = createRes();

    await postOrchestrationCompileController(req, res);

    expect(readMocks.loadAuditExecutionPlanRow).not.toHaveBeenCalled();
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      400,
      API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID,
      expect.any(String),
      expect.objectContaining({ detail: expect.anything() }),
    );
  });

  it('returns 400 when manifest does not match execution plan', async () => {
    manifestMocks.assertManifestMatchesExecutionPlan.mockImplementationOnce(() => {
      throw new RoadmapManifestMismatchError('mismatch');
    });

    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: validBody,
    } as unknown as import('../middleware/auth.js').AuthRequest;
    const res = createRes();

    await postOrchestrationCompileController(req, res);

    expect(manifestMocks.insertRoadmapManifestSnapshot).not.toHaveBeenCalled();
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      400,
      API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH,
      expect.any(String),
    );
  });

  it('replays idempotent response without inserting a snapshot', async () => {
    const replayPayload = { manifest_snapshot_id: 'cached', orchestration_pack_version: 9 };
    idempotencyMocks.getStoredIdempotentResponse.mockResolvedValue({
      replay: { statusCode: 200, payload: replayPayload },
      key: 'k',
      hash: 'h',
    });

    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: validBody,
    } as unknown as import('../middleware/auth.js').AuthRequest;
    const res = createRes();

    await postOrchestrationCompileController(req, res);

    expect(readMocks.loadAuditExecutionPlanRow).not.toHaveBeenCalled();
    expect(manifestMocks.insertRoadmapManifestSnapshot).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(replayPayload);
  });

  it('returns 403 when orchestration pack API is disabled', async () => {
    flagMocks.enabled = false;

    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: validBody,
    } as unknown as import('../middleware/auth.js').AuthRequest;
    const res = createRes();

    await postOrchestrationCompileController(req, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      403,
      API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED,
      expect.any(String),
    );
    expect(manifestMocks.insertRoadmapManifestSnapshot).not.toHaveBeenCalled();
  });

  it('deletes snapshot and returns 409 when pack flow rejects governance', async () => {
    manifestMocks.deleteRoadmapManifestSnapshotById.mockResolvedValue({ error: null });
    flowMocks.runOrchestrationPackPersistFlowFromManifest.mockResolvedValue({
      ok: false,
      kind: 'governance_reject',
      plan_governance: {
        reason_codes: ['empty_critical_path'],
        decision: 'reject',
        decision_hint: 'refine_plan',
      },
      pack: { graph: { nodes: [], edges: [] } },
    } as never);

    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: validBody,
    } as unknown as import('../middleware/auth.js').AuthRequest;
    const res = createRes();

    await postOrchestrationCompileController(req, res);

    expect(manifestMocks.deleteRoadmapManifestSnapshotById).toHaveBeenCalledWith({
      auditId: 'audit-1',
      snapshotId: 'snap-1',
    });
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      409,
      API_ERROR_CODES.AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT,
      expect.any(String),
      expect.objectContaining({
        plan_governance: expect.anything(),
        remediation: expect.any(Array),
        auto_refine: expect.any(Object),
      }),
    );
  });

  it('merges queued draft revisions into persisted manifest snapshot payload', async () => {
    draftMocks.list.mockResolvedValue({
      rows: [
        {
          id: 'dr1',
          audit_id: 'audit-1',
          canonical_node_key: 'cnk_v1_lane_hint',
          requested_lane: 'seo',
          owner_hint: null,
          expected_pack_version_at_enqueue: 1,
          updated_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    draftMocks.clear.mockResolvedValue({ error: null });
    flowMocks.runOrchestrationPackPersistFlowFromManifest.mockResolvedValue({
      ok: true,
      pack: { graph: { nodes: [], edges: [] } },
      orchestration_pack_version: 3,
      last_revision_diff: null,
      last_revision_diff_summary: '',
      plan_governance: { reason_codes: [], decision: 'accept', decision_hint: 'accept_plan' },
      rollout_transition: { recommendedMode: 'shadow' },
    });

    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: validBody,
    } as unknown as import('../middleware/auth.js').AuthRequest;
    const res = createRes();

    await postOrchestrationCompileController(req, res);

    expect(manifestMocks.insertRoadmapManifestSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          node_execution_hints: expect.objectContaining({
            cnk_v1_lane_hint: { lane: 'seo' },
          }),
        }),
      }),
    );
    expect(draftMocks.clear).toHaveBeenCalledWith('audit-1');
    expect(res.json).toHaveBeenCalled();
  });
});
