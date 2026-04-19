import type { OrchestrationConflictResolution } from '../../config/orchestration-graph-policy.js';
import type { OrchestrationLaneId } from '../../config/orchestration-lanes.js';
import type { StrategyInitiativeDomainKey } from '../../config/strategy-initiative-policy.js';

export type { OrchestrationConflictResolution } from '../../config/orchestration-graph-policy.js';
export type { OrchestrationLaneId } from '../../config/orchestration-lanes.js';

/**
 * Normalized action vertex for orchestration (from StrategyInitiative or future director bundles).
 */
export interface OrchestrationActionNode {
  id: string;
  title: string;
  domain: StrategyInitiativeDomainKey;
  lane: OrchestrationLaneId;
  dependencies: string[];
  /** Heuristic weight for critical-path ordering. */
  weight: number;
}

export interface OrchestrationGraphEdge {
  from: string;
  to: string;
  /** Optional semantic weight (MVP: always 1). */
  weight: number;
}

export interface OrchestrationGraphPayload {
  nodes: Array<{
    id: string;
    title: string;
    domain: StrategyInitiativeDomainKey;
    lane: OrchestrationLaneId;
  }>;
  edges: OrchestrationGraphEdge[];
  /** Deterministic notes (e.g. cycle repair). */
  meta?: {
    cycles_broken?: number;
    dropped_edges?: OrchestrationGraphEdge[];
  };
}

export interface OrchestrationConflictResolvedEntry {
  id: string;
  summary: string;
  resolution: OrchestrationConflictResolution;
}
