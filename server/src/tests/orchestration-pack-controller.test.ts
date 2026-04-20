import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RoadmapManifestMismatchError } from '../services/orchestration/roadmap-manifest.service.js';

const flagMocks = vi.hoisted(() => ({
  enabled: true,
  governanceRolloutMode: 'hard_structure_soft_quality' as
    | 'shadow'
    | 'hard_structure_soft_quality'
    | 'tightened_quality',
}));

const orchestrationMocks = vi.hoisted(() => ({
  buildPack: vi.fn(),
  persistPack: vi.fn(),
}));
const loggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const sendApiErrorMock = vi.hoisted(() => vi.fn());
const idempotencyMocks = vi.hoisted(() => ({
  getStoredIdempotentResponse: vi.fn(),
  storeIdempotentResponse: vi.fn(),
}));

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => flagMocks.enabled,
    getOrchestrationPlanGovernanceRolloutMode: () => flagMocks.governanceRolloutMode,
  };
});

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  buildOrchestrationPackForAuditWithStatus: orchestrationMocks.buildPack,
  persistGlcOrchestrationPack: orchestrationMocks.persistPack,
}));

vi.mock('../services/logger.js', () => ({
  logger: loggerMocks,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));
vi.mock('../lib/idempotency.js', () => ({
  getStoredIdempotentResponse: idempotencyMocks.getStoredIdempotentResponse,
  storeIdempotentResponse: idempotencyMocks.storeIdempotentResponse,
  isIdempotencyPayloadConflictError: () => false,
}));

import { postOrchestrationPackController } from '../routes/audits/controllers/post-orchestration-pack.controller.js';

function createRes() {
  return {
    json: vi.fn(),
  } as unknown as import('express').Response;
}

describe('postOrchestrationPackController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagMocks.enabled = true;
    flagMocks.governanceRolloutMode = 'hard_structure_soft_quality';
    orchestrationMocks.buildPack.mockResolvedValue({
      status: 'not_ready',
      reason_code: 'strategy_row_missing',
    });
    orchestrationMocks.persistPack.mockResolvedValue({
      orchestration_pack_version: 1,
      last_revision_diff: null,
      error: null,
    });
    idempotencyMocks.getStoredIdempotentResponse.mockResolvedValue({
      key: null,
      hash: undefined,
      replay: undefined,
    });
    idempotencyMocks.storeIdempotentResponse.mockResolvedValue(undefined);
  });

  it('returns 403 when orchestration API flag is disabled', async () => {
    flagMocks.enabled = false;
    const res = createRes();
    const req = { params: { id: 'audit-1' }, userId: 'user-1', body: {} } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });

  it('returns 400 on invalid payload', async () => {
    const res = createRes();
    const req = { params: { id: 'audit-1' }, userId: 'user-1', body: { manifest_snapshot_id: 'bad-uuid' } } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      400,
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
  });

  it('returns 409 when pack is not ready', async () => {
    const res = createRes();
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: { manifest_snapshot_id: '00000000-0000-4000-8000-000000000001' },
    } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      409,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        not_ready_reason_code: 'strategy_row_missing',
      }),
    );
  });

  it('returns 400 when manifest does not match execution plan', async () => {
    orchestrationMocks.buildPack.mockRejectedValue(
      new RoadmapManifestMismatchError('mismatch'),
    );
    const res = createRes();
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: { manifest_snapshot_id: '00000000-0000-4000-8000-000000000001' },
    } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 400, expect.any(String), expect.any(String));
  });

  it('returns 500 when persist fails', async () => {
    orchestrationMocks.buildPack.mockResolvedValue({
      status: 'ok',
      pack: {
      version: 2,
      graph: { nodes: [{ id: 'n1', lane: 'tech_delivery', domain: 'tech_infrastructure' }], edges: [] },
      lanes: { product_change: [], tech_delivery: ['n1'], marketing_narrative: [], seo: [], processes_automation: [], risk_compliance: [] },
      critical_path: ['n1'],
      confidence_map: { node_confidence: { n1: 'high' } },
      risk_layer: { node_risk: { n1: 2 } },
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
      },
    });
    orchestrationMocks.persistPack.mockResolvedValue({
      orchestration_pack_version: 1,
      last_revision_diff: null,
      error: new Error('db failed'),
    });
    const res = createRes();
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: { manifest_snapshot_id: '00000000-0000-4000-8000-000000000001' },
    } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 500, expect.any(String), expect.any(String));
  });

  it('returns 409 when governance requires refinement before persistence', async () => {
    orchestrationMocks.buildPack.mockResolvedValue({
      status: 'ok',
      pack: {
      version: 2,
      graph: {
        nodes: [{ id: 'n1' }],
        edges: [{ from: 'n1', to: 'n1' }],
      },
      lanes: { product_change: [], tech_delivery: ['n1'], marketing_narrative: [], seo: [], processes_automation: [], risk_compliance: [] },
      critical_path: ['n1'],
      confidence_map: { node_confidence: { n1: 'high' } },
      risk_layer: { node_risk: { n1: 2 } },
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
      },
    });
    const res = createRes();
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: { manifest_snapshot_id: '00000000-0000-4000-8000-000000000001' },
    } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(orchestrationMocks.persistPack).not.toHaveBeenCalled();
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      409,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        plan_governance: expect.objectContaining({
          decision_hint: 'refine_plan',
        }),
      }),
    );
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      'orchestration_pack_rejected',
      expect.objectContaining({
        component: 'route.orchestration_pack',
        auditId: 'audit-1',
        metric: 'kpi_orchestration_plan_gate_reject',
        metric_legacy: 'orchestration_pack_run.refine_required',
        governance_reason_codes: expect.any(Array),
        director_input_coverage_ratio: expect.any(Number),
      }),
    );
  });

  it('returns persisted pack payload on success', async () => {
    const pack = {
      version: 2,
      graph: { nodes: [{ id: 'n1', lane: 'tech_delivery' }], edges: [] },
      lanes: { product_change: [], tech_delivery: ['n1'], marketing_narrative: [], seo: [], processes_automation: [], risk_compliance: [] },
      critical_path: ['n1'],
      confidence_map: { node_confidence: { n1: 'high' } },
      risk_layer: { node_risk: { n1: 2 } },
      conflicts_resolved: [{ id: 'c1', summary: 'ok' }],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
    };
    const lastDiff = { from_version: 1, to_version: 2 };
    orchestrationMocks.buildPack.mockResolvedValue({ status: 'ok', pack });
    orchestrationMocks.persistPack.mockResolvedValue({
      orchestration_pack_version: 2,
      last_revision_diff: lastDiff,
      error: null,
    });
    const res = createRes();
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: { manifest_snapshot_id: '00000000-0000-4000-8000-000000000001' },
    } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pack,
        orchestration_pack_version: 2,
        roadmap_version: 2,
        last_revision_diff: lastDiff,
        last_revision_diff_summary: expect.any(String),
        plan_governance: expect.objectContaining({
          decision_hint: expect.any(String),
        }),
      }),
    );
    expect(loggerMocks.info).toHaveBeenCalledWith(
      'orchestration_pack_success',
      expect.objectContaining({
        component: 'route.orchestration_pack',
        auditId: 'audit-1',
        metric: 'orchestration_pack_run.success',
        kpi_pack_refine_required: 0,
        kpi_pack_lane_imbalance: expect.any(Number),
      }),
    );
  });

  it('does not block persistence for structural issue in shadow mode', async () => {
    flagMocks.governanceRolloutMode = 'shadow';
    orchestrationMocks.buildPack.mockResolvedValue({
      status: 'ok',
      pack: {
      version: 2,
      graph: {
        nodes: [{ id: 'n1' }],
        edges: [{ from: 'n1', to: 'n1' }],
      },
      lanes: { product_change: [], tech_delivery: ['n1'], marketing_narrative: [], seo: [], processes_automation: [], risk_compliance: [] },
      critical_path: ['n1'],
      confidence_map: { node_confidence: { n1: 'high' } },
      risk_layer: { node_risk: { n1: 2 } },
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
      },
    });
    const res = createRes();
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: { manifest_snapshot_id: '00000000-0000-4000-8000-000000000001' },
    } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(orchestrationMocks.persistPack).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_governance: expect.objectContaining({
          rollout_mode: 'shadow',
          decision: 'persist',
        }),
      }),
    );
  });
});
