/**
 * Tunables for deterministic orchestration graph build (no inline magic numbers in services).
 */

export const GLC_ORCHESTRATION_PACK_SCHEMA_VERSION = 2 as const;

/** Execution mode recorded in persisted pack for ADR-aligned client messaging. */
export const ORCHESTRATION_EXECUTION_MODES = ['deterministic', 'hybrid', 'synthesis'] as const;
export type OrchestrationExecutionMode = (typeof ORCHESTRATION_EXECUTION_MODES)[number];

/** Node provenance in persisted pack graph (strategy initiatives vs domain director bundles). */
export const ORCHESTRATION_GRAPH_NODE_SOURCES = ['strategy', 'director'] as const;
export type OrchestrationGraphNodeSource = (typeof ORCHESTRATION_GRAPH_NODE_SOURCES)[number];

export const ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS = ['baseline', 'deep'] as const;
export type OrchestrationGraphNodeAnalysisDepth =
  (typeof ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS)[number];

/**
 * Allowed values for `conflicts_resolved[].resolution` in persisted `glc_orchestration_pack`.
 * Order is stable: index 0 is the default for deterministic graph repair (cycle/orphan handling).
 */
export const ORCHESTRATION_CONFLICT_RESOLUTIONS = [
  'deterministic',
  'synthesis_pending',
  'synthesis_applied',
] as const;

export type OrchestrationConflictResolution = (typeof ORCHESTRATION_CONFLICT_RESOLUTIONS)[number];

/** Resolution recorded for deterministic graph repair (orphan deps, broken cycles). */
export const ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR: OrchestrationConflictResolution =
  ORCHESTRATION_CONFLICT_RESOLUTIONS[0];

/**
 * When multiple initiatives share the same `id`, keep one deterministically and record drops in
 * `conflicts_resolved`. `keep_first` preserves the earliest row in the flattened initiative list.
 */
export const ORCHESTRATION_DUPLICATE_INITIATIVE_ID_POLICIES = ['keep_first', 'keep_last'] as const;

export type OrchestrationDuplicateInitiativeIdPolicy =
  (typeof ORCHESTRATION_DUPLICATE_INITIATIVE_ID_POLICIES)[number];

export const ORCHESTRATION_DUPLICATE_INITIATIVE_ID_POLICY: OrchestrationDuplicateInitiativeIdPolicy =
  'keep_first';

/** Maximum initiatives folded into one graph (safety cap). */
export const ORCHESTRATION_GRAPH_MAX_NODES = 64;

/** Longest-path DP cap to avoid pathological graphs in production. */
export const ORCHESTRATION_GRAPH_MAX_CRITICAL_PATH_DEPTH = 48;

/** Retry window for optimistic lock on persisted roadmap pack revisions. */
export const ORCHESTRATION_PACK_PERSIST_MAX_RETRIES = 2;

/** Rolling history depth for persisted orchestration pack diffs (newest-first). */
export const ORCHESTRATION_PACK_REVISION_HISTORY_MAX_ITEMS = 50;

/**
 * Deterministic dependency edge semantics required by ADR:
 * - direct_blocker: strongest prerequisite relation
 * - strong: high coupling but not hard blocker
 * - medium: meaningful dependency with alternatives
 * - weak: soft ordering hint
 */
export const ORCHESTRATION_DEPENDENCY_RELATION_KINDS = [
  'direct_blocker',
  'strong',
  'medium',
  'weak',
] as const;

export type OrchestrationDependencyRelationKind = (typeof ORCHESTRATION_DEPENDENCY_RELATION_KINDS)[number];

/**
 * Edge weights are centralized in config (no magic numbers in graph services).
 */
export const ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS: Record<
  OrchestrationDependencyRelationKind,
  number
> = {
  direct_blocker: 1.0,
  strong: 0.7,
  medium: 0.4,
  weak: 0.2,
} as const;

export const ORCHESTRATION_CONSTRAINT_KEYS = [
  'capacity',
  'technical_debt',
  'compliance_risk',
  'go_to_market',
] as const;

export type OrchestrationConstraintKey = (typeof ORCHESTRATION_CONSTRAINT_KEYS)[number];

export const ORCHESTRATION_ROUTING_DOMAIN_WEIGHTS = {
  primary: 2.0,
  secondary: 1.5,
  default: 1.0,
  dormant: 0.5,
} as const;

export const ORCHESTRATION_ROUTING_LANE_BIAS_MULTIPLIER = 1.35;

export const ORCHESTRATION_ROUTING_CONSTRAINT_LANE_BIAS: Record<
  OrchestrationConstraintKey,
  readonly string[]
> = {
  capacity: ['processes_automation'],
  technical_debt: ['tech_delivery'],
  compliance_risk: ['risk_compliance'],
  go_to_market: ['marketing_narrative', 'seo', 'product_change'],
} as const;

export const ORCHESTRATION_PRIORITY_ENGINE_POLICY = {
  confidenceNumeric: {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
  },
  blockingMultiplier: {
    0: 1.0,
    1: 1.15,
    2: 1.35,
    3: 1.6,
  },
  timePenalty: {
    fast: 0.8,
    medium: 1.0,
    slow: 1.3,
  },
  defaultRiskScore: 3,
} as const;

/**
 * Canonical ADR aliases for constraints, preserved as config (no scattered string branching).
 * Existing persisted keys stay intact for backward compatibility.
 */
export const ORCHESTRATION_CONSTRAINT_ADR_ALIASES: Record<OrchestrationConstraintKey, string> = {
  capacity: 'DELIVERY',
  technical_debt: 'TECH',
  compliance_risk: 'RISK',
  go_to_market: 'TRAFFIC',
} as const;

export const ORCHESTRATION_IMPACT_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

export const ORCHESTRATION_EFFORT_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

export const ORCHESTRATION_PRIORITY_WEIGHTS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

/**
 * Node weight for longest-path heuristic: higher = more "critical" for ordering.
 */
export function orchestrationNodeWeight(input: {
  impact: keyof typeof ORCHESTRATION_IMPACT_WEIGHTS;
  effort: keyof typeof ORCHESTRATION_EFFORT_WEIGHTS;
  priority: keyof typeof ORCHESTRATION_PRIORITY_WEIGHTS;
}): number {
  const iw = ORCHESTRATION_IMPACT_WEIGHTS[input.impact];
  const ew = ORCHESTRATION_EFFORT_WEIGHTS[input.effort];
  const pw = ORCHESTRATION_PRIORITY_WEIGHTS[input.priority];
  return iw * pw + Math.max(0, 4 - ew);
}
