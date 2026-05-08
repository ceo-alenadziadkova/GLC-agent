/**
 * Maps deterministic site scan output to question-bank fields (a1, a3, a5, a6, a9).
 * Values must match `packages/intake-core/src/question-bank.v1.json` option strings.
 */
import type { SnapshotCachePayload } from '../snapshot/types.js';

const A5 = {
  MULTI: 'Yes, multi-page site',
  LANDING: 'Yes, single landing page',
  UNDER: 'Under construction',
  NONE: 'No website yet',
} as const;

const A6 = {
  YES: 'Yes',
  SOMETIMES: 'Sometimes',
  RARELY: 'Rarely',
  OFFLINE: 'No, offline only',
  UNSURE: 'Not sure',
} as const;

const BANK_LANG = new Set(['Spanish', 'English', 'German', 'French', 'Russian', 'Other']);

export type SuggestedBriefAnswers = {
  a1?: string;
  a3?: string;
  a5?: string;
  a6?: string;
  a9?: string[];
};

function toOneSentenceFromBlurb(blurb: string, maxLen: number): string {
  const t = blurb.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const first = t.match(/^[^.!?]+(?:[.!?]|$)/);
  const sentence = (first ? first[0] : t).trim();
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen - 1).trim()}…` : sentence;
}

function normPrimaryLang(lang: string): string | null {
  const base = lang.trim().split(/[-_]/)[0]?.toLowerCase() ?? '';
  if (!base) return null;
  const map: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    de: 'German',
    fr: 'French',
    ru: 'Russian',
  };
  return map[base] ?? 'Other';
}

function inferA5(payload: SnapshotCachePayload): string {
  const cov = payload.scan_coverage;
  if (cov?.parkedLikely === true) {
    return A5.UNDER;
  }
  const pages = payload.pages_crawled ?? [];
  const uniqueUrls = new Set(pages.map(p => p.url).filter(Boolean));
  if (uniqueUrls.size >= 2) {
    return A5.MULTI;
  }
  const home = pages[0];
  const title = (home?.title ?? '').toLowerCase();
  const construction = /coming soon|under construction|site en construction|bientôt|maintenance/i.test(title);
  if (construction) {
    return A5.UNDER;
  }
  return A5.LANDING;
}

function inferA6(payload: SnapshotCachePayload, tech: Record<string, string[]>): string {
  const ec = tech.ecommerce ?? [];
  if (ec.length > 0) {
    return A6.YES;
  }
  const booking = tech.booking ?? [];
  if (booking.length > 0 && ec.length === 0) {
    return A6.SOMETIMES;
  }
  if (payload.recon_hints?.checkout_html === true) {
    return A6.SOMETIMES;
  }
  return A6.UNSURE;
}

function inferA9(payload: SnapshotCachePayload): string[] | undefined {
  const langs = payload.languages ?? [];
  const out = new Set<string>();
  for (const l of langs) {
    const mapped = normPrimaryLang(String(l));
    if (mapped) out.add(mapped);
  }
  if (out.size === 0) return undefined;
  if (out.has('Other') && out.size > 1) {
    out.delete('Other');
  }
  return [...out].filter(x => BANK_LANG.has(x));
}

/**
 * Builds optional bank answers; omit keys when no safe value.
 */
export function buildSuggestedBriefAnswersFromSnapshot(
  payload: SnapshotCachePayload,
  businessActivitySummary: string,
): SuggestedBriefAnswers {
  const tech = (payload.tech_stack ?? {}) as Record<string, string[]>;
  const out: SuggestedBriefAnswers = {};

  const a1 = toOneSentenceFromBlurb(businessActivitySummary, 800);
  if (a1) {
    out.a1 = a1;
  }

  const addr = payload.contact_info?.addresses?.[0]?.trim();
  const loc = (payload.location as string | null | undefined)?.trim();
  const a3 = addr || loc;
  if (a3) {
    out.a3 = a3;
  }

  if (!payload.degraded) {
    out.a5 = inferA5(payload);
  } else {
    out.a5 = A5.LANDING;
  }

  out.a6 = inferA6(payload, tech);

  const a9 = inferA9(payload);
  if (a9 && a9.length > 0) {
    out.a9 = a9;
  }

  return out;
}
