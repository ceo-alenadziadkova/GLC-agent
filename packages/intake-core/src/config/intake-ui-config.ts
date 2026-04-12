/**
 * Static defaults for intake resolver UX toggles and caps (developer-owned CONFIG).
 *
 * Runtime overrides belong in a dedicated feature-flag layer (DB/CMS/service) when introduced — not in deployment ENV.
 */

export const INTAKE_UI_CONFIG = {
  /** Product toggle for `isIntakeNextRecommendedEnabled` (not env-overridable). */
  nextRecommendedEnabledDefault: true,

  /** Incremental engine (`recomputePlanIncremental` fast path). */
  incrementalEngineEnabledDefault: true,

  /** Policy richness (`askStrategyById`, `requirednessByMode`, …). */
  policyRichnessEnabledDefault: false,

  /** Default cap for `computeNextRecommended` when caller omits `max`. */
  nextRecommendedCapDefault: 8,

  /** Hard ceiling for future dynamic caps (e.g. admin-tuned limits). */
  nextRecommendedCapMax: 24,
} as const;

export type IntakeUiConfig = typeof INTAKE_UI_CONFIG;
