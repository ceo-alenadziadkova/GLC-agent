/**
 * Phase-B policy defaults for package-aware readiness.
 * Start conservative: baseline-only for all packages until scope-aware rollouts are enabled explicitly.
 */
export const INTAKE_EXECUTION_PLAN_READINESS_POLICY = {
  starter: 'baseline_only',
  pro: 'baseline_only',
  complete: 'baseline_only',
} as const;

