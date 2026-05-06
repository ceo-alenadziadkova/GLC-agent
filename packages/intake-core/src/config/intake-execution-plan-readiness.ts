/**
 * Phase-B policy defaults for package-aware readiness.
 * Phase-2 rollout: enable scope-aware gating for package execution.
 * Baseline readiness still applies first; scope-aware mode only decides whether
 * in-scope gaps should block after baseline passes.
 */
export const INTAKE_EXECUTION_PLAN_READINESS_POLICY = {
  starter: 'scope_aware',
  pro: 'scope_aware',
  /**
   * Complete runs all domains; `scope_aware` would block pipeline start until every in-scope
   * recommended bank tied to missing report domains is answered — far stricter than SLA/critical-signal baseline.
   * Baseline-only keeps execution-plan coverage observability (`execution_plan_coverage_scope_active` trace)
   * without hard-blocking `POST .../pipeline/start|next` on exhaustive recommended gaps.
   */
  complete: 'baseline_only',
} as const;

