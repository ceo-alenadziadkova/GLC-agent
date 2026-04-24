/**
 * Phase-B policy defaults for package-aware readiness.
 * Phase-2 rollout: enable scope-aware gating for package execution.
 * Baseline readiness still applies first; scope-aware mode only decides whether
 * in-scope gaps should block after baseline passes.
 */
export const INTAKE_EXECUTION_PLAN_READINESS_POLICY = {
  starter: 'scope_aware',
  pro: 'scope_aware',
  complete: 'scope_aware',
} as const;

