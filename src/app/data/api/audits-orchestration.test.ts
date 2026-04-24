import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../api-http', () => ({
  apiFetch: apiFetchMock,
}));

import { auditsOrchestrationApi } from './audits-orchestration';
import {
  apiAuditsOrchestrationCommercialOffer,
  apiAuditsOrchestrationPackDiff,
  apiAuditsOrchestrationPackRegenerate,
  apiAuditsOrchestrationPackDiffHistory,
  apiAuditsOrchestratorLatest,
  apiAuditsOrchestratorPreview,
  apiAuditsOrchestratorRun,
  apiAuditsTimeline,
  apiAuditsRoadmapManifestSnapshotsLatest,
} from '../../config/api-paths';
import { ORCHESTRATION_MANIFEST_SCHEMA_VERSION } from '../../config/orchestration-roadmap-manifest';

describe('auditsOrchestrationApi', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it('calls diff-history endpoint with limit query', async () => {
    await auditsOrchestrationApi.getOrchestrationPackDiffHistory('audit-1', { limit: 7 });
    expect(apiFetchMock).toHaveBeenCalledWith(
      apiAuditsOrchestrationPackDiffHistory('audit-1', { limit: 7 }),
      { method: 'GET' },
    );
  });

  it('calls latest manifest snapshot endpoint', async () => {
    await auditsOrchestrationApi.getRoadmapManifestSnapshotLatest('audit-1');
    expect(apiFetchMock).toHaveBeenCalledWith(apiAuditsRoadmapManifestSnapshotsLatest('audit-1'), {
      method: 'GET',
    });
  });

  it('calls regenerate pack endpoint', async () => {
    await auditsOrchestrationApi.postOrchestrationPackRegenerate('audit-1', { manifest_snapshot_id: 'snapshot-1' });
    expect(apiFetchMock).toHaveBeenCalledWith(apiAuditsOrchestrationPackRegenerate('audit-1'), {
      method: 'POST',
      body: JSON.stringify({ manifest_snapshot_id: 'snapshot-1' }),
    });
  });

  it('calls pack-diff endpoint with version params', async () => {
    await auditsOrchestrationApi.getOrchestrationPackDiff('audit-1', { from_version: 2, to_version: 3 });
    expect(apiFetchMock).toHaveBeenCalledWith(
      apiAuditsOrchestrationPackDiff('audit-1', { from_version: 2, to_version: 3 }),
      { method: 'GET' },
    );
  });

  it('posts commercial offer payload including accepted domain', async () => {
    await auditsOrchestrationApi.postOrchestrationCommercialOffer('audit-1', {
      schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
      selected_domains: ['seo_digital'],
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
      accept_domain: 'marketing_utp',
    });
    expect(apiFetchMock).toHaveBeenCalledWith(apiAuditsOrchestrationCommercialOffer('audit-1'), {
      method: 'POST',
      body: JSON.stringify({
        schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        accept_domain: 'marketing_utp',
      }),
    });
  });

  it('calls orchestrator preview alias endpoint', async () => {
    await auditsOrchestrationApi.postOrchestratorPreview('audit-1', {
      schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
      selected_domains: ['seo_digital'],
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
    });
    expect(apiFetchMock).toHaveBeenCalledWith(apiAuditsOrchestratorPreview('audit-1'), {
      method: 'POST',
      body: JSON.stringify({
        schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      }),
    });
  });

  it('calls orchestrator run alias endpoint', async () => {
    await auditsOrchestrationApi.postOrchestratorRun('audit-1', { manifest_snapshot_id: 'snapshot-1' });
    expect(apiFetchMock).toHaveBeenCalledWith(apiAuditsOrchestratorRun('audit-1'), {
      method: 'POST',
      body: JSON.stringify({ manifest_snapshot_id: 'snapshot-1' }),
    });
  });

  it('calls orchestrator latest alias endpoint', async () => {
    await auditsOrchestrationApi.getOrchestratorLatest('audit-1');
    expect(apiFetchMock).toHaveBeenCalledWith(apiAuditsOrchestratorLatest('audit-1'), { method: 'GET' });
  });

  it('calls audit timeline endpoint', async () => {
    await auditsOrchestrationApi.getAuditTimeline('audit-1');
    expect(apiFetchMock).toHaveBeenCalledWith(apiAuditsTimeline('audit-1'), { method: 'GET' });
  });
});
