/**
 * Client view of persisted `glc_orchestration_pack` (server-validated JSON).
 * Keep fields aligned with `server/src/schemas/glc-orchestration-pack.ts`.
 */

import type { DomainKey } from '@glc/intake-core';
import type { OrchestrationLaneId } from '../../../../config/orchestration-roadmap-ui-copy.en';
import {
  ORCHESTRATION_PACK_DIFF_SCHEMA_VERSION,
  ORCHESTRATION_PACK_SCHEMA_VERSION,
  type OrchestrationInputGateStatus,
} from '../../../../config/orchestration-contract';

export type OrchestrationDependencyRelation = 'direct_blocker' | 'strong' | 'medium' | 'weak';
export type OrchestrationConflictResolution =
  | 'defer_growth'
  | 'mitigate_risk_now'
  | 'parallelize_with_guardrails'
  | 'synthesis_applied'
  | 'synthesis_pending';

export interface GlcOrchestrationPackView {
  version: typeof ORCHESTRATION_PACK_SCHEMA_VERSION;
  graph: {
    nodes: Array<{
      id: string;
      title: string;
      domain: DomainKey;
      lane: OrchestrationLaneId;
      source?: 'strategy' | 'director';
      analysis_depth?: 'baseline' | 'deep';
      season_index?: number;
      time_bucket?: 'now' | 'next' | 'later';
      target_window_days?: number;
      priority_score?: number;
      /** Director evidence buckets (item counts); optional on strategy-sourced nodes. */
      evidence_taxonomy?: {
        observed: number;
        derived: number;
        assumed: number;
        missing: number;
      };
      evidence_refs?: string[];
    }>;
    edges: Array<{ from: string; to: string; relation?: OrchestrationDependencyRelation; weight?: number }>;
    meta?: unknown;
  };
  lanes: Record<OrchestrationLaneId, string[]>;
  critical_path: string[];
  conflicts_resolved: Array<{
    id: string;
    summary: string;
    resolution: OrchestrationConflictResolution;
  }>;
  manifest_snapshot_id: string;
  phase_diagnostic?: {
    dominant_constraint: 'capacity' | 'technical_debt' | 'compliance_risk' | 'go_to_market';
    constraint_chain: Array<'capacity' | 'technical_debt' | 'compliance_risk' | 'go_to_market'>;
  };
  system_diagnosis?: {
    dominant_constraint: 'capacity' | 'technical_debt' | 'compliance_risk' | 'go_to_market';
    constraint_chain: Array<'capacity' | 'technical_debt' | 'compliance_risk' | 'go_to_market'>;
  };
  routing_profile?: {
    strategy: 'toc_dynamic_routing_v1';
    domain_weights: Record<string, number>;
  };
  execution_mode?: 'deterministic' | 'hybrid' | 'synthesis';
  confidence_map?: {
    node_confidence: Record<string, 'high' | 'medium' | 'low'>;
    unlock_conditions?: string[];
  };
  risk_layer?: {
    node_risk: Record<string, number>;
    cross_domain?: Array<{
      domains: [DomainKey, DomainKey];
      risk: number;
      note?: string;
    }>;
  };
  domain_influence?: {
    domain_weights: Record<string, number>;
  };
  input_quality?: {
    input_mode: 'director_enriched' | 'strategy_fallback';
    input_gate_status: OrchestrationInputGateStatus;
    director_coverage_ratio: number;
    director_input_coverage_ratio: number;
    degraded: boolean;
    fallback_reason_code?: 'director_slice_missing' | 'director_slice_partial' | 'director_slice_invalid';
  };
  top_actions?: {
    top_actions_7d: string[];
    top_actions_30d: string[];
  };
  top_7d?: string[];
  top_30d?: string[];
  data_gaps?: {
    degraded_input: boolean;
    fallback_reason_code?: 'director_slice_missing' | 'director_slice_partial' | 'director_slice_invalid';
    dangling_dependencies: number;
    missing_confidence: number;
    missing_risk: number;
  };
  compressed_plan?: boolean;
  metrics_framework?: {
    north_star?: string;
    leading?: string[];
    lagging?: string[];
  };
  /** ADR V4 plan-level control object (optional). */
  control_object?: {
    objective: string;
    constraints?: string[];
    exit_criteria?: string[];
    escalation_rules?: string[];
  };
}

/** Client view of `glc_orchestration_last_revision_diff` (server Zod: orchestration-pack-revision-diff). */
export interface GlcOrchestrationPackRevisionDiffView {
  schema_version?: typeof ORCHESTRATION_PACK_DIFF_SCHEMA_VERSION;
  from_version: number;
  to_version: number;
  nodes_added: string[];
  nodes_removed: string[];
  nodes_lane_changed: Array<{ id: string; from_lane: OrchestrationLaneId; to_lane: OrchestrationLaneId }>;
  edges_added: Array<{ from: string; to: string }>;
  edges_removed: Array<{ from: string; to: string }>;
  critical_path_changed: boolean;
  execution_mode_changed?: boolean;
  confidence_map_changed?: boolean;
  risk_layer_changed?: boolean;
  domain_influence_changed?: boolean;
  conflicts_resolved_before: number;
  conflicts_resolved_after: number;
}
