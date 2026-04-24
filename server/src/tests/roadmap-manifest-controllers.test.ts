import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoadmapManifestMismatchError } from '../services/orchestration/roadmap-manifest.service.js';

const flagMocks = vi.hoisted(() => ({
  enabled: true,
}));

const readMocks = vi.hoisted(() => ({
  loadAuditExecutionPlanRow: vi.fn(),
}));

const manifestMocks = vi.hoisted(() => ({
  insertRoadmapManifestSnapshot: vi.fn(),
  listRoadmapManifestSnapshotsForAudit: vi.fn(),
  assertManifestMatchesExecutionPlan: vi.fn(),
}));

const previewMocks = vi.hoisted(() => ({
  buildRoadmapManifestPreview: vi.fn(),
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
}));

vi.mock('../services/orchestration/roadmap-manifest.service.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/orchestration/roadmap-manifest.service.js')>();
  return {
    ...actual,
    insertRoadmapManifestSnapshot: manifestMocks.insertRoadmapManifestSnapshot,
    listRoadmapManifestSnapshotsForAudit: manifestMocks.listRoadmapManifestSnapshotsForAudit,
    assertManifestMatchesExecutionPlan: manifestMocks.assertManifestMatchesExecutionPlan,
  };
});

vi.mock('../services/orchestration/roadmap-manifest-preview.js', () => ({
  buildRoadmapManifestPreview: previewMocks.buildRoadmapManifestPreview,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

vi.mock('../lib/idempotency.js', () => ({
  getStoredIdempotentResponse: idempotencyMocks.getStoredIdempotentResponse,
  storeIdempotentResponse: idempotencyMocks.storeIdempotentResponse,
  isIdempotencyPayloadConflictError: idempotencyMocks.isIdempotencyPayloadConflictError,
}));

import { postRoadmapManifestPreviewController } from '../routes/audits/controllers/post-roadmap-manifest-preview.controller.js';
import { postRoadmapManifestSnapshotController } from '../routes/audits/controllers/post-roadmap-manifest-snapshot.controller.js';
import { getRoadmapManifestSnapshotsController } from '../routes/audits/controllers/get-roadmap-manifest-snapshots.controller.js';

function createRes() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  } as unknown as import('express').Response;
}

const validManifestPayload = {
  change_scenario: 'hybrid',
  season_preset: 'rolling_90d',
  selected_domains: ['seo_digital'],
};

describe('roadmap manifest controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagMocks.enabled = true;
    readMocks.loadAuditExecutionPlanRow.mockResolvedValue({
      plan: { selected_domains: ['seo_digital'] },
    });
    manifestMocks.assertManifestMatchesExecutionPlan.mockReturnValue(undefined);
    previewMocks.buildRoadmapManifestPreview.mockReturnValue({
      lanes_included: ['seo'],
      lanes_cut: [],
      waiting_list_domains: [],
      confidence_callouts: [],
    });
    manifestMocks.insertRoadmapManifestSnapshot.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
    });
    idempotencyMocks.getStoredIdempotentResponse.mockResolvedValue({
      replay: null,
      key: 'test-key',
      hash: 'test-hash',
    });
    idempotencyMocks.storeIdempotentResponse.mockResolvedValue(undefined);
    idempotencyMocks.isIdempotencyPayloadConflictError.mockReturnValue(false);
    manifestMocks.listRoadmapManifestSnapshotsForAudit.mockResolvedValue({
      snapshots: [],
      error: null,
    });
  });

  it('preview: returns 403 when feature flag disabled', async () => {
    flagMocks.enabled = false;
    const req = { params: { id: 'audit-1' }, userId: 'user-1', body: validManifestPayload } as unknown;
    const res = createRes();

    await postRoadmapManifestPreviewController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });

  it('preview: returns 404 for missing audit', async () => {
    readMocks.loadAuditExecutionPlanRow.mockResolvedValue(null);
    const req = { params: { id: 'audit-1' }, userId: 'user-1', body: validManifestPayload } as unknown;
    const res = createRes();

    await postRoadmapManifestPreviewController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 404, expect.any(String), expect.any(String));
  });

  it('preview: returns preview payload on success', async () => {
    const req = { params: { id: 'audit-1' }, userId: 'user-1', body: validManifestPayload } as unknown;
    const res = createRes();

    await postRoadmapManifestPreviewController(req as never, res);

    expect(res.json).toHaveBeenCalledWith({
      preview: {
        lanes_included: ['seo'],
        lanes_cut: [],
        waiting_list_domains: [],
        confidence_callouts: [],
      },
    });
  });

  it.each([
    { change_scenario: 'integrate_existing', season_preset: 'rolling_30d' },
    { change_scenario: 'build_new', season_preset: 'rolling_180d' },
  ] as const)('preview: supports scenario %s', async ({ change_scenario, season_preset }) => {
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: {
        ...validManifestPayload,
        change_scenario,
        season_preset,
      },
    } as unknown;
    const res = createRes();

    await postRoadmapManifestPreviewController(req as never, res);

    expect(previewMocks.buildRoadmapManifestPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: expect.objectContaining({
          change_scenario,
          season_preset,
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        preview: expect.any(Object),
      }),
    );
  });

  it('snapshot: returns 201 and id on success', async () => {
    const req = { params: { id: 'audit-1' }, userId: 'user-1', body: validManifestPayload } as unknown;
    const res = createRes();

    await postRoadmapManifestSnapshotController(req as never, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000000001' });
    expect(idempotencyMocks.storeIdempotentResponse).toHaveBeenCalled();
  });

  it('preview: returns 400 when manifest diverges from execution plan', async () => {
    manifestMocks.assertManifestMatchesExecutionPlan.mockImplementation(() => {
      throw new RoadmapManifestMismatchError('mismatch');
    });
    const req = { params: { id: 'audit-1' }, userId: 'user-1', body: validManifestPayload } as unknown;
    const res = createRes();

    await postRoadmapManifestPreviewController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 400, expect.any(String), expect.any(String));
  });

  it('snapshot: returns 400 when manifest diverges from execution plan', async () => {
    manifestMocks.assertManifestMatchesExecutionPlan.mockImplementation(() => {
      throw new RoadmapManifestMismatchError('mismatch');
    });
    const req = { params: { id: 'audit-1' }, userId: 'user-1', body: validManifestPayload } as unknown;
    const res = createRes();

    await postRoadmapManifestSnapshotController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 400, expect.any(String), expect.any(String));
  });

  it('snapshot list: returns 404 when audit missing', async () => {
    readMocks.loadAuditExecutionPlanRow.mockResolvedValue(null);
    const req = { params: { id: 'audit-1' }, userId: 'user-1', query: {} } as unknown;
    const res = createRes();

    await getRoadmapManifestSnapshotsController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 404, expect.any(String), expect.any(String));
  });

  it('snapshot list: returns 500 when list query fails', async () => {
    manifestMocks.listRoadmapManifestSnapshotsForAudit.mockResolvedValue({
      snapshots: [],
      error: new Error('db'),
    });
    const req = { params: { id: 'audit-1' }, userId: 'user-1', query: { limit: '10' } } as unknown;
    const res = createRes();

    await getRoadmapManifestSnapshotsController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 500, expect.any(String), expect.any(String));
  });
});
