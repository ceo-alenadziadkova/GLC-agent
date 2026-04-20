/**
 * Frontend-side orchestration contract versions.
 * Timeline/manifest status literals must match `server/src/config/orchestration-client-contract.ts`
 * (enforced by `orchestration-contract-parity.test.ts`).
 */
export const ORCHESTRATION_PACK_SCHEMA_VERSION = 2 as const;
export const ORCHESTRATION_PACK_DIFF_SCHEMA_VERSION = 1 as const;
export const ORCHESTRATION_INPUT_GATE_STATUSES = ['finalized', 'degraded'] as const;
export type OrchestrationInputGateStatus = (typeof ORCHESTRATION_INPUT_GATE_STATUSES)[number];
export const ORCHESTRATION_PLAN_GATE_OUTCOMES = ['accept', 'accept_with_warnings', 'refine'] as const;
export type OrchestrationPlanGateOutcome = (typeof ORCHESTRATION_PLAN_GATE_OUTCOMES)[number];
export const ORCHESTRATION_TIMELINE_STATUSES = [
  'ready',
  'degraded',
  'missing_pack',
  'stale_manifest',
  'restricted_client_view',
] as const;
export type OrchestrationTimelineStatus = (typeof ORCHESTRATION_TIMELINE_STATUSES)[number];
export const ORCHESTRATION_MANIFEST_STATES = ['draft', 'confirmed', 'stale'] as const;
export type OrchestrationManifestState = (typeof ORCHESTRATION_MANIFEST_STATES)[number];

/** Must match `server/src/config/orchestration-plan-governance-rollout-policy.ts`. */
export const ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES = [
  'shadow',
  'hard_structure_soft_quality',
  'tightened_quality',
] as const;
export type OrchestrationPlanGovernanceRolloutMode =
  (typeof ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODES)[number];

