/**
 * Primary / secondary domain feeds for question-bank v1.
 * Single source of truth for docs/QUESTION_BANK.md §3 / §5 and DOMAIN_TO_QUESTIONS_RAW.
 *
 * Secondary domains receive the same answer in agent context (brief_responses slice) as primaries;
 * optional prompt grouping by role can use exports below.
 */
import type { IntakeSliceDomain } from './types.js';

export interface QuestionFeedRoles {
  primary: readonly IntakeSliceDomain[];
  secondary: readonly IntakeSliceDomain[];
}

const D = {
  recon: 'recon',
  tech: 'tech_infrastructure',
  security: 'security_compliance',
  seo: 'seo_digital',
  ux: 'ux_conversion',
  mkt: 'marketing_utp',
  auto: 'automation_processes',
  strat: 'strategy',
} as const;

export const SLICE_DOMAIN_ORDER: readonly IntakeSliceDomain[] = [
  D.recon,
  D.tech,
  D.security,
  D.seo,
  D.ux,
  D.mkt,
  D.auto,
  D.strat,
];

function ps(
  primary: readonly IntakeSliceDomain[],
  secondary: readonly IntakeSliceDomain[] = [],
): QuestionFeedRoles {
  return { primary: [...primary], secondary: [...secondary] };
}

/**
 * Per-question feed roles. Primaries = main agent consumers; secondaries = cross-domain context.
 * After changes, update docs/QUESTION_BANK.md §3 / §5 to mirror this file (markdown is not canonical).
 */
export const QUESTION_FEED_ROLES: Record<string, QuestionFeedRoles> = {
  a1: ps([D.recon]),
  a2: ps([D.recon]),
  a3: ps([D.recon]),
  a4: ps([D.recon, D.strat]),
  a5: ps([D.recon, D.tech]),
  a6: ps([D.recon, D.security]),
  a7: ps([D.recon, D.strat]),
  a8: ps([D.strat, D.auto], [D.ux, D.mkt]),
  b1: ps([D.ux, D.mkt]),
  b2: ps([D.mkt, D.seo], [D.strat, D.auto]),
  b3: ps([D.mkt]),
  b4: ps([D.mkt, D.strat]),
  b5: ps([D.mkt, D.strat]),
  b6: ps([D.mkt, D.ux]),
  b7: ps([D.mkt, D.ux, D.strat]),
  b_hotel_1: ps([D.mkt]),
  b_hotel_2: ps([D.mkt]),
  b_realestate_1: ps([D.mkt]),
  b_restaurant_1: ps([D.mkt], [D.ux]),
  b_services_1: ps([D.ux]),
  b_health_1: ps([D.ux]),
  b_marine_1: ps([D.mkt]),
  c5: ps([D.ux]),
  c6: ps([D.ux, D.tech], [D.seo, D.strat]),
  c8: ps([D.mkt]),
  c9: ps([D.tech]),
  c1: ps([D.tech]),
  c2: ps([D.tech]),
  c3: ps([D.seo]),
  c4: ps([D.seo]),
  c7: ps([D.mkt, D.seo]),
  c_nosite_1: ps([D.seo]),
  c_nosite_2: ps([D.seo], [D.strat]),
  c_nosite_3: ps([D.seo]),
  d1: ps([D.auto, D.tech], [D.strat, D.seo]),
  d1a: ps([D.auto]),
  d1b: ps([D.auto]),
  d2: ps([D.auto], [D.ux, D.mkt]),
  d_automation_attempt: ps([D.auto]),
  d3: ps([D.auto]),
  d4: ps([D.auto]),
  d4a: ps([D.auto, D.strat]),
  d4b: ps([D.auto, D.strat]),
  d6: ps([D.auto, D.strat]),
  d5: ps([D.auto]),
  d_hotel_1: ps([D.tech, D.auto]),
  d_hotel_2: ps([D.auto]),
  d_realestate_1: ps([D.auto]),
  d_restaurant_1: ps([D.tech, D.auto]),
  e1: ps([D.security]),
  e2: ps([D.security]),
  e3: ps([D.security]),
  e4: ps([D.security]),
  f1: ps([D.strat]),
  f2: ps([D.strat]),
  f3: ps([D.strat], [D.mkt, D.ux, D.auto]),
  f4: ps([D.strat]),
  f5: ps([D.strat]),
  f6: ps([D.strat]),
  f7: ps([D.strat, D.auto]),
  f8: ps([D.strat]),
};

/** Domains that consume a question id (primary ∪ secondary), stable order by SLICE_DOMAIN_ORDER. */
export function getDomainsForQuestionId(questionId: string): IntakeSliceDomain[] {
  const r = QUESTION_FEED_ROLES[questionId];
  if (!r) return [];
  const set = new Set<IntakeSliceDomain>([...r.primary, ...r.secondary]);
  return SLICE_DOMAIN_ORDER.filter(d => set.has(d));
}

export function isPrimaryFeedForDomain(questionId: string, domain: IntakeSliceDomain): boolean {
  return QUESTION_FEED_ROLES[questionId]?.primary.includes(domain) ?? false;
}

export function isSecondaryFeedForDomain(questionId: string, domain: IntakeSliceDomain): boolean {
  return QUESTION_FEED_ROLES[questionId]?.secondary.includes(domain) ?? false;
}

/**
 * Build domain → question ids map. Each id appears at most once per domain (Set).
 */
export function buildDomainToQuestionsRawFromRoles(
  roles: Record<string, QuestionFeedRoles>,
): Record<IntakeSliceDomain, readonly string[]> {
  const byDomain = new Map<IntakeSliceDomain, Set<string>>();
  for (const d of SLICE_DOMAIN_ORDER) {
    byDomain.set(d, new Set());
  }
  for (const [id, r] of Object.entries(roles)) {
    for (const d of r.primary) {
      byDomain.get(d)!.add(id);
    }
    for (const d of r.secondary) {
      byDomain.get(d)!.add(id);
    }
  }
  return Object.fromEntries(
    SLICE_DOMAIN_ORDER.map(d => [d, Array.from(byDomain.get(d)!) as readonly string[]]),
  ) as Record<IntakeSliceDomain, readonly string[]>;
}

export const DOMAIN_TO_QUESTIONS_RAW: Record<IntakeSliceDomain, readonly string[]> =
  buildDomainToQuestionsRawFromRoles(QUESTION_FEED_ROLES);
