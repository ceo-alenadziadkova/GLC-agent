/**
 * Default on/off for product toggles when the corresponding env var is unset.
 * Call sites: `server/src/config/feature-flags.ts` only.
 */
export const SYSTEM_DEFAULTS_FEATURE_FLAGS = {
  evaluationDatasetsInsertEnabled: true,
  /**
   * When true, `evaluation_datasets` rows are written only if the audit owner has an explicit
   * `evaluation_internal` consent event with `accepted=true`. Env: EVALUATION_DATASETS_REQUIRE_INTERNAL_CONSENT
   */
  evaluationDatasetsRequireExplicitInternalConsent: true,
  securityTxtConnectorEnabled: true,
  banditsEnabled: true,
  autoLoopEnabled: true,
  causalDagEnabled: true,
  autoRemediationEnabled: true,
  benchmarksEnabled: true,
  /** POST /api/audits/:id/strategy/execution-pack — on-demand execution plan. Env: FEATURE_STRATEGY_EXECUTION_PACK */
  strategyExecutionPackEnabled: true,
  /**
   * Optional LLM pass for cross-domain conflict copy on orchestration pack (future).
   * Env: FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS
   */
  orchestrationConflictSynthesisEnabled: true,
  /**
   * Percent of audits eligible for conflict synthesis when feature is enabled.
   * Env: FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS_ROLLOUT_PERCENT
   */
  orchestrationConflictSynthesisRolloutPercent: 100,
  /**
   * POST/GET `/api/audits/:id/orchestration/pack` — persisted GLC orchestration pack (Strategy Lab).
   * Env: FEATURE_ORCHESTRATION_PACK_API=false to disable at runtime.
   */
  orchestrationPackApiEnabled: true,
  /**
   * Plan-level governance rollout mode for orchestration pack persistence.
   * Allowed: shadow | hard_structure_soft_quality | tightened_quality.
   * Env: FEATURE_ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODE
   */
  orchestrationPlanGovernanceRolloutMode: 'shadow',
  /**
   * Enables high-volume debug logs for pipeline events, including extended LLM call telemetry.
   * Env: FEATURE_PIPELINE_DEBUG_LOGS
   */
  pipelineDebugLogsEnabled: false,
  /**
   * Enables Director orchestration slice emission from domain-agent output.
   * Until enabled, strict director phases are blocked before any LLM call to avoid wasted token spend.
   * Env: FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT
   */
  directorOrchestrationAgentOutputEnabled: false,
} as const;
