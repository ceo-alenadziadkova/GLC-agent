import {
  apiAuditsOrchestrationCommercialOffer,
  apiAuditsOrchestrationPackDiff,
  apiAuditsOrchestrationPack,
  apiAuditsOrchestrationSprintExport,
  apiAuditsOrchestrationSelectedInitiative,
  apiAuditsOrchestrationPackRegenerate,
  apiAuditsOrchestrationPackDiffHistory,
  apiAuditsOrchestratorLatest,
  apiAuditsOrchestratorPreview,
  apiAuditsOrchestratorRun,
  apiAuditsTimeline,
  apiAuditsDirectorDeepDive,
  apiAuditsDirectorDeepDiveStatus,
  apiAuditsDirectorDeepDiveQuota,
  apiAuditsRoadmapManifestPreview,
  apiAuditsRoadmapManifestSnapshots,
  apiAuditsRoadmapManifestSnapshotsLatest,
} from '../../config/api-paths';
import { API_URL, apiFetch, apiGetJsonOrNotModified, createTraceparent, getAuthHeaders } from '../api-http';
import { ApiError } from '../api-error';
import type {
  GlcOrchestrationPackRevisionDiffView,
  GlcOrchestrationPackView,
} from '../audit/contracts/report/orchestration-pack.types';
import type { AuditMeta } from '../audit/contracts/core/audit-meta.types';
import type { DomainKey } from '../auditTypes';
import type {
  OrchestrationChangeScenario,
  OrchestrationManifestSchemaVersion,
  OrchestrationPlanHorizon,
  OrchestrationPreviewCompressionHint,
  OrchestrationPreviewLaneDensityBand,
  OrchestrationRiskTolerancePreset,
  OrchestrationSeasonPreset,
} from '../../config/orchestration-roadmap-manifest';
import type { OrchestrationLaneId } from '../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationPlanGovernanceReasonCode } from '../../config/orchestration-plan-governance';
import type {
  OrchestrationManifestState,
  OrchestrationPlanGateOutcome,
  OrchestrationPlanGovernanceRolloutMode,
  OrchestrationTimelineStatus,
} from '../../config/orchestration-contract';

export type RoadmapManifestRequestBody = {
  schema_version: OrchestrationManifestSchemaVersion;
  selected_domains: NonNullable<AuditMeta['execution_plan']>['selected_domains'];
  change_scenario: OrchestrationChangeScenario;
  season_preset: OrchestrationSeasonPreset;
  risk_tolerance?: OrchestrationRiskTolerancePreset;
  plan_horizon?: OrchestrationPlanHorizon;
  selected_action_ids?: string[];
};
export type RoadmapInputManifest = RoadmapManifestRequestBody;

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
  govern_action?: 'accept_plan' | 'accept_with_warnings' | 'refine_plan';
  revision_reason?: string;
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
  rollout_mode: OrchestrationPlanGovernanceRolloutMode;
  decision_hint: 'accept_plan' | 'accept_with_warnings' | 'refine_plan';
  plan_gate_outcome: OrchestrationPlanGateOutcome;
  reason_codes: OrchestrationPlanGovernanceReasonCode[];
  blocking_reasons: OrchestrationPlanGovernanceReasonCode[];
  warnings_soft: OrchestrationPlanGovernanceReasonCode[];
  warnings: string[];
};

