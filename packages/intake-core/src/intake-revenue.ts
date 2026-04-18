/**
 * Canonical revenue bank id — first entry of `modes.full.syntheticRequired` in `intake-policy.v1.json`.
 */
import { INTAKE_POLICY_V1 } from './core/load-policy.js';
import { QUESTION_BANK_V1_IDS } from './question-bank.js';

const fromPolicy = INTAKE_POLICY_V1.modes.full.syntheticRequired?.[0];
if (!fromPolicy || !QUESTION_BANK_V1_IDS.has(fromPolicy)) {
  throw new Error(
    'intake policy: modes.full.syntheticRequired[0] must be a valid question-bank v1 id (revenue slot)',
  );
}

export const INTAKE_REVENUE_BANK_ID = fromPolicy;

function unwrapCell(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as Record<string, unknown>)) {
    return (value as { value: unknown }).value;
  }
  return value;
}

/** True when canonical revenue bank id is answered (for progress / gates). */
export function isRevenueAnsweredRaw(responses: Record<string, unknown>): boolean {
  const raw = unwrapCell(responses[INTAKE_REVENUE_BANK_ID]);
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'string') return raw.trim().length > 0;
  if (Array.isArray(raw)) return raw.length > 0;
  return true;
}
