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