export type AuditTimelineDto = {
  status: OrchestrationTimelineStatus;
  version: {
    roadmap_version: number;
    manifest_snapshot_id: string | null;
    latest_manifest_snapshot_id: string | null;
    stale_manifest: boolean;
    manifest_state: OrchestrationManifestState;
    season_preset?: OrchestrationSeasonPreset | null;
    plan_horizon?: OrchestrationPlanHorizon | null;
  };
  seasons: Array<{ id: 'near' | 'mid' | 'far'; node_ids: string[] }>;
  lanes: Array<{
    lane_id: OrchestrationLaneId;
    items: Array<{
      id: string;
      title: string;
      domain: DomainKey;
      lane: OrchestrationLaneId;
      season_index?: number;
      time_bucket?: 'now' | 'next' | 'later';
      /** Present for nodes enriched from director or explicit baseline/deep synthesis. */
      analysis_depth?: 'baseline' | 'deep';
      /** Provenance is optional for backward-compatible timeline payloads. */
      source?: 'strategy' | 'director' | `sub_agent:${string}`;
      explain?: {
        why?: string[];
        how?: { path_type?: string; description: string; time_estimate?: string };
        impact?: { score?: number; label?: string };
        time?: { bucket?: 'now' | 'next' | 'later'; target_window_days?: number; time_to_value?: string };
        risks?: string[];
        limited_context?: boolean;
      };
    }>;
  }>;
  dependencies: Array<{
    from: string;
    to: string;
    relation: 'direct_blocker' | 'strong' | 'medium' | 'weak';
    cross_lane: boolean;
    blocking: boolean;
  }>;
  milestones?: Array<{
    id: string;
    label: string;
    target_window_days: number;
    unlocks: string[];
  }>;
  /** @deprecated Use `top_priorities` for client-priority narrative rendering. */
  top_7d: string[];
  /** @deprecated Use `top_priorities` for client-priority narrative rendering. */
  top_30d: string[];
  top_priorities?: Array<{
    bucket: '7d' | '30d';
    action_id: string;
    reason_code: string;
  }>;
  waiting_list_domains: DomainKey[];
  data_gaps: {
    degraded_input: boolean;
    fallback_reason_code?: 'director_slice_missing' | 'director_slice_partial' | 'director_slice_invalid';
    dangling_dependencies: number;
    missing_confidence: number;
    missing_risk: number;
  } | null;
};

export type OrchestrationCommercialOfferResponseDto = {
  offers: Array<{
    domain: DomainKey;
    value_message: string;
    estimated_incremental_effort_weeks: number;
    why_now_bullets: string[];
  }>;
  accepted_domain: DomainKey | null;
  base_preview: RoadmapManifestPreviewDto;
  recalculated_preview: RoadmapManifestPreviewDto | null;
  accepted_pack_result: {
    manifest_snapshot_id: string;
    orchestration_pack_version: number;
    roadmap_version: number;
    last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
    last_revision_diff_summary?: string | null;
    plan_governance: OrchestrationPlanGovernanceDto;
  } | null;
};

export type DirectorDeepDiveRequestBody = {
  focus_areas?: string[];
  client_context: {
    goals: string[];
    constraints: string[];
    timeframe_days?: number;
  };
  idempotency_key: string;
  operating_mode?: 'discovery' | 'launch' | 'growth' | 'authority' | 'defense';
  sub_agent_ids?: string[];
};

export type OrchestrationPackGetBody = {
  pack: GlcOrchestrationPackView | null;
  orchestration_pack_version: number;
  roadmap_version: number;
  last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
  last_revision_diff_summary?: string | null;
  revision_history?: OrchestrationPackRevisionHistoryItemDto[];
  plan_governance: OrchestrationPlanGovernanceDto | null;
};

export type OrchestrationPackConditionalGetResult =
  | { kind: 'ok'; data: OrchestrationPackGetBody }
  | { kind: 'not_modified' };

