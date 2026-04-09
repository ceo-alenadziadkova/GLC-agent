/**
 * Legacy response key aliases (Phase 5 — revenue in question bank as `a10`, storage may still use `revenue_model`).
 */

export const INTAKE_REVENUE_BANK_ID = 'a10' as const;
export const INTAKE_REVENUE_LEGACY_KEY = 'revenue_model' as const;

function unwrapCell(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as Record<string, unknown>)) {
    return (value as { value: unknown }).value;
  }
  return value;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Copy legacy `revenue_model` into bank id when bank slot is empty (read path for resolver / validation).
 */
export function mergeLegacyIntakeAliasesRead(responses: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...responses };
  const bankKey = INTAKE_REVENUE_BANK_ID;
  const legacyKey = INTAKE_REVENUE_LEGACY_KEY;
  if (isBlank(unwrapCell(out[bankKey])) && !isBlank(unwrapCell(out[legacyKey]))) {
    out[bankKey] = out[legacyKey] as unknown;
  }
  return out;
}

/**
 * Keep `revenue_model` in sync for older readers / exports when only `a10` is set (persist path).
 */
/** True if either legacy or bank revenue key is answered (for progress / gates). */
export function isRevenueAnsweredRaw(responses: Record<string, unknown>): boolean {
  function unwrap(value: unknown): unknown {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as Record<string, unknown>)) {
      return (value as { value: unknown }).value;
    }
    return value;
  }
  function answered(value: unknown): boolean {
    const raw = unwrap(value);
    if (raw === null || raw === undefined) return false;
    if (typeof raw === 'string') return raw.trim().length > 0;
    if (Array.isArray(raw)) return raw.length > 0;
    return true;
  }
  return answered(responses[INTAKE_REVENUE_BANK_ID]) || answered(responses[INTAKE_REVENUE_LEGACY_KEY]);
}

export function syncRevenueAliasesForPersistence(responses: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...responses };
  const bankKey = INTAKE_REVENUE_BANK_ID;
  const legacyKey = INTAKE_REVENUE_LEGACY_KEY;
  const otherBank = `${bankKey}__other`;
  const otherLegacy = `${legacyKey}__other`;

  if (!isBlank(unwrapCell(out[bankKey])) && isBlank(unwrapCell(out[legacyKey]))) {
    out[legacyKey] = out[bankKey] as unknown;
  }
  if (!isBlank(unwrapCell(out[legacyKey])) && isBlank(unwrapCell(out[bankKey]))) {
    out[bankKey] = out[legacyKey] as unknown;
  }
  if (Object.prototype.hasOwnProperty.call(out, otherBank) && !Object.prototype.hasOwnProperty.call(out, otherLegacy)) {
    out[otherLegacy] = out[otherBank] as unknown;
  }
  if (Object.prototype.hasOwnProperty.call(out, otherLegacy) && !Object.prototype.hasOwnProperty.call(out, otherBank)) {
    out[otherBank] = out[otherLegacy] as unknown;
  }
  return out;
}
