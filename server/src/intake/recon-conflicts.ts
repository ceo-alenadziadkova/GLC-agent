/**
 * Recon vs client disagreement log — docs/QUESTION_BANK.md §11.
 */
import type { ReconConflict } from '../types/audit.js';
import { unwrapIntakeValue } from './unwrap.js';

export type { ReconConflict };

/**
 * When the client rejects or corrects recon-prefilled stack confirmation (c1),
 * append an open conflict row for agent context.
 */
export function mergeReconConflictsFromC1(
  responses: Record<string, unknown>,
  reconPrefills: Record<string, unknown>,
  existing: ReconConflict[],
): ReconConflict[] {
  const rawPref = reconPrefills.c1 as { detected?: string } | undefined;
  const detected = (rawPref?.detected ?? '').trim();
  if (!detected) return existing;

  const v = unwrapIntakeValue(responses.c1);
  if (v === null || v === undefined) return existing;
  const clientStr = typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.join(', ') : String(v);
  if (!clientStr) return existing;

  const low = clientStr.toLowerCase();
  const reject =
    /\bnot quite\b/.test(low) ||
    /\bnot correct\b/.test(low) ||
    /\bincorrect\b/.test(low) ||
    /^no\b/.test(low) ||
    /\bdoesn'?t match\b/.test(low) ||
    /\bwrong\b/.test(low);

  if (!reject) return existing;

  const next = existing.filter(c => !(c.questionId === 'c1' && c.status === 'open'));
  next.push({
    questionId: 'c1',
    detectedValue: detected,
    clientValue: clientStr,
    status: 'open',
  });
  return next;
}