export const auditsOrchestrationApi = {
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

  /** `GET /api/audits/:id/orchestration/pack` — matches server JSON (governance, revision, optional revision_history). */
  async getOrchestrationPack(auditId: string) {
    return apiFetch<OrchestrationPackGetBody>(apiAuditsOrchestrationPack(auditId), { method: 'GET' });
  },

  /**
   * Same resource as `getOrchestrationPack` with optional `If-None-Match` (server ETag: `"orchestration-pack-v{version}"`).
   * On 304, returns `kind: 'not_modified'` — use cached React Query data.
   */
  async getOrchestrationPackConditional(
    auditId: string,
    ifNoneMatch: string | undefined,
  ): Promise<OrchestrationPackConditionalGetResult> {
    const path = apiAuditsOrchestrationPack(auditId);
    if (!ifNoneMatch) {
      const data = await apiFetch<OrchestrationPackGetBody>(path, { method: 'GET' });
      return { kind: 'ok' as const, data };
    }
    const r = await apiGetJsonOrNotModified<OrchestrationPackGetBody>(path, { ifNoneMatch });
    if (r.kind === 'not_modified') {
      return { kind: 'not_modified' as const };
    }
    return { kind: 'ok' as const, data: r.data };
  },

  async postOrchestrationPack(
    auditId: string,
    body:
      | { manifest_snapshot_id: string; selected_action_ids?: string[] }
      | {
          govern_action: 'accept_plan' | 'accept_with_warnings' | 'refine_plan';
          expected_orchestration_pack_version: number;
        },
  ) {
    return apiFetch<{
      pack: GlcOrchestrationPackView | null;
      orchestration_pack_version: number;
      roadmap_version?: number;
      last_revision_diff?: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance?: OrchestrationPlanGovernanceDto;
      refine_hint?: boolean;
      govern_action?: 'accept_plan' | 'accept_with_warnings' | 'refine_plan';
    }>(apiAuditsOrchestrationPack(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postOrchestrationPackRegenerate(auditId: string, body: { manifest_snapshot_id: string; selected_action_ids?: string[] }) {
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

  async postSelectedInitiative(auditId: string, body: { action_id: string }) {
    return apiFetch<{
      pack: GlcOrchestrationPackView;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance: OrchestrationPlanGovernanceDto;
    }>(apiAuditsOrchestrationSelectedInitiative(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getOrchestrationPackDiffHistory(auditId: string, query?: { limit?: number; signal?: AbortSignal }) {
    const { signal, ...pathQuery } = query ?? {};
    return apiFetch<{
      items: OrchestrationPackRevisionHistoryItemDto[];
      latest_plan_governance: OrchestrationPlanGovernanceDto | null;
    }>(apiAuditsOrchestrationPackDiffHistory(auditId, pathQuery), {
      method: 'GET',
      ...(signal ? { signal } : {}),
    });
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

  /** Compatibility aliases for Orchestrator v1 endpoint names. */
  async postOrchestratorPreview(auditId: string, body: RoadmapManifestRequestBody, init?: Pick<RequestInit, 'signal'>) {
    return apiFetch<{ preview: RoadmapManifestPreviewDto }>(apiAuditsOrchestratorPreview(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
      ...(init?.signal ? { signal: init.signal } : {}),
    });
  },

  async postOrchestratorRun(auditId: string, body: { manifest_snapshot_id: string; selected_action_ids?: string[] }) {
    return apiFetch<{
      pack: GlcOrchestrationPackView;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance: OrchestrationPlanGovernanceDto;
    }>(apiAuditsOrchestratorRun(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getOrchestratorLatest(auditId: string) {
    return apiFetch<{
      pack: GlcOrchestrationPackView | null;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      revision_history?: OrchestrationPackRevisionHistoryItemDto[];
      plan_governance: OrchestrationPlanGovernanceDto | null;
    }>(apiAuditsOrchestratorLatest(auditId), { method: 'GET' });
  },

  async getAuditTimeline(auditId: string) {
    return apiFetch<{ timeline: AuditTimelineDto }>(apiAuditsTimeline(auditId), { method: 'GET' });
  },

  async postDirectorDeepDive(auditId: string, domainKey: DomainKey, body: DirectorDeepDiveRequestBody) {
    return apiFetch<{ job_id: string; status: 'queued'; estimated_duration_minutes: number }>(
      apiAuditsDirectorDeepDive(auditId, domainKey),
      {
      method: 'POST',
      body: JSON.stringify(body),
      },
    );
  },

  async getDirectorDeepDiveStatus(auditId: string, domainKey: DomainKey, jobId: string) {
    return apiFetch<{
      job_id: string;
      status: 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
      started_at: string | null;
      completed_at: string | null;
      error_code?: string;
      qa_block?: {
        coherence: string;
        feasibility: string;
        top_3_actions: string[];
        risks: string[];
        measurement: string[];
      };
    }>(apiAuditsDirectorDeepDiveStatus(auditId, domainKey, jobId), {
      method: 'GET',
    });
  },

  async getDirectorDeepDiveQuota(auditId: string, domainKey: DomainKey) {
    return apiFetch<{
      coverage_package: 'starter' | 'pro' | 'complete';
      per_domain_limit: number;
      used_count: number;
      remaining: number;
    }>(apiAuditsDirectorDeepDiveQuota(auditId, domainKey), { method: 'GET' });
  },

  /**
   * CSV sprint export: orchestration graph + optional latest execution pack tasks
   * (`GET /api/audits/:id/orchestration/sprint-export?format=csv`).
   */
  async downloadOrchestrationSprintExportCsv(auditId: string): Promise<string> {
    const path = apiAuditsOrchestrationSprintExport(auditId, { format: 'csv' });
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: {
        traceparent: createTraceparent(),
        'x-operation-id': crypto.randomUUID(),
        ...authHeaders,
      },
    });
    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      throw new ApiError(
        errBody.error ?? `API error: ${response.status}`,
        response.status,
        typeof errBody.code === 'string' ? errBody.code : undefined,
      );
    }
    return response.text();
  },
};
