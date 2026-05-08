import {
  apiAuditsRoadmapManifestPreview,
  apiAuditsRoadmapManifestSnapshots,
  apiAuditsRoadmapManifestSnapshotsLatest,
  apiAuditsRoadmapManifestDraftRevisions,
  apiAuditsOrchestrationCompile,
  apiAuditsOrchestratorPreview,
} from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type {
  ManifestDraftRevisionPostBody,
  RoadmapManifestPreviewDto,
  RoadmapManifestRequestBody,
  RoadmapManifestSnapshotListItem,
} from './orchestration-types';
import type {
  GlcOrchestrationPackRevisionDiffView,
  GlcOrchestrationPackView,
} from '../audit/contracts/report/orchestration-pack.types';
import type { OrchestrationPlanGovernanceDto } from './orchestration-types';

export const auditsOrchestrationCompileApi = {
  async postRoadmapManifestPreview(auditId: string, body: RoadmapManifestRequestBody) {
    return apiFetch<{ preview: RoadmapManifestPreviewDto }>(apiAuditsRoadmapManifestPreview(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getRoadmapManifestSnapshots(auditId: string, query?: { limit?: number; signal?: AbortSignal }) {
    const { signal, ...pathQuery } = query ?? {};
    return apiFetch<{ snapshots: RoadmapManifestSnapshotListItem[] }>(
      apiAuditsRoadmapManifestSnapshots(auditId, pathQuery),
      { method: 'GET', ...(signal ? { signal } : {}) },
    );
  },

  async getRoadmapManifestSnapshotLatest(auditId: string, init?: Pick<RequestInit, 'signal'>) {
    return apiFetch<{ snapshot: { id: string; payload: RoadmapManifestRequestBody } | null }>(
      apiAuditsRoadmapManifestSnapshotsLatest(auditId),
      { method: 'GET', ...(init?.signal ? { signal: init.signal } : {}) },
    );
  },

  async postRoadmapManifestSnapshot(auditId: string, body: RoadmapManifestRequestBody) {
    return apiFetch<{ id: string }>(apiAuditsRoadmapManifestSnapshots(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postRoadmapManifestDraftRevision(auditId: string, body: ManifestDraftRevisionPostBody) {
    return apiFetch<{ ok: true; pending_count: number; digest: string }>(
      apiAuditsRoadmapManifestDraftRevisions(auditId),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },

  /** Compatibility aliases for Orchestrator v1 endpoint names. */
  async postOrchestratorPreview(auditId: string, body: RoadmapManifestRequestBody, init?: Pick<RequestInit, 'signal'>) {
    return apiFetch<{ preview: RoadmapManifestPreviewDto }>(apiAuditsOrchestratorPreview(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
      ...(init?.signal ? { signal: init.signal } : {}),
    });
  },

  /** Snapshot current manifest + build/persist pack in one request (`POST /orchestration/compile`). */
  async postOrchestrationCompile(auditId: string, body: RoadmapManifestRequestBody) {
    return apiFetch<{
      manifest_snapshot_id: string;
      pack: GlcOrchestrationPackView;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance: OrchestrationPlanGovernanceDto;
      rollout_transition: Record<string, unknown>;
      persisted_pack: GlcOrchestrationPackView | null;
    }>(apiAuditsOrchestrationCompile(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
