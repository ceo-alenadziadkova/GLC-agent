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
   * After phase 7 (strategy) completes, auto-build and persist orchestration pack when a latest
   * roadmap manifest snapshot exists (same path as POST pack). Env: FEATURE_ORCHESTRATION_PACK_AUTO_AFTER_STRATEGY
   */
  orchestrationPackAutoAfterStrategyEnabled: false,
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
  /**
   * When true, timeline-first UX rollout hooks may emit extra structured logs / gates.
   * Env: FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX
   */
  orchestrationTimelinePrimaryUxEnabled: true,
  /**
   * When true, timeline API may emit narrative fields to all users (milestones, top_priorities).
   * When false, staged access uses `orchestrationRoadmapNarrativeRolloutMode` + allowlist (see orchestration-rollout-gates).
   * Env: FEATURE_ORCHESTRATION_ROADMAP_NARRATIVE_ENABLED
   */
  orchestrationRoadmapNarrativeEnabled: false,
  /**
   * Rollout mode for client roadmap narrative surface.
   * Env: FEATURE_ORCHESTRATION_ROADMAP_NARRATIVE_ROLLOUT_MODE
   */
  orchestrationRoadmapNarrativeRolloutMode: 'internal',
  /**
   * Rollout mode for on-demand director deep-dive flow.
   * Env: FEATURE_DIRECTOR_DEEP_DIVE_ROLLOUT_MODE
   */
  directorDeepDiveRolloutMode: 'internal',
  /**
   * Rollout mode for director sub-agent experience.
   * Env: FEATURE_DIRECTOR_SUB_AGENTS_ROLLOUT_MODE
   */
  directorSubAgentsRolloutMode: 'internal',
  directorDeepDiveOnDemandEnabled: false,
  directorSubAgentsEnabled: false,
  /** CDO/CAO/CSO deep-dive stub bundles (non-CMO). Env: FEATURE_DIRECTOR_CDO_SUB_AGENTS, etc. */
  directorCdoSubAgentsEnabled: false,
  directorCaoSubAgentsEnabled: false,
  directorCsoSubAgentsEnabled: false,
  /**
   * When true, pipeline start and discovery convert apply `evaluateIntakeReadinessEnvelope` blocking rules.
   * Env: FEATURE_DIAGNOSTIC_INTAKE_PILOT
   */
  diagnosticIntakePilotEnabled: false,
  /**
   * When true, readiness uses execution-plan domain slice for in-scope coverage gaps (post-KPI Phase-B).
   * Requires pilot flag for blocking paths; default off preserves Phase-1 behavior.
   * Env: FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE
   */
  executionPlanCoverageScopeEnabled: false,
  /**
   * When true, ContextBuilder includes `intake_project_context_envelope` in agent context metadata.
   * Keep disabled by default until post-KPI Phase-B/C context envelope rollout is approved.
   * Env: FEATURE_PROJECT_CONTEXT_ENVELOPE
   */
  projectContextEnvelopeEnabled: false,
} as const;
