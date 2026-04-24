/**
 * Parse and compare ADR intake version tuples (bank + policy + layout + resolver + sequencing).
 */
import type { IntakeVersionTuple } from '../audit-contract.js';

import { INTAKE_SEQUENCING_VERSION } from './versions.js';

const LEGACY_KEYS: (keyof IntakeVersionTuple)[] = [
  'questionBankVersion',
  'policyVersion',
  'layoutVersion',
  'resolverVersion',
];

const KEYS: (keyof IntakeVersionTuple)[] = [...LEGACY_KEYS, 'sequencingVersion'];

export type ParseIntakeVersionsBodyResult =
  | { kind: 'omit' }
  | { kind: 'full'; tuple: IntakeVersionTuple }
  | { kind: 'incomplete' };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

/** Distinguish omitted `intake_versions` from a partially filled object (400). */
export function parseIntakeVersionsBody(raw: unknown): ParseIntakeVersionsBodyResult {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'omit' };
  const o = raw as Record<string, unknown>;
  const legacyFilled = LEGACY_KEYS.filter(k => isNonEmptyString(o[k as string]));
  const seqRaw = o.sequencingVersion;
  const hasSeq = isNonEmptyString(seqRaw);
  if (legacyFilled.length === 0 && !hasSeq) return { kind: 'omit' };
  for (const k of LEGACY_KEYS) {
    if (!isNonEmptyString(o[k])) return { kind: 'incomplete' };
  }
  if ('sequencingVersion' in o && !isNonEmptyString(seqRaw)) return { kind: 'incomplete' };
  if (legacyFilled.length === LEGACY_KEYS.length && !hasSeq) {
    return {
      kind: 'full',
      tuple: {
        questionBankVersion: o.questionBankVersion as string,
        policyVersion: o.policyVersion as string,
        layoutVersion: o.layoutVersion as string,
        resolverVersion: o.resolverVersion as string,
        sequencingVersion: INTAKE_SEQUENCING_VERSION,
      },
    };
  }
  if (!hasSeq) return { kind: 'incomplete' };
  for (const k of KEYS) {
    if (!isNonEmptyString(o[k])) return { kind: 'incomplete' };
  }
  return {
    kind: 'full',
    tuple: {
      questionBankVersion: o.questionBankVersion as string,
      policyVersion: o.policyVersion as string,
      layoutVersion: o.layoutVersion as string,
      resolverVersion: o.resolverVersion as string,
      sequencingVersion: o.sequencingVersion as string,
    },
  };
}

export function parseIntakeVersionTuple(raw: unknown): IntakeVersionTuple | undefined {
  const r = parseIntakeVersionsBody(raw);
  if (r.kind === 'full') return r.tuple;
  return undefined;
}

/** DB rows may omit `sequencingVersion` until repaired — align with current pilot default. */
export function normalizeIntakeVersionTupleFromStorage(raw: unknown): IntakeVersionTuple | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (!LEGACY_KEYS.every(k => isNonEmptyString(o[k]))) return undefined;
  return {
    questionBankVersion: o.questionBankVersion as string,
    policyVersion: o.policyVersion as string,
    layoutVersion: o.layoutVersion as string,
    resolverVersion: o.resolverVersion as string,
    sequencingVersion: isNonEmptyString(o.sequencingVersion)
      ? (o.sequencingVersion as string)
      : INTAKE_SEQUENCING_VERSION,
  };
}

export function tuplesEqual(a: IntakeVersionTuple, b: IntakeVersionTuple): boolean {
  return KEYS.every(k => a[k] === b[k]);
}

export function intakeTupleArtifactKey(t: IntakeVersionTuple): string {
  return KEYS.map(k => t[k]).join('|');
}
