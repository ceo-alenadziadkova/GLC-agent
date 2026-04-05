/**
 * Branch predicates — docs/QUESTION_BANK.md §6.
 * Responses use mixed legacy labels (e.g. industry dropdown) and future slug ids; normalize where needed.
 */
import type { IntakeResponsesMap } from './types.js';
import {
  getResponseMultiIncludes,
  getResponseStringLower,
  unwrapIntakeValue,
} from './unwrap.js';

export type BranchPredicate = (responses: IntakeResponsesMap) => boolean;

/** Maps canonical app industry labels (see industry-options) to QUESTION_BANK branch slugs. */
export const INDUSTRY_LABEL_TO_BRANCH_SLUG: Record<string, string> = {
  hospitality: 'hospitality',
  'real estate': 'real_estate',
  'food & beverage': 'restaurant_fb',
  'professional services': 'professional_services',
  healthcare: 'healthcare',
  marine: 'marine',
  'e-commerce': 'ecommerce',
  education: 'education',
  finance: 'finance',
  manufacturing: 'manufacturing',
  'media & entertainment': 'media',
  'non-profit': 'nonprofit',
  retail: 'retail',
  'saas / software': 'saas',
  other: 'other',
};

function industryBranchSlug(responses: IntakeResponsesMap): string {
  const raw = unwrapIntakeValue(responses.a2 ?? responses.intake_industry);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (INDUSTRY_LABEL_TO_BRANCH_SLUG[s]) return INDUSTRY_LABEL_TO_BRANCH_SLUG[s];
  const compact = s.replace(/\s+/g, ' ');
  if (INDUSTRY_LABEL_TO_BRANCH_SLUG[compact]) return INDUSTRY_LABEL_TO_BRANCH_SLUG[compact];
  return s.replace(/[\s/&]+/g, '_');
}

export type WebsiteGate =
  | 'multi'
  | 'single_landing'
  | 'under_construction'
  | 'no_website'
  | 'unknown';

/** Normalize a5 / legacy website answers to gate enum. */
export function normalizeWebsiteGate(responses: IntakeResponsesMap): WebsiteGate {
  const raw = unwrapIntakeValue(responses.a5);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return 'unknown';
  if (s === 'no_website' || s.includes('no website') || s === 'none') return 'no_website';
  if (s.includes('under construction') || s === 'under_construction') return 'under_construction';
  if (s.includes('single') || s.includes('landing')) return 'single_landing';
  if (s.includes('multi-page') || s.includes('multi page') || (s.startsWith('yes') && s.includes('multi'))) return 'multi';
  if (s.includes('yes') && !s.includes('no')) {
    if (s.includes('landing')) return 'single_landing';
    return 'multi';
  }
  if (raw === true) return 'multi';
  return 'unknown';
}

function normalizeTeamSize(responses: IntakeResponsesMap): string {
  const raw = unwrapIntakeValue(responses.a4);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('just me') || s === 'just_me' || s === 'solo') return 'just_me';
  return s;
}

function normalizePayments(responses: IntakeResponsesMap): string {
  const raw = unwrapIntakeValue(responses.a6);
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s === 'yes' || s.startsWith('yes')) return 'yes';
  if (s.includes('sometimes')) return 'sometimes';
  if (s.includes('rarely')) return 'rarely';
  if (s.includes('offline only') || s === 'no') return 'no';
  if (s.includes('not sure')) return 'not_sure';
  return s;
}

export const BRANCH_RULES: Record<string, BranchPredicate> = {
  has_website: (r) => {
    const g = normalizeWebsiteGate(r);
    return g === 'multi' || g === 'single_landing';
  },
  no_website: (r) => {
    const g = normalizeWebsiteGate(r);
    return g === 'no_website' || g === 'under_construction';
  },
  /** `c_nosite_3` — only when no_website path and `c_nosite_1` includes the exact \"Social media\" option. */
  nosite_social: (r) => {
    const g = normalizeWebsiteGate(r);
    if (g !== 'no_website' && g !== 'under_construction') return false;
    const raw = unwrapIntakeValue(r.c_nosite_1);
    const label = 'Social media';
    if (Array.isArray(raw)) {
      return raw.some(v => String(v).trim() === label);
    }
    if (typeof raw === 'string') return raw.trim() === label;
    return false;
  },
  is_hospitality: (r) => industryBranchSlug(r) === 'hospitality',
  is_real_estate: (r) => industryBranchSlug(r) === 'real_estate',
  is_restaurant: (r) => industryBranchSlug(r) === 'restaurant_fb',
  is_services: (r) => industryBranchSlug(r) === 'professional_services',
  is_healthcare: (r) => industryBranchSlug(r) === 'healthcare',
  is_marine: (r) => industryBranchSlug(r) === 'marine',
  has_crm: (r) => getResponseMultiIncludes(r, 'd1', 'crm'),
  no_crm: (r) => !getResponseMultiIncludes(r, 'd1', 'crm'),
  handles_payments: (r) => {
    const p = normalizePayments(r);
    return p === 'yes' || p === 'sometimes' || p === 'rarely';
  },
  not_solo: (r) => normalizeTeamSize(r) !== 'just_me',
  spain_based: (r) => {
    const loc = getResponseStringLower(r, 'a3');
    return loc.includes('spain') || loc.includes('españa') || loc.includes('mallorca');
  },
};

export function evalBranchCondition(
  condition: string | undefined,
  responses: IntakeResponsesMap,
): boolean {
  if (!condition) return true;
  const rule = BRANCH_RULES[condition];
  if (!rule) {
    // Unknown condition: question will be shown to everyone — likely a missing predicate or typo.
    console.warn(`[branch-rules] Unknown branchCondition "${condition}" — defaulting to visible. Add it to BRANCH_RULES if intentional.`);
    return true;
  }
  return rule(responses);
}
