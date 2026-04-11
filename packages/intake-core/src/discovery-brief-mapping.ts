/**
 * Stable mapping helpers for Discovery (Mode C) → intake brief patches.
 * Uses question-bank canon for a5 default; preserves legacy c_nosite_1 labels for old sessions.
 */
import raw from './question-bank.v1.json' with { type: 'json' };

interface RawAnswer {
  type?: string;
  options?: string[];
}

interface RawQuestion {
  id: string;
  answer?: RawAnswer;
}

function optionsForBankQuestion(id: string): string[] {
  const q = (raw as { questions: RawQuestion[] }).questions.find(x => x.id === id);
  const opts = q?.answer?.options;
  return Array.isArray(opts) ? opts : [];
}

/** Exact a5 option string for "no website yet" (from question-bank.v1.json). */
export const DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET: string = (() => {
  const opts = optionsForBankQuestion('a5');
  const hit = opts.find(o => /no website yet/i.test(o));
  return hit ?? 'No website yet';
})();

/**
 * Legacy c_nosite_1 labels from older bank versions. If still present in stored answers,
 * do not force brief c3 (analytics on site) to "No".
 */
export const C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS: readonly string[] = [
  'Full website (multi-page)',
  'Single landing page',
  'Website in development / not public yet',
];

export function discoveryCnSite1SelectionsImplyFirstPartyWeb(selections: string[]): boolean {
  return selections.some(s => C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS.includes(s));
}
