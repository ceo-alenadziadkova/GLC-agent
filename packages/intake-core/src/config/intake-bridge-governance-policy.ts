/**
 * Phase-B/C bridge-question lifecycle governance policy.
 * Keeps dependency-rule metadata deterministic and auditable.
 */
export const INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY = {
  allowedOwners: ['product', 'engineering'] as const,
  allowedLifecycleStates: ['active', 'retire_candidate'] as const,
  kpiMetricPrefix: 'intake_',
} as const;

export type IntakeBridgeQuestionOwner =
  (typeof INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY.allowedOwners)[number];
export type IntakeBridgeQuestionLifecycleState =
  (typeof INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY.allowedLifecycleStates)[number];
