/**
 * Canonical metric keys for orchestration observability.
 */
export const ORCHESTRATION_TELEMETRY_METRICS = {
  staleManifestRate: 'kpi_orchestration_stale_manifest_rate',
  degradedInputRate: 'kpi_orchestration_degraded_input_rate',
  refinePlanRate: 'kpi_orchestration_refine_plan_rate',
  versionAdoptionRate: 'kpi_orchestration_vn_plus_1_adoption',
  /** GET /api/audits/:id/timeline — use `timeline_status` field for breakdown. */
  timelineView: 'kpi_orchestration_timeline_view',
  /** GET /api/audits/:id/timeline — unhandled 5xx / build failures (alert on rate). */
  timelineRunFailure: 'kpi_orchestration_timeline_run_failure',
  /** POST /api/audits/:id/orchestration/pack — unhandled 5xx (alert on rate). */
  packRunFailure: 'kpi_orchestration_pack_run_failure',
  /** Plan persistence rejected at governance gate (proxy for execution risk). */
  planGateReject: 'kpi_orchestration_plan_gate_reject',
  /** Logged with pack success payload: signals rollout mode vs recommended next (dashboards). */
  planGovernanceRolloutObservation: 'kpi_orchestration_plan_governance_rollout_observation',
  /** Graph integrity repairs applied (cycles/orphans) — correlate with refine rate. */
  dependencyBreakRate: 'kpi_orchestration_dependency_break_rate',
  /** LLM conflict synthesis failed or was skipped — deterministic pack returned. */
  synthesisDeterministicFallback: 'kpi_orchestration_synthesis_deterministic_fallback',
  /** Consultant read-only orchestration cockpit pack fetch (adoption / funnel). */
  consultantCockpitView: 'kpi_orchestration_consultant_cockpit_view',
  /** POST pack governance CTA: `accept_plan` / `accept_with_warnings` / `refine_plan` (dimension `action`). */
  governanceAction: 'kpi_orchestration_governance_action',
  /** LLM prompt cache: cache read vs write ratio (0–1) for orchestration + director deep-dive. */
  llmCacheHitRate: 'kpi_orchestration_llm_cache_hit_rate',
  /** Estimated LLM cost (USD) attributed to a single audit (rolling / daily). */
  llmCostPerAuditUsd: 'kpi_orchestration_llm_cost_per_audit_usd',
} as const;

