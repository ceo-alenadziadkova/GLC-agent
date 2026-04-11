/**
 * Primary / secondary domain feeds for question-bank v1 — loaded from `question-feed-roles.v1.json`.
 * Secondary domains receive the same answer in agent context (brief_responses slice) as primaries.
 */
import type { IntakeSliceDomain } from './types.js';
import raw from './question-feed-roles.v1.json' with { type: 'json' };

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

const SLICE_SET = new Set<string>(SLICE_DOMAIN_ORDER);

function normalizeRoles(id: string, row: { primary?: string[]; secondary?: string[] }): QuestionFeedRoles {
  const primary = row.primary ?? [];
  const secondary = row.secondary ?? [];
  for (const domain of [...primary, ...secondary]) {
    if (!SLICE_SET.has(domain)) {
      throw new Error(`question-feed-roles.v1.json: unknown domain "${domain}" for question "${id}"`);
    }
  }
  return { primary: primary as IntakeSliceDomain[], secondary: secondary as IntakeSliceDomain[] };
}

function loadFeedsFromJson(): Record<string, QuestionFeedRoles> {
  const feeds = (raw as { version: string; feeds: Record<string, { primary?: string[]; secondary?: string[] }> })
    .feeds;
  const out: Record<string, QuestionFeedRoles> = {};
  for (const [id, row] of Object.entries(feeds)) {
    out[id] = normalizeRoles(id, row);
  }
  return out;
}

/**
 * Per-question feed roles. Primaries = main agent consumers; secondaries = cross-domain context.
 */
export const QUESTION_FEED_ROLES: Record<string, QuestionFeedRoles> = loadFeedsFromJson();

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
