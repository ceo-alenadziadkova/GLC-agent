/**
 * Parse and compare ADR intake version tuples (question bank + policy + layout + resolver).
 */
import type { IntakeVersionTuple } from '../../types/audit.js';

const KEYS: (keyof IntakeVersionTuple)[] = [
  'questionBankVersion',
  'policyVersion',
  'layoutVersion',
  'resolverVersion',
];

export type ParseIntakeVersionsBodyResult =
  | { kind: 'omit' }
  | { kind: 'full'; tuple: IntakeVersionTuple }
  | { kind: 'incomplete' };

/** Distinguish omitted `intake_versions` from a partially filled object (400). */
export function parseIntakeVersionsBody(raw: unknown): ParseIntakeVersionsBodyResult {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'omit' };
  const o = raw as Record<string, unknown>;
  const withVal = KEYS.filter(k => {
    const v = o[k as string];
    return v != null && v !== '';
  });
  if (withVal.length === 0) return { kind: 'omit' };
  if (withVal.length !== KEYS.length) return { kind: 'incomplete' };
  for (const k of KEYS) {
    const v = o[k];
    if (typeof v !== 'string' || v.length === 0) return { kind: 'incomplete' };
  }
  return {
    kind: 'full',
    tuple: {
      questionBankVersion: o.questionBankVersion as string,
      policyVersion: o.policyVersion as string,
      layoutVersion: o.layoutVersion as string,
      resolverVersion: o.resolverVersion as string,
    },
  };
}

export function parseIntakeVersionTuple(raw: unknown): IntakeVersionTuple | undefined {
  const r = parseIntakeVersionsBody(raw);
  if (r.kind === 'full') return r.tuple;
  return undefined;
}

export function tuplesEqual(a: IntakeVersionTuple, b: IntakeVersionTuple): boolean {
  return KEYS.every(k => a[k] === b[k]);
}

export function intakeTupleArtifactKey(t: IntakeVersionTuple): string {
  return `${t.questionBankVersion}|${t.policyVersion}|${t.layoutVersion}|${t.resolverVersion}`;
}
