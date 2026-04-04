import type { IntakeQuestionStub, IntakeSliceDomain } from './types.js';

const SLICE_DOMAINS: IntakeSliceDomain[] = [
  'recon',
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
  'strategy',
];

/** Sort ids within each domain by canonical question-bank order. */
export function buildOrderedDomainToQuestionIds(
  stubs: IntakeQuestionStub[],
  raw: Record<IntakeSliceDomain, readonly string[]>,
): Record<IntakeSliceDomain, string[]> {
  const order = new Map(stubs.map((q, i) => [q.id, i] as const));
  const out = {} as Record<IntakeSliceDomain, string[]>;
  for (const d of SLICE_DOMAINS) {
    const ids = raw[d];
    out[d] = ids ? [...ids].sort((a, b) => (order.get(a) ?? 9999) - (order.get(b) ?? 9999)) : [];
  }
  return out;
}

/** Inverted map: question id → domains that consume it (for validation / docs tooling). */
export function feedsByQuestionId(raw: Record<IntakeSliceDomain, readonly string[]>): Record<string, IntakeSliceDomain[]> {
  const out: Record<string, IntakeSliceDomain[]> = {};
  for (const d of SLICE_DOMAINS) {
    for (const id of raw[d] ?? []) {
      const arr = out[id] ?? (out[id] = []);
      if (!arr.includes(d)) arr.push(d);
    }
  }
  return out;
}
