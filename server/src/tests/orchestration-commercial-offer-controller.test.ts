import { beforeEach, describe, expect, it, vi } from 'vitest';

const flagMocks = vi.hoisted(() => ({
  enabled: true,
  governanceRolloutMode: 'hard_structure_soft_quality' as
    | 'shadow'
    | 'hard_structure_soft_quality'
    | 'tightened_quality',
}));
const readMocks = vi.hoisted(() => ({
  loadAuditExecutionPlanRow: vi.fn(),
  updateAuditExecutionPlanSelectedDomainsForUser: vi.fn(),
  buildOrchestrationPackForAudit: vi.fn(),
  persistGlcOrchestrationPack: vi.fn(),
}));
const offerMocks = vi.hoisted(() => ({ buildOrchestrationCommercialOffer: vi.fn() }));
const governanceMocks = vi.hoisted(() => ({ evaluate: vi.fn() }));
const manifestMocks = vi.hoisted(() => ({ insert: vi.fn(), assertManifestMatchesExecutionPlan: vi.fn() }));
const RoadmapManifestMismatchErrorMock = vi.hoisted(
  () =>
    class RoadmapManifestMismatchError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'RoadmapManifestMismatchError';
      }
    },
);
const sendApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => flagMocks.enabled,
    getOrchestrationPlanGovernanceRolloutMode: () => flagMocks.governanceRolloutMode,
  };
});

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  loadAuditExecutionPlanRow: readMocks.loadAuditExecutionPlanRow,
  updateAuditExecutionPlanSelectedDomainsForUser: readMocks.updateAuditExecutionPlanSelectedDomainsForUser,
  buildOrchestrationPackForAudit: readMocks.buildOrchestrationPackForAudit,
  persistGlcOrchestrationPack: readMocks.persistGlcOrchestrationPack,
}));

vi.mock('../services/orchestration/orchestration-commercial-offer.service.js', () => ({
  buildOrchestrationCommercialOffer: offerMocks.buildOrchestrationCommercialOffer,
}));

vi.mock('../services/orchestration/orchestration-plan-governance.service.js', () => ({
  evaluateOrchestrationPlanGovernance: governanceMocks.evaluate,
}));

