import {
  apiAuditsOrchestrationCommercialOffer,
  apiAuditsOrchestrationPackDiff,
  apiAuditsOrchestrationPack,
  apiAuditsOrchestrationPackRegenerate,
  apiAuditsOrchestrationPackDiffHistory,
  apiAuditsRoadmapManifestPreview,
  apiAuditsRoadmapManifestSnapshots,
  apiAuditsRoadmapManifestSnapshotsLatest,
} from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type {
  GlcOrchestrationPackRevisionDiffView,
  GlcOrchestrationPackView,
} from '../audit/contracts/report/orchestration-pack.types';
import type { AuditMeta } from '../audit/contracts/core/audit-meta.types';
import type { DomainKey } from '../auditTypes';
import type {
  OrchestrationChangeScenario,
  OrchestrationPreviewCompressionHint,
  OrchestrationPreviewLaneDensityBand,
  OrchestrationSeasonPreset,
} from '../../config/orchestration-roadmap-manifest';
import type { OrchestrationLaneId } from '../../config/orchestration-roadmap-ui-copy.en';

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

/** Response shape for `POST /api/audits/:id/roadmap/manifest-preview`. */
export type RoadmapManifestPreviewDto = {
  lanes_included: OrchestrationLaneId[];
  lanes_cut: OrchestrationLaneId[];
  waiting_list_domains: DomainKey[];
  execution_compression_hint: OrchestrationPreviewCompressionHint;
  lane_density_band: OrchestrationPreviewLaneDensityBand;
  confidence_callouts: string[];
};

export type OrchestrationPackRevisionHistoryItemDto = {
  from_version: number;
  to_version: number;
  diff: GlcOrchestrationPackRevisionDiffView;
};

export type OrchestrationPlanGovernanceDto = {
  unresolved_conflicts: number;
  cycles_detected: number;
  dangling_deps_count: number;
  invalid_lane_assignments: number;
  dependency_integrity_score: number;
  coverage_integrity_score: number;
  confidence_integrity_score: number;
  confidence_coverage_score: number;
  risk_coverage_score: number;
  critical_path_node_ratio: number;
  integrity_score: number;
  coverage_score: number;
  confidence_score: number;
  status: 'pass' | 'pass_with_warnings' | 'fail';
  decision: 'persist' | 'reject';
  rollout_mode: 'shadow' | 'hard_structure_soft_quality' | 'tightened_quality';
  decision_hint: 'accept_plan' | 'accept_with_warnings' | 'refine_plan';
  reason_codes: string[];
  blocking_reasons: string[];
  warnings_soft: string[];
  warnings: string[];
};

export type OrchestrationCommercialOfferResponseDto = {
  offers: Array<{
    domain: DomainKey;
    value_message: string;
    estimated_incremental_effort_weeks: number;
  }>;
  accepted_domain: DomainKey | null;
  base_preview: RoadmapManifestPreviewDto;
  recalculated_preview: RoadmapManifestPreviewDto | null;
  accepted_pack_result: {
    manifest_snapshot_id: string;
    orchestration_pack_version: number;
    roadmap_version: number;
    last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
    plan_governance: OrchestrationPlanGovernanceDto;
  } | null;
};

export const auditsOrchestrationApi = {
  async postRoadmapManifestPreview(auditId: string, body: RoadmapManifestRequestBody) {
    return apiFetch<{ preview: RoadmapManifestPreviewDto }>(apiAuditsRoadmapManifestPreview(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getRoadmapManifestSnapshots(auditId: string, query?: { limit?: number }) {
    return apiFetch<{ snapshots: RoadmapManifestSnapshotListItem[] }>(
      apiAuditsRoadmapManifestSnapshots(auditId, query),
      { method: 'GET' },
    );
  },

  async getRoadmapManifestSnapshotLatest(auditId: string) {
    return apiFetch<{ snapshot: { id: string; payload: RoadmapManifestRequestBody } | null }>(
      apiAuditsRoadmapManifestSnapshotsLatest(auditId),
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
    return apiFetch<{
      pack: GlcOrchestrationPackView | null;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      revision_history?: OrchestrationPackRevisionHistoryItemDto[];
      plan_governance: OrchestrationPlanGovernanceDto | null;
    }>(apiAuditsOrchestrationPack(auditId), { method: 'GET' });
  },

  async postOrchestrationPack(auditId: string, body: { manifest_snapshot_id: string }) {
    return apiFetch<{
      pack: GlcOrchestrationPackView;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance: OrchestrationPlanGovernanceDto;
    }>(apiAuditsOrchestrationPack(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postOrchestrationPackRegenerate(auditId: string, body: { manifest_snapshot_id: string }) {
    return apiFetch<{
      pack: GlcOrchestrationPackView;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance: OrchestrationPlanGovernanceDto;
    }>(apiAuditsOrchestrationPackRegenerate(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getOrchestrationPackDiffHistory(auditId: string, query?: { limit?: number }) {
    return apiFetch<{
      items: OrchestrationPackRevisionHistoryItemDto[];
      latest_plan_governance: OrchestrationPlanGovernanceDto | null;
    }>(apiAuditsOrchestrationPackDiffHistory(auditId, query), { method: 'GET' });
  },

  async getOrchestrationPackDiff(auditId: string, query: { from_version: number; to_version: number }) {
    return apiFetch<{
      item: OrchestrationPackRevisionHistoryItemDto;
    }>(apiAuditsOrchestrationPackDiff(auditId, query), { method: 'GET' });
  },

  async postOrchestrationCommercialOffer(
    auditId: string,
    body: RoadmapManifestRequestBody & { accept_domain?: DomainKey },
  ) {
    return apiFetch<OrchestrationCommercialOfferResponseDto>(apiAuditsOrchestrationCommercialOffer(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
