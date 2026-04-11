/**
 * Static defaults for intake resolver UX toggles and caps (developer-owned CONFIG).
 *
 * Runtime overrides belong in a dedicated feature-flag layer (DB/CMS/service) when introduced.
 * Until then, `intake-flags.ts` still reads optional `INTAKE_*` / `VITE_INTAKE_*` env vars as a
 * transitional kill-switch; when those vars are unset, values from this module apply.
 */

export const INTAKE_UI_CONFIG = {
  /** Default for `isIntakeNextRecommendedEnabled` when env is unset */
  nextRecommendedEnabledDefault: true,

  /** Default for `isIntakeIncrementalEngineEnabled` when env is unset */
  incrementalEngineEnabledDefault: true,

  /** Default for `isIntakePolicyRichnessEnabled` when env is unset */
  policyRichnessEnabledDefault: false,

  /** Default cap for `computeNextRecommended` when `max` is omitted and env is unset */
  nextRecommendedCapDefault: 8,

  /** Hard ceiling for `resolveIntakeNextRecommendedMax` (env cannot exceed this) */
  nextRecommendedCapMax: 24,
} as const;

export type IntakeUiConfig = typeof INTAKE_UI_CONFIG;
