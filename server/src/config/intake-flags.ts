/**
 * Runtime toggles for intake resolver UX hints (ADR Phase F).
 *
 * `INTAKE_NEXT_RECOMMENDED_ENABLED` — when explicitly falsey (`0`, `false`, `no`, `off`), `IntakePlan.nextRecommended` stays empty.
 * When unset, defaults to **enabled** so existing API consumers keep current behavior.
 */
function envFlagEnabled(raw: string | undefined, defaultWhenUnset: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return defaultWhenUnset;
  const v = raw.trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  return defaultWhenUnset;
}

export function isIntakeNextRecommendedEnabled(): boolean {
  return envFlagEnabled(process.env.INTAKE_NEXT_RECOMMENDED_ENABLED, true);
}
