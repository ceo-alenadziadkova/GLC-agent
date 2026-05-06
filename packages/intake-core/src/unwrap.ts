/**
 * Normalize brief response cells: flat values or { value, source }.
 */

import { choiceSpecifyResponseKey, choiceValueNeedsSpecify } from './choice-specify-triggers.js';

export function unwrapIntakeValue(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as Record<string, unknown>)) {
    return (value as { value: unknown }).value;
  }
  return value;
}

export function isIntakeAnswered(value: unknown): boolean {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'source' in (value as Record<string, unknown>)) {
    const src = (value as { source?: string }).source;
    if (src === 'unknown') return true;
  }
  const raw = unwrapIntakeValue(value);
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'string') return raw.trim().length > 0;
  if (typeof raw === 'number') return true;
  if (typeof raw === 'boolean') return true;
  if (Array.isArray(raw)) return raw.length > 0;
  return false;
}

/**
 * SLA / pipeline readiness parity with pre-brief slot checks (`brief-gates`): when the primary bank cell
 * picks an option label that requires free-text clarification, the keyed specify field must also satisfy
 * `isIntakeAnswered` (`choiceSpecifyResponseKey`, e.g. `c3__other`, `intake_industry_specify` for `a2`).
 */
export function isIntakeAnsweredIncludingChoiceSpecify(
  responses: Record<string, unknown>,
  bankId: string,
): boolean {
  if (!isIntakeAnswered(responses[bankId])) return false;
  const primary = unwrapIntakeValue(responses[bankId]);
  if (!choiceValueNeedsSpecify(primary)) return true;
  const specKey = choiceSpecifyResponseKey(bankId);
  return isIntakeAnswered(responses[specKey]);
}

export function getResponseString(responses: Record<string, unknown>, key: string): string {
  const raw = unwrapIntakeValue(responses[key]);
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return '';
}

export function getResponseStringLower(responses: Record<string, unknown>, key: string): string {
  return getResponseString(responses, key).toLowerCase();
}

/** Multi-select or single value as string[] for `.includes` checks. */
export function getResponseMultiIncludes(responses: Record<string, unknown>, key: string, needle: string): boolean {
  const raw = unwrapIntakeValue(responses[key]);
  const n = needle.toLowerCase();
  if (Array.isArray(raw)) {
    return raw.some(v => String(v).toLowerCase().includes(n));
  }
  if (typeof raw === 'string') return raw.toLowerCase().includes(n);
  return false;
}
