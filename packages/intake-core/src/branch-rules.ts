/**
 * Branch predicates — declarative rules in `branch-rules.v1.json` (docs/QUESTION_BANK.md §6).
 */
import type { IntakeResponsesMap } from './types.js';
import {
  getResponseMultiIncludes,
  getResponseStringLower,
  unwrapIntakeValue,
} from './unwrap.js';
import industryMapRaw from './branch-industry-map.v1.json' with { type: 'json' };
import branchRuntimeRaw from './branch-runtime.v1.json' with { type: 'json' };
import branchRulesCanon from './branch-rules.v1.json' with { type: 'json' };
import {
  isSoloTeamRaw,
  normalizePayments,
  normalizeWebsiteGate,
  type WebsiteGate,
} from './branch-response-normalizers.js';

export type BranchPredicate = (responses: IntakeResponsesMap) => boolean;

/** Maps canonical app industry labels (see `branch-industry-map.v1.json`) to QUESTION_BANK branch slugs. */
export const INDUSTRY_LABEL_TO_BRANCH_SLUG: Readonly<Record<string, string>> = (
  industryMapRaw as { labelLowerToBranchSlug: Record<string, string> }
).labelLowerToBranchSlug;

const NOSITE_SOCIAL_PRESENCE_LABELS: readonly string[] = branchRuntimeRaw.nositeSocialPresenceLabels;
const MAX_BRANCH_RULE_DEPTH = branchRuntimeRaw.maxBranchRuleDepth;

type BranchRulesFile = {
  version: string;
  rules: Record<string, BranchRuleEntry>;
};

type BranchRuleEntry = {
  reads: string[];
  kind: string;
  gates?: string[];
  slug?: string;
  questionId?: string;
  needle?: string;
  inner?: string;
  anyOf?: string[];
  value?: string;
  substrings?: string[];
  /** Exact match after `unwrapIntakeValue` (single-select / text). */
  expectValue?: string;
};

const RULES_RECORD = (branchRulesCanon as BranchRulesFile).rules;

/** Which response keys each branch rule may read (for topo eval / invalidation). From `branch-rules.v1.json`. */
export const BRANCH_RULE_RESPONSE_KEYS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries(RULES_RECORD).map(([k, v]) => [k, [...v.reads]] as const),
);

function industryBranchSlug(responses: IntakeResponsesMap): string {
  const raw = unwrapIntakeValue(responses.a2);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (INDUSTRY_LABEL_TO_BRANCH_SLUG[s]) return INDUSTRY_LABEL_TO_BRANCH_SLUG[s];
  const compact = s.replace(/\s+/g, ' ');
  if (INDUSTRY_LABEL_TO_BRANCH_SLUG[compact]) return INDUSTRY_LABEL_TO_BRANCH_SLUG[compact];
  return s.replace(/[\s/&]+/g, '_');
}

export type { WebsiteGate } from './branch-response-normalizers.js';
export { normalizeWebsiteGate } from './branch-response-normalizers.js';

function normalizeTeamSize(responses: IntakeResponsesMap): string {
  const raw = unwrapIntakeValue(responses.a4);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (isSoloTeamRaw(raw)) return 'just_me';
  return s;
}

function evalNositeSocial(r: IntakeResponsesMap): boolean {
  const g = normalizeWebsiteGate(r);
  if (g !== 'no_website' && g !== 'under_construction') return false;
  const raw = unwrapIntakeValue(r.c_nosite_1);
  for (const label of NOSITE_SOCIAL_PRESENCE_LABELS) {
    if (Array.isArray(raw)) {
      if (raw.some(v => String(v).trim() === label)) return true;
    } else if (typeof raw === 'string' && raw.trim() === label) {
      return true;
    }
  }
  return false;
}

function evalRuleEntry(entry: BranchRuleEntry, r: IntakeResponsesMap, depth: number): boolean {
  if (depth > MAX_BRANCH_RULE_DEPTH) return false;
  switch (entry.kind) {
    case 'website_gate_in': {
      const g = normalizeWebsiteGate(r);
      const gates = entry.gates as WebsiteGate[];
      return gates.includes(g);
    }
    case 'nosite_social':
      return evalNositeSocial(r);
    case 'industry_slug_eq':
      return industryBranchSlug(r) === entry.slug;
    case 'multi_includes':
      return getResponseMultiIncludes(r, entry.questionId!, entry.needle!);
    case 'not': {
      const inner = RULES_RECORD[entry.inner!];
      if (!inner) return false;
      return !evalRuleEntry(inner, r, depth + 1);
    }
    case 'payments_normalized_in': {
      const p = normalizePayments(r);
      return (entry.anyOf as string[]).includes(p);
    }
    case 'team_size_neq':
      return normalizeTeamSize(r) !== entry.value;
    case 'question_lower_includes_any': {
      const loc = getResponseStringLower(r, entry.questionId!);
      return (entry.substrings as string[]).some(sub => loc.includes(sub));
    }
    case 'unwrap_string_eq': {
      if (!entry.questionId || entry.expectValue === undefined) return false;
      const raw = unwrapIntakeValue(r[entry.questionId]);
      return String(raw ?? '').trim() === String(entry.expectValue).trim();
    }
    default:
      return false;
  }
}

function buildBranchRules(): Record<string, BranchPredicate> {
  const out: Record<string, BranchPredicate> = {};
  for (const key of Object.keys(RULES_RECORD)) {
    const entry = RULES_RECORD[key]!;
    out[key] = (r: IntakeResponsesMap) => evalRuleEntry(entry, r, 0);
  }
  return out;
}

export const BRANCH_RULES: Record<string, BranchPredicate> = buildBranchRules();

export function evalBranchCondition(
  condition: string | undefined,
  responses: IntakeResponsesMap,
): boolean {
  if (!condition) return true;
  const rule = BRANCH_RULES[condition];
  if (!rule) {
    return false;
  }
  return rule(responses);
}
