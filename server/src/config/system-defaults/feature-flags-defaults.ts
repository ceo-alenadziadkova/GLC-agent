/**
 * Default on/off for product toggles when the corresponding env var is unset.
 * Call sites: `server/src/config/feature-flags.ts` only.
 */
export const SYSTEM_DEFAULTS_FEATURE_FLAGS = {
  evaluationDatasetsInsertEnabled: true,
  securityTxtConnectorEnabled: true,
  banditsEnabled: false,
  autoLoopEnabled: false,
  causalDagEnabled: false,
  autoRemediationEnabled: false,
  benchmarksEnabled: false,
} as const;
