/**
 * Intake resolver UX toggles (ADR Phase F).
 *
 * **Source of truth:** [`intake-ui-config.ts`](./intake-ui-config.ts) (`INTAKE_UI_CONFIG`) — static CONFIG only.
 * Product toggles and caps are **not** read from `process.env` / `VITE_*` (see repo `docs/ARCHITECTURE.md` — ENV is
 * infrastructure; algorithmic defaults belong in CONFIG). When you need runtime overrides without deploy, introduce a
 * feature-flag service or DB-backed settings — do not add new `INTAKE_*` env vars here.
 *
 * `nextRecommended` on/off is controlled only by `INTAKE_UI_CONFIG.nextRecommendedEnabledDefault`.
 */
import { INTAKE_UI_CONFIG } from './intake-ui-config.js';

export function isIntakeNextRecommendedEnabled(): boolean {
  return INTAKE_UI_CONFIG.nextRecommendedEnabledDefault;
}

/**
 * Enables incremental canon recompute path in `recomputePlanIncremental`.
 */
export function isIntakeIncrementalEngineEnabled(): boolean {
  return INTAKE_UI_CONFIG.incrementalEngineEnabledDefault;
}

/**
 * Enables policy richness extensions (`requirednessByMode`, `askStrategyById`).
 */
export function isIntakePolicyRichnessEnabled(): boolean {
  return INTAKE_UI_CONFIG.policyRichnessEnabledDefault;
}

/** Default cap for `computeNextRecommended` when `max` is omitted (clamped by `nextRecommendedCapMax` if extended later). */
export function resolveIntakeNextRecommendedMax(): number {
  return INTAKE_UI_CONFIG.nextRecommendedCapDefault;
}
