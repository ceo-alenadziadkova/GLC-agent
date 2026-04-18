/**
 * Sanitize brief responses before persist/validate (ADR: answer contracts enforced server-side).
 *
 * For each bank id present in responses that has an answer contract:
 *   - text / textarea: truncated to maxLength when exceeded
 *   - single_select: cleared when value is not in the option set
 *   - multi_select: array filtered to valid options only
 *   - scale: numeric value clamped to [scaleMin, scaleMax]
 *   - boolean: passed through unchanged
 *
 * Handles both flat values and wrapped `{ value, source }` objects: the inner
 * value is sanitized and the wrapper is preserved when the caller stored one.
 *
 * Non-bank keys and bank ids without an answer contract are passed through unchanged.
 */
import {
  QUESTION_BANK_OPTION_CATALOGS,
  QUESTION_BANK_V1_STUBS,
} from './question-bank.js';
import type { IntakeAnswerContract, IntakeQuestionStub } from './types.js';

function resolveOptions(contract: IntakeAnswerContract): readonly string[] | null {
  if (contract.options && contract.options.length > 0) return contract.options;
  if (contract.optionsRef) {
    const cat = QUESTION_BANK_OPTION_CATALOGS[contract.optionsRef];
    if (cat && cat.length > 0) return cat;
  }
  return null;
}

function sanitizeRawValue(raw: unknown, contract: IntakeAnswerContract): unknown {
  switch (contract.type) {
    case 'text':
    case 'textarea': {
      if (typeof raw === 'string' && contract.maxLength != null && raw.length > contract.maxLength) {
        return raw.slice(0, contract.maxLength);
      }
      return raw;
    }
    case 'single_select': {
      const opts = resolveOptions(contract);
      if (opts && typeof raw === 'string' && !opts.includes(raw)) {
        return null;
      }
      return raw;
    }
    case 'multi_select': {
      const opts = resolveOptions(contract);
      if (opts && Array.isArray(raw)) {
        return raw.filter(v => opts.includes(String(v)));
      }
      return raw;
    }
    case 'scale': {
      if (
        typeof raw === 'number' &&
        contract.scaleMin != null &&
        contract.scaleMax != null
      ) {
        return Math.min(contract.scaleMax, Math.max(contract.scaleMin, raw));
      }
      return raw;
    }
    case 'boolean':
    default:
      return raw;
  }
}

function sanitizeValue(value: unknown, contract: IntakeAnswerContract): unknown {
  const isWrapped =
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'value' in (value as Record<string, unknown>);

  const raw = isWrapped ? (value as { value: unknown }).value : value;
  const sanitized = sanitizeRawValue(raw, contract);

  if (isWrapped) {
    if (sanitized === raw) return value;
    return { ...(value as Record<string, unknown>), value: sanitized };
  }
  return sanitized;
}

export function prepareBriefForValidation(
  responses: Record<string, unknown>,
  stubs: IntakeQuestionStub[] = QUESTION_BANK_V1_STUBS,
): Record<string, unknown> {
  const contractById = new Map(
    stubs.filter(s => s.answer != null).map(s => [s.id, s.answer!]),
  );
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(responses)) {
    const contract = contractById.get(key);
    out[key] = contract ? sanitizeValue(value, contract) : value;
  }
  return out;
}
