/**
 * Response normalization for branch predicates — rules in `branch-response-normalizers.v1.json`.
 */
import type { IntakeResponsesMap } from './types.js';
import { unwrapIntakeValue } from './unwrap.js';
import raw from './branch-response-normalizers.v1.json' with { type: 'json' };
import {
  firstMatchingResponseStringOutcome,
  type ResponseStringRuleRow,
} from './response-string-rules.js';

export type WebsiteGate =
  | 'multi'
  | 'single_landing'
  | 'under_construction'
  | 'no_website'
  | 'unknown';

type NormalizersFile = {
  version: string;
  websiteGate: { rules: ResponseStringRuleRow[] };
  payments: { pickOrder: string[]; rules: ResponseStringRuleRow[] };
};

const file = raw as NormalizersFile;

const PASSTHROUGH = '__passthrough__';

/**
 * Raw a4 (team size) value matches bank "solo" variants before rule-table normalization.
 * Keeps branch predicates and AI readiness penalties aligned (single source of truth).
 */
export function isSoloTeamRaw(raw: unknown): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return false;
  return s.includes('just me') || s === 'just_me' || s === 'solo';
}

/** Normalize a5 website answers to gate enum. */
export function normalizeWebsiteGate(responses: IntakeResponsesMap): WebsiteGate {
  const rawVal = unwrapIntakeValue(responses.a5);
  const s = String(rawVal ?? '').trim().toLowerCase();
  const out = firstMatchingResponseStringOutcome(file.websiteGate.rules, s, rawVal);
  if (
    out === 'multi' ||
    out === 'single_landing' ||
    out === 'under_construction' ||
    out === 'no_website' ||
    out === 'unknown'
  ) {
    return out;
  }
  return 'unknown';
}

function pickPaymentsRaw(responses: IntakeResponsesMap): unknown {
  for (const key of file.payments.pickOrder) {
    const v = unwrapIntakeValue((responses as Record<string, unknown>)[key]);
    if (v != null && String(v).trim() !== '') {
      return v;
    }
  }
  return undefined;
}

/** Normalize a6 to branch bucket strings. */
export function normalizePayments(responses: IntakeResponsesMap): string {
  const picked = pickPaymentsRaw(responses);
  const s = String(picked ?? '').trim().toLowerCase();
  const out = firstMatchingResponseStringOutcome(file.payments.rules, s, picked);
  if (out === undefined || out === PASSTHROUGH) {
    return s;
  }
  return out;
}
