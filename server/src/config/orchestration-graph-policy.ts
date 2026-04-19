/**
 * Tunables for deterministic orchestration graph build (no inline magic numbers in services).
 */

export const GLC_ORCHESTRATION_PACK_SCHEMA_VERSION = 1 as const;

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
