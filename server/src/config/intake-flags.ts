/**
 * Runtime toggles for intake resolver UX hints (ADR Phase F).
 *
 * - **Server / Node:** `INTAKE_NEXT_RECOMMENDED_ENABLED`
 * - **Vite SPA:** `VITE_INTAKE_NEXT_RECOMMENDED_ENABLED` (`import.meta.env`)
 *
 * When explicitly falsey (`0`, `false`, `no`, `off`), `IntakePlan.nextRecommended` stays empty.
 * When enabled, `computeNextRecommended` orders: unanswered required, then recommended, then optional primaries for domains in `missingForReport` (cap default 8).
 * When unset, defaults to **enabled** so existing API consumers keep current behavior.
 */
function envFlagEnabled(raw: string | undefined, defaultWhenUnset: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return defaultWhenUnset;
  const v = raw.trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  return defaultWhenUnset;
}

function readIntakeNextRecommendedEnv(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.INTAKE_NEXT_RECOMMENDED_ENABLED !== undefined) {
    return process.env.INTAKE_NEXT_RECOMMENDED_ENABLED;
  }
  try {
    const im = import.meta as unknown as { env?: Record<string, string | boolean | undefined> };
    const v = im.env?.VITE_INTAKE_NEXT_RECOMMENDED_ENABLED;
    if (v === undefined) return undefined;
    return typeof v === 'string' ? v : String(v);
  } catch {
    return undefined;
  }
}

export function isIntakeNextRecommendedEnabled(): boolean {
  return envFlagEnabled(readIntakeNextRecommendedEnv(), true);
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
  return envFlagEnabled(readIntakeIncrementalEngineEnv(), true);
}

/**
 * Enables policy richness extensions (`requirednessByMode`, `askStrategyById`).
 * Defaults on with backward-compatible behavior when policy fields are absent.
 */
export function isIntakePolicyRichnessEnabled(): boolean {
  return envFlagEnabled(readIntakePolicyRichnessEnv(), false);
}