vi.mock('../services/orchestration/roadmap-manifest.service.js', () => ({
  insertRoadmapManifestSnapshot: manifestMocks.insert,
  assertManifestMatchesExecutionPlan: manifestMocks.assertManifestMatchesExecutionPlan,
  RoadmapManifestMismatchError: RoadmapManifestMismatchErrorMock,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { postOrchestrationCommercialOfferController } from '../routes/audits/controllers/post-orchestration-commercial-offer.controller.js';

function createRes() {
  return { json: vi.fn() } as unknown as import('express').Response;
}

describe('postOrchestrationCommercialOfferController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagMocks.enabled = true;
    flagMocks.governanceRolloutMode = 'hard_structure_soft_quality';
    readMocks.loadAuditExecutionPlanRow.mockResolvedValue({
      plan: { selected_domains: ['seo_digital'] },
    });
    readMocks.updateAuditExecutionPlanSelectedDomainsForUser.mockResolvedValue({
      plan: { selected_domains: ['seo_digital', 'marketing_utp'] },
      error: null,
    });
    readMocks.buildOrchestrationPackForAudit.mockResolvedValue({
      graph: { nodes: [], edges: [] },
      conflicts_resolved: [],
    });
    readMocks.persistGlcOrchestrationPack.mockResolvedValue({
      orchestration_pack_version: 2,
      last_revision_diff: null,
      error: null,
    });
    governanceMocks.evaluate.mockReturnValue({
      unresolved_conflicts: 0,
      cycles_detected: 0,
      dangling_deps_count: 0,
      dependency_integrity_score: 1,
      coverage_integrity_score: 1,
      confidence_integrity_score: 1,
      confidence_coverage_score: 1,
      risk_coverage_score: 1,
      critical_path_node_ratio: 1,
      integrity_score: 1,
      coverage_score: 1,
      confidence_score: 1,
      status: 'pass',
      decision: 'persist',
      rollout_mode: 'hard_structure_soft_quality',
      decision_hint: 'accept_plan',
      reason_codes: [],
      blocking_reasons: [],
      warnings_soft: [],
      warnings: [],
    });
    manifestMocks.insert.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' });
    manifestMocks.assertManifestMatchesExecutionPlan.mockImplementation(() => undefined);
    offerMocks.buildOrchestrationCommercialOffer.mockReturnValue({
      offers: [],
      accepted_domain: null,
      base_preview: {
        lanes_included: ['seo'],
        lanes_cut: [],
        waiting_list_domains: [],
        execution_compression_hint: 'none',
        lane_density_band: 'standard',
        confidence_callouts: [],
      },
      recalculated_preview: null,
      accepted_pack_result: null,
    });
  });

  it('returns 403 when flag disabled', async () => {
    flagMocks.enabled = false;
    const req = { params: { id: 'a1' }, userId: 'u1', body: {} } as unknown;
    const res = createRes();
    await postOrchestrationCommercialOfferController(req as never, res);
    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });

  it('returns payload on success', async () => {
    const req = {
      params: { id: 'a1' },
      userId: 'u1',
      body: {
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    } as unknown;
    const res = createRes();
    await postOrchestrationCommercialOfferController(req as never, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('returns 400 when request manifest diverges from execution plan', async () => {
    manifestMocks.assertManifestMatchesExecutionPlan.mockImplementation(() => {
      throw new RoadmapManifestMismatchErrorMock('mismatch');
    });
    const req = {
      params: { id: 'a1' },
      userId: 'u1',
      body: {
        selected_domains: ['marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    } as unknown;
    const res = createRes();
    await postOrchestrationCommercialOfferController(req as never, res);
    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 400, expect.any(String), expect.any(String));
  });

  it('rebuilds and persists pack when accept_domain is provided', async () => {
    offerMocks.buildOrchestrationCommercialOffer.mockReturnValue({
      offers: [],
      accepted_domain: 'marketing_utp',
      base_preview: {
        lanes_included: ['seo'],
        lanes_cut: [],
        waiting_list_domains: [],
        execution_compression_hint: 'none',
        lane_density_band: 'standard',
        confidence_callouts: [],
      },
      recalculated_preview: {
        lanes_included: ['seo', 'marketing_narrative'],
        lanes_cut: [],
        waiting_list_domains: [],
        execution_compression_hint: 'none',
        lane_density_band: 'standard',
        confidence_callouts: [],
      },
      accepted_pack_result: null,
    });
    const req = {
      params: { id: 'a1' },
      userId: 'u1',
      body: {
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        accept_domain: 'marketing_utp',
      },
    } as unknown;
    const res = createRes();
    await postOrchestrationCommercialOfferController(req as never, res);
    expect(readMocks.updateAuditExecutionPlanSelectedDomainsForUser).toHaveBeenCalled();
    expect(manifestMocks.insert).toHaveBeenCalled();
    expect(readMocks.buildOrchestrationPackForAudit).toHaveBeenCalled();
    expect(readMocks.persistGlcOrchestrationPack).toHaveBeenCalled();
    expect(governanceMocks.evaluate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rolloutMode: 'hard_structure_soft_quality' }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accepted_pack_result: expect.objectContaining({
          roadmap_version: 2,
        }),
      }),
    );
  });

  it('returns 409 when accepted rebuild requires refinement', async () => {
    governanceMocks.evaluate.mockReturnValue({
      unresolved_conflicts: 2,
      cycles_detected: 1,
      dangling_deps_count: 0,
      dependency_integrity_score: 0.5,
      coverage_integrity_score: 0.5,
      confidence_integrity_score: 0.5,
      confidence_coverage_score: 1,
      risk_coverage_score: 1,
      critical_path_node_ratio: 0.5,
      integrity_score: 0.5,
      coverage_score: 0.5,
      confidence_score: 1,
      status: 'fail',
      decision: 'reject',
      rollout_mode: 'hard_structure_soft_quality',
      decision_hint: 'refine_plan',
      warnings: ['Dependency cycles detected'],
      reason_codes: ['dependency_cycles_detected'],
      blocking_reasons: ['dependency_cycles_detected'],
      warnings_soft: [],
    });
    offerMocks.buildOrchestrationCommercialOffer.mockReturnValue({
      offers: [],
      accepted_domain: 'marketing_utp',
      base_preview: {
        lanes_included: ['seo'],
        lanes_cut: [],
        waiting_list_domains: [],
        execution_compression_hint: 'none',
        lane_density_band: 'standard',
        confidence_callouts: [],
      },
      recalculated_preview: {
        lanes_included: ['seo', 'marketing_narrative'],
        lanes_cut: [],
        waiting_list_domains: [],
        execution_compression_hint: 'none',
        lane_density_band: 'standard',
        confidence_callouts: [],
      },
      accepted_pack_result: null,
    });
    const req = {
      params: { id: 'a1' },
      userId: 'u1',
      body: {
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        accept_domain: 'marketing_utp',
      },
    } as unknown;
    const res = createRes();
    await postOrchestrationCommercialOfferController(req as never, res);
    expect(readMocks.updateAuditExecutionPlanSelectedDomainsForUser).toHaveBeenCalledTimes(2);
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
  });

  it('rolls back execution plan when persist fails during accepted rebuild', async () => {
    offerMocks.buildOrchestrationCommercialOffer.mockReturnValue({
      offers: [],
      accepted_domain: 'marketing_utp',
      base_preview: {
        lanes_included: ['seo'],
        lanes_cut: [],
        waiting_list_domains: [],
        execution_compression_hint: 'none',
        lane_density_band: 'standard',
        confidence_callouts: [],
      },
      recalculated_preview: {
        lanes_included: ['seo', 'marketing_narrative'],
        lanes_cut: [],
        waiting_list_domains: [],
        execution_compression_hint: 'none',
        lane_density_band: 'standard',
        confidence_callouts: [],
      },
      accepted_pack_result: null,
    });
    readMocks.persistGlcOrchestrationPack.mockResolvedValueOnce({
      orchestration_pack_version: 2,
      last_revision_diff: null,
      error: new Error('persist failed'),
    });
    const req = {
      params: { id: 'a1' },
      userId: 'u1',
      body: {
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        accept_domain: 'marketing_utp',
      },
    } as unknown;
    const res = createRes();
    await postOrchestrationCommercialOfferController(req as never, res);

    expect(readMocks.updateAuditExecutionPlanSelectedDomainsForUser).toHaveBeenCalledTimes(2);
    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 500, expect.any(String), expect.any(String));
  });
});
