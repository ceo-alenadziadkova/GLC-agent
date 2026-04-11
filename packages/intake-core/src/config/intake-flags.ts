/**
 * Runtime toggles for intake resolver UX hints (ADR Phase F).
 *
 * **Source of truth for defaults:** [`intake-ui-config.ts`](./intake-ui-config.ts) (static CONFIG).
 *
 * **Transitional overrides:** optional deploy-time env vars for some toggles (kill-switch only).
 * `nextRecommended` on/off is **not** env-driven — use `INTAKE_UI_CONFIG.nextRecommendedEnabledDefault`.
 *
 * - **Server / Node:** `INTAKE_INCREMENTAL_ENGINE_ENABLED`, `INTAKE_POLICY_RICHNESS_ENABLED`, …
 * - **Vite SPA:** matching `VITE_INTAKE_*` where applicable (`import.meta.env`)
 *
 * When `isIntakeNextRecommendedEnabled()` is true, `computeNextRecommended` orders: unanswered required,
 * then recommended, then optional primaries for domains in `missingForReport` (cap from CONFIG unless
 * overridden via `INTAKE_NEXT_RECOMMENDED_MAX` / `VITE_INTAKE_NEXT_RECOMMENDED_MAX`).
 */
import { INTAKE_UI_CONFIG } from './intake-ui-config.js';

function envFlagEnabled(raw: string | undefined, defaultWhenUnset: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return defaultWhenUnset;
  const v = raw.trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  return defaultWhenUnset;
}

export function isIntakeNextRecommendedEnabled(): boolean {
  return INTAKE_UI_CONFIG.nextRecommendedEnabledDefault;
}

function readIntakeIncrementalEngineEnv(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.INTAKE_INCREMENTAL_ENGINE_ENABLED !== undefined) {
    return process.env.INTAKE_INCREMENTAL_ENGINE_ENABLED;
  }
  try {
    const im = import.meta as unknown as { env?: Record<string, string | boolean | undefined> };
    const v = im.env?.VITE_INTAKE_INCREMENTAL_ENGINE_ENABLED;
    if (v === undefined) return undefined;
    return typeof v === 'string' ? v : String(v);
  } catch {
    return undefined;
  }
}

function readIntakePolicyRichnessEnv(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.INTAKE_POLICY_RICHNESS_ENABLED !== undefined) {
    return process.env.INTAKE_POLICY_RICHNESS_ENABLED;
  }
  try {
    const im = import.meta as unknown as { env?: Record<string, string | boolean | undefined> };
    const v = im.env?.VITE_INTAKE_POLICY_RICHNESS_ENABLED;
    if (v === undefined) return undefined;
    return typeof v === 'string' ? v : String(v);
  } catch {
    return undefined;
  }
}

/**
 * Enables incremental canon recompute path in `recomputePlanIncremental`.
 * Defaults on to keep performance roadmap active; can be disabled as kill switch.
 */
export function isIntakeIncrementalEngineEnabled(): boolean {
  return envFlagEnabled(
    readIntakeIncrementalEngineEnv(),
    INTAKE_UI_CONFIG.incrementalEngineEnabledDefault,
  );
}

/**
 * Enables policy richness extensions (`requirednessByMode`, `askStrategyById`).
 * Default off in `INTAKE_UI_CONFIG`; when enabled, behavior stays backward-compatible when policy fields are absent.
 */
export function isIntakePolicyRichnessEnabled(): boolean {
  return envFlagEnabled(
    readIntakePolicyRichnessEnv(),
    INTAKE_UI_CONFIG.policyRichnessEnabledDefault,
  );
}

function readIntakeNextRecommendedMaxEnv(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.INTAKE_NEXT_RECOMMENDED_MAX !== undefined) {
    return process.env.INTAKE_NEXT_RECOMMENDED_MAX;
  }
  try {
    const im = import.meta as unknown as { env?: Record<string, string | boolean | undefined> };
    const v = im.env?.VITE_INTAKE_NEXT_RECOMMENDED_MAX;
    if (v === undefined) return undefined;
    return typeof v === 'string' ? v : String(v);
  } catch {
    return undefined;
  }
}

/** Cap for `computeNextRecommended` when `max` is omitted (tunable per environment). */
export function resolveIntakeNextRecommendedMax(): number {
  const raw = readIntakeNextRecommendedMaxEnv();
  const fallback = INTAKE_UI_CONFIG.nextRecommendedCapDefault;
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(INTAKE_UI_CONFIG.nextRecommendedCapMax, Math.floor(n));
}
