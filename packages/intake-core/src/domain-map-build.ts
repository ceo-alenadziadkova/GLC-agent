import type { IntakeQuestionStub, IntakeSliceDomain } from './types.js';
import { SLICE_DOMAIN_ORDER } from './question-feed-roles.js';

/** Fallback sort rank when a question id is missing from the stub list (stable tail ordering). */
const UNKNOWN_QUESTION_BANK_ORDER_FALLBACK = 9999;

/** Sort ids within each domain by canonical question-bank order. */
export function buildOrderedDomainToQuestionIds(
  stubs: IntakeQuestionStub[],
  raw: Record<IntakeSliceDomain, readonly string[]>,
): Record<IntakeSliceDomain, string[]> {
  const order = new Map(stubs.map((q, i) => [q.id, i] as const));
  const out = {} as Record<IntakeSliceDomain, string[]>;
  for (const d of SLICE_DOMAIN_ORDER) {
    const ids = raw[d];
    out[d] = ids
      ? [...ids].sort(
          (a, b) =>
            (order.get(a) ?? UNKNOWN_QUESTION_BANK_ORDER_FALLBACK)
            - (order.get(b) ?? UNKNOWN_QUESTION_BANK_ORDER_FALLBACK),
        )
      : [];
  }
  return out;
}

/** Inverted map: question id → domains that consume it (for validation / docs tooling). */
export function feedsByQuestionId(raw: Record<IntakeSliceDomain, readonly string[]>): Record<string, IntakeSliceDomain[]> {
  const out: Record<string, IntakeSliceDomain[]> = {};
  for (const d of SLICE_DOMAIN_ORDER) {
    for (const id of raw[d] ?? []) {
      const arr = out[id] ?? (out[id] = []);
      if (!arr.includes(d)) arr.push(d);
    }
  }
  return out;
}
