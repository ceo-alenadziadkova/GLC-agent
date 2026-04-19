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
  evaluationDatasetsRequireExplicitInternalConsent: false,
  securityTxtConnectorEnabled: true,
  banditsEnabled: false,
  autoLoopEnabled: false,
  causalDagEnabled: false,
  autoRemediationEnabled: false,
  benchmarksEnabled: false,
  /** POST /api/audits/:id/strategy/execution-pack — on-demand execution plan. Env: FEATURE_STRATEGY_EXECUTION_PACK */
  strategyExecutionPackEnabled: true,
} as const;
