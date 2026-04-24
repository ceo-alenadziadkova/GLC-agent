import type {
  OrchestrationConstraintKey,
  OrchestrationConflictResolution,
  OrchestrationFallbackReasonCode,
  OrchestrationInputMode,
  OrchestrationDependencyRelationKind,
  OrchestrationExecutionMode,
  OrchestrationGraphNodeAnalysisDepth,
  OrchestrationGraphNodeSource,
  OrchestrationInputGateStatus,
} from '../../config/orchestration-graph-policy.js';
import type { OrchestrationLaneId } from '../../config/orchestration-lanes.js';
import type { StrategyInitiativeDomainKey } from '../../config/strategy-initiative-policy.js';

export type { OrchestrationConflictResolution } from '../../config/orchestration-graph-policy.js';
export type { OrchestrationLaneId } from '../../config/orchestration-lanes.js';
export type {
  OrchestrationConstraintKey,
  OrchestrationDependencyRelationKind,
  OrchestrationExecutionMode,
  OrchestrationFallbackReasonCode,
  OrchestrationGraphNodeAnalysisDepth,
  OrchestrationInputMode,
  OrchestrationGraphNodeSource,
  OrchestrationInputGateStatus,
} from '../../config/orchestration-graph-policy.js';

/**
 * Normalized action vertex for orchestration (from StrategyInitiative or domain director bundles).
 */
export interface OrchestrationActionNode {
  id: string;
  title: string;
  domain: StrategyInitiativeDomainKey;
  lane: OrchestrationLaneId;
  dependencies: string[];
  /** Heuristic weight for critical-path ordering. */
  weight: number;
  /** Provenance for client badges; strategy rows omit `analysis_depth`. */
  source?: OrchestrationGraphNodeSource;
  analysis_depth?: OrchestrationGraphNodeAnalysisDepth;
  /** Optional normalized confidence used for persisted `confidence_map`. */
  confidence?: 'high' | 'medium' | 'low';
  /** Normalized quantitative factors for ADR priority engine. */
  impact_score?: number;
  effort_score?: number;
  /** Optional normalized risk used for persisted `risk_layer`. */
  risk_score?: number;
  blocking_factor?: 0 | 1 | 2 | 3;
  time_to_value?: 'fast' | 'medium' | 'slow';
  domain_weight?: number;
  priority_score?: number;
  /** Rolling timeline projection metadata for roadmap-first UX. */
  season_index?: number;
  time_bucket?: 'now' | 'next' | 'later';
  target_window_days?: number;
  /** Director Layer-1 evidence buckets (counts of string entries in director output). */
  evidence_taxonomy?: {
    observed: number;
    derived: number;
    assumed: number;
    missing: number;
  };
}

export interface OrchestrationGraphEdge {
  from: string;
  to: string;
  relation: OrchestrationDependencyRelationKind;
  weight: number;
}

export interface OrchestrationPhaseDiagnostic {
  dominant_constraint: OrchestrationConstraintKey;
  constraint_chain: OrchestrationConstraintKey[];
}

export interface OrchestrationRoutingProfile {
  strategy: 'toc_dynamic_routing_v1';
  domain_weights: Partial<Record<StrategyInitiativeDomainKey, number>>;
}

export interface OrchestrationConfidenceMap {
  node_confidence: Record<string, 'high' | 'medium' | 'low'>;
}

export interface OrchestrationRiskLayer {
  node_risk: Record<string, number>;
}

export interface OrchestrationDomainInfluence {
  domain_weights: Partial<Record<StrategyInitiativeDomainKey, number>>;
}

export interface OrchestrationGraphPayload {
  nodes: Array<{
    id: string;
    title: string;
    domain: StrategyInitiativeDomainKey;
    lane: OrchestrationLaneId;
    source?: OrchestrationGraphNodeSource;
    analysis_depth?: OrchestrationGraphNodeAnalysisDepth;
    season_index?: number;
    time_bucket?: 'now' | 'next' | 'later';
    target_window_days?: number;
  }>;
  edges: OrchestrationGraphEdge[];
  /** Deterministic notes (e.g. cycle repair). */
  meta?: {
    cycles_broken?: number;
    dropped_edges?: OrchestrationGraphEdge[];
    priority_scores?: Record<string, number>;
  };
}

export interface OrchestrationConflictResolvedEntry {
  id: string;
  summary: string;
  resolution: OrchestrationConflictResolution;
}

export interface OrchestrationPackPolicyEnvelope {
  execution_mode: OrchestrationExecutionMode;
  confidence_map: OrchestrationConfidenceMap;
  risk_layer: OrchestrationRiskLayer;
  domain_influence: OrchestrationDomainInfluence;
}

export interface OrchestrationInputQuality {
  input_mode: OrchestrationInputMode;
  input_gate_status: OrchestrationInputGateStatus;
  director_coverage_ratio: number;
  director_input_coverage_ratio: number;
  degraded: boolean;
  fallback_reason_code?: OrchestrationFallbackReasonCode;
}
