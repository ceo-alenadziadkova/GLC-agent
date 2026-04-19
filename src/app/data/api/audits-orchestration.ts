import { apiAuditsOrchestrationPack, apiAuditsRoadmapManifestSnapshots } from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type { GlcOrchestrationPackView } from '../audit/contracts/report/orchestration-pack.types';
import type { AuditMeta } from '../audit/contracts/core/audit-meta.types';
import type { OrchestrationChangeScenario, OrchestrationSeasonPreset } from '../../config/orchestration-roadmap-manifest';

export type RoadmapManifestRequestBody = {
  selected_domains: NonNullable<AuditMeta['execution_plan']>['selected_domains'];
  change_scenario: OrchestrationChangeScenario;
  season_preset: OrchestrationSeasonPreset;
};

export type RoadmapManifestSnapshotListItem = {
  id: string;
  created_at: string;
  payload: RoadmapManifestRequestBody;
};

export const auditsOrchestrationApi = {
  async getRoadmapManifestSnapshots(auditId: string, query?: { limit?: number }) {
    return apiFetch<{ snapshots: RoadmapManifestSnapshotListItem[] }>(
      apiAuditsRoadmapManifestSnapshots(auditId, query),
      { method: 'GET' },
    );
  },

  async postRoadmapManifestSnapshot(auditId: string, body: RoadmapManifestRequestBody) {
    return apiFetch<{ id: string }>(apiAuditsRoadmapManifestSnapshots(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getOrchestrationPack(auditId: string) {
    return apiFetch<{ pack: GlcOrchestrationPackView | null; orchestration_pack_version: number }>(
      apiAuditsOrchestrationPack(auditId),
      { method: 'GET' },
    );
  },

  async postOrchestrationPack(auditId: string, body: { manifest_snapshot_id: string }) {
    return apiFetch<{ pack: GlcOrchestrationPackView; orchestration_pack_version: number }>(
      apiAuditsOrchestrationPack(auditId),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },
};
