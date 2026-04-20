/**
 * Client view of persisted `glc_orchestration_pack` (server-validated JSON).
 * Keep fields aligned with `server/src/schemas/glc-orchestration-pack.ts`.
 */

export interface GlcOrchestrationPackView {
  version: number;
  graph: {
    nodes: Array<{
      id: string;
      title: string;
      domain: string;
      lane: string;
      source?: 'strategy' | 'director';
      analysis_depth?: 'baseline' | 'deep';
      season_index?: number;
      time_bucket?: 'now' | 'next' | 'later';
      target_window_days?: number;
      priority_score?: number;
    }>;
    edges: Array<{ from: string; to: string; relation?: 'direct_blocker' | 'strong' | 'medium' | 'weak'; weight?: number }>;
    meta?: unknown;
  };
  lanes: Record<string, string[]>;
  critical_path: string[];
  conflicts_resolved: Array<{
    id: string;
    summary: string;
    resolution: string;
  }>;
  manifest_snapshot_id: string;
  phase_diagnostic?: {
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
  };
  risk_layer?: {
    node_risk: Record<string, number>;
  };
  domain_influence?: {
    domain_weights: Record<string, number>;
  };
}

/** Client view of `glc_orchestration_last_revision_diff` (server Zod: orchestration-pack-revision-diff). */
export interface GlcOrchestrationPackRevisionDiffView {
  from_version: number;
  to_version: number;
  nodes_added: string[];
  nodes_removed: string[];
  nodes_lane_changed: Array<{ id: string; from_lane: string; to_lane: string }>;
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
