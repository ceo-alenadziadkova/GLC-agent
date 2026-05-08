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
  /** v3 manifest: execution hints merged from Delivery Board draft queue on save. */
  node_execution_hints?: Partial<Record<string, { lane?: OrchestrationLaneId; owner_hint?: string }>>;
};
export type RoadmapInputManifest = RoadmapManifestRequestBody;

export type ManifestDraftRevisionPostBody = {
  canonical_node_key: string;
  expected_pack_version: number;
  lane?: OrchestrationLaneId;
  owner_hint?: string;
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

export type PlanBoardCardDto = {
  id: string;
  source: 'pack' | 'manual';
  column_id: string;
  position: number;
  pinned: boolean;
  delivery_area: string;
  canonical_node_key: string | null;
  pack_graph_node_id: string | null;
  orphaned_reason: 'node_removed' | 'lane_changed' | null;
  title: string | null;
  lane: string | null;
  ticket_description: string | null;
  assignee: string | null;
  assignee_user_id: string | null;
  labels: string[];
  story_points: number | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  start_date: string | null;
  due_date: string | null;
  end_date: string | null;
  updated_by_user_id: string | null;
};

export type PlanTicketEventDto = {
  id: string;
  actor_user_id: string | null;
  source_surface: string;
  action: string;
  field_changes: Record<string, unknown>;
  created_at: string;
};

export type PlanTicketCommentDto = {
  id: string;
  author_user_id: string | null;
  body: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
};

export type PlanBoardIssueCode = 'no_pack' | 'governance_blocked';

export type PlanBoardColumnDto = {
  id: string;
  title: string;
  semantic:
    | 'backlog'
    | 'next_up'
    | 'in_progress'
    | 'review'
    | 'done'
    | 'blocked'
    | null;
  visible_to_client: boolean;
};

export type PlanBoardTimelineParityDto = {
  season_preset: OrchestrationSeasonPreset | null;
  top_7d: string[];
  top_30d: string[];
  top_priorities: Array<{ bucket: '7d' | '30d'; action_id: string; reason_code: string }>;
  milestones: Array<{
    id: string;
    label: string;
    target_window_days: number;
    unlocks: string[];
  }>;
};

export type PlanBoardGetBody = {
  pack_version_used: number;
  cards: PlanBoardCardDto[];
  issues: Array<{ code: PlanBoardIssueCode }>;
  /** Consultant or platform admin: whether `PATCH …/plan/board/column-policy` may succeed for this audit. */
  column_policy_editable?: boolean | undefined;
  /** Operational column metadata (Epic 3); identity defaults when omitted for older responses. */
  columns?: PlanBoardColumnDto[];
  /** Mirrors narrative Timeline parity fields without a separate GET /timeline (ADR TD-023). */
  timeline_parity?: PlanBoardTimelineParityDto | undefined;
  /** Consultant-only digest when Epic 2.1-C flag is enabled (empty string when queue is empty). */
  manifest_draft_revision_digest?: string;
  manifest_draft_revision_pending_canonical_keys?: string[];
};

/** `POST …/plan/board/reconcile/preview` — pure projection counts + bounded samples (server `PlanBoardReconcilePreviewDto`). */
export type PlanBoardReconcilePreviewDto = {
  orchestration_pack_version: number;
  matched: number;
  orphaned_node_removed: number;
  orphaned_lane_changed: number;
  auto_created: number;
  sample_new_backlog_cards: Array<{ canonical_node_key: string; title: string }>;
  sample_orphan_node_removed: Array<{ canonical_node_key: string; title: string }>;
};

export type PlanBoardCardPatchBody = {
  to_column?: string;
  position?: number;
  pinned?: boolean;
  delivery_area?: string;
  title?: string;
  lane?: string;
  ticket_description?: string;
  assignee?: string;
  assignee_user_id?: string | null;
  labels?: string[];
  story_points?: number | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  due_date?: string;
  end_date?: string;
  expected_pack_version: number;
};

export type PlanBoardCardBatchPatchBody = {
  expected_pack_version: number;
  patches: Array<Omit<PlanBoardCardPatchBody, 'expected_pack_version'> & { card_id: string }>;
};

export type PlanBoardCardDeleteBody = {
  expected_pack_version: number;
};

export type PlanBoardColumnPolicyReplaceBody = {
  schema_version: 1;
  columns: Array<{ id: string; title: string }>;
  semantics: {
    backlog: string;
    next_up: string;
    in_progress: string;
    review: string;
    done: string;
    blocked: string;
  };
};

export type PlanBoardColumnPolicyPatchBody =
  | { kind: 'reset' }
  | { kind: 'replace'; policy: PlanBoardColumnPolicyReplaceBody };

export type PipelinePhaseResultPatchBody = {
  result: Record<string, unknown>;
};
