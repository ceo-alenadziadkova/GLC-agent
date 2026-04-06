/**
 * Agent context slices — `DOMAIN_TO_QUESTION_IDS` is built in `question-bank.ts` from §5 data.
 */
import { DOMAIN_TO_QUESTION_IDS } from './question-bank.js';
import type { IntakeSliceDomain } from './types.js';
import type { IntakeResponsesMap } from './types.js';
import { unwrapIntakeValue } from './unwrap.js';

export { DOMAIN_TO_QUESTION_IDS };

export function sliceResponsesForDomain(
  domain: IntakeSliceDomain,
  responses: IntakeResponsesMap,
): Record<string, unknown> {
  const ids = DOMAIN_TO_QUESTION_IDS[domain];
  const out: Record<string, unknown> = {};
  for (const id of ids) {
    if (Object.prototype.hasOwnProperty.call(responses, id)) {
      out[id] = responses[id];
    }
  }
  return out;
}

/** Human-readable lines for prompts (id: value). Skips empty cells. */
export function formatSliceForPrompt(
  domain: IntakeSliceDomain,
  responses: IntakeResponsesMap,
): string {
  const slice = sliceResponsesForDomain(domain, responses);
  const lines: string[] = [];
  for (const id of DOMAIN_TO_QUESTION_IDS[domain]) {
    if (!Object.prototype.hasOwnProperty.call(slice, id)) continue;
    const v = unwrapIntakeValue(slice[id]);
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    lines.push(`- ${id}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  }
  return lines.join('\n');
}
