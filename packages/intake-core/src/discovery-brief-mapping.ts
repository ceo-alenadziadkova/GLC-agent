/**
 * Stable mapping helpers for Discovery (Mode C) → intake brief patches.
 * Uses question-bank canon for a5 default; preserves legacy c_nosite_1 labels for old sessions.
 */
import { freeTextImpliesCrmTool, includesCrmTool } from './answer-normalizers.js';
import contractRaw from './discovery-brief-contract.v1.json' with { type: 'json' };
import fallbacksRaw from './discovery-brief-fallbacks.v1.json' with { type: 'json' };
import raw from './question-bank.v1.json' with { type: 'json' };

const briefContract = contractRaw as {
  version: string;
  usesCrmBriefStoredYes: string;
  usesCrmBriefStoredNo: string;
  usesCrmBriefLabelEnYes: string;
  usesCrmBriefLabelEnNo: string;
  usesCrmBriefI18nKeyYes: string;
  usesCrmBriefI18nKeyNo: string;
};

/**
 * Canonical **stored** value for the synthetic brief cell `uses_crm` (Discovery → brief).
 * Locale-agnostic; use `normalizeUsesCrmBriefStoredValue` when reading old rows (`Yes` / `No`).
 */
export const DISCOVERY_BRIEF_USES_CRM_YES = briefContract.usesCrmBriefStoredYes;

export const DISCOVERY_BRIEF_USES_CRM_NO = briefContract.usesCrmBriefStoredNo;

/** English labels for display / PDF until message catalogs exist. */
export const DISCOVERY_BRIEF_USES_CRM_LABEL_EN_YES = briefContract.usesCrmBriefLabelEnYes;

export const DISCOVERY_BRIEF_USES_CRM_LABEL_EN_NO = briefContract.usesCrmBriefLabelEnNo;

export const DISCOVERY_BRIEF_USES_CRM_I18N_KEY_YES = briefContract.usesCrmBriefI18nKeyYes;

export const DISCOVERY_BRIEF_USES_CRM_I18N_KEY_NO = briefContract.usesCrmBriefI18nKeyNo;

export type NormalizedUsesCrmBrief = 'yes' | 'no' | null;

const LEGACY_USES_CRM_YES = new Set(['Yes', 'YES', 'yes']);
const LEGACY_USES_CRM_NO = new Set(['No', 'NO', 'no']);

/**
 * Maps a persisted `uses_crm` cell to a stable semantic.
 * Accepts current stored tokens (`uses_crm:yes` / `uses_crm:no`) and legacy English `Yes` / `No`.
 */
export function normalizeUsesCrmBriefStoredValue(raw: unknown): NormalizedUsesCrmBrief {
  if (raw == null) return null;
  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
  if (!s) return null;
  if (s === DISCOVERY_BRIEF_USES_CRM_YES || LEGACY_USES_CRM_YES.has(s)) return 'yes';
  if (s === DISCOVERY_BRIEF_USES_CRM_NO || LEGACY_USES_CRM_NO.has(s)) return 'no';
  return null;
}

/** English display string for a normalized value (empty when unknown). */
export function formatUsesCrmBriefDisplayEn(normalized: NormalizedUsesCrmBrief): string {
  if (normalized === 'yes') return DISCOVERY_BRIEF_USES_CRM_LABEL_EN_YES;
  if (normalized === 'no') return DISCOVERY_BRIEF_USES_CRM_LABEL_EN_NO;
  return '';
}

export type DiscoveryUsesCrmInference = 'yes' | 'no' | 'unknown';

/**
 * Infers CRM usage from discovery d1 (tools multi-select) and d1b (free text).
 * Uses `crmToolNeedle` from `answer-normalizers.v1.json` for text matching.
 */
export function inferDiscoveryUsesCrm(d1: string[], d1b: unknown): DiscoveryUsesCrmInference {
  if (includesCrmTool(d1)) return 'yes';
  if (typeof d1b === 'string' && freeTextImpliesCrmTool(d1b)) return 'yes';
  if (d1.length > 0 || typeof d1b === 'string') return 'no';
  return 'unknown';
}

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

const fallbacks = fallbacksRaw as {
  version: string;
  a5NoWebsiteYet: { matchPattern: string; fallbackOption: string };
  a5MultiPageSite?: { matchPattern: string; fallbackOption: string };
  c3AnalyticsNotOnSite: { equalsNormalized: string; fallbackOption: string };
  cNosite1LegacyFirstPartyWebLabels: string[];
};

/** Exact a5 option string for "no website yet" (from question-bank.v1.json, fallbacks in JSON). */
export const DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET: string = (() => {
  const opts = optionsForBankQuestion('a5');
  const re = new RegExp(fallbacks.a5NoWebsiteYet.matchPattern, 'i');
  const hit = opts.find(o => re.test(o));
  return hit ?? fallbacks.a5NoWebsiteYet.fallbackOption;
})();

/** Exact a5 option string for "multi-page public website" (from question-bank.v1.json). */
export const DISCOVERY_BRIEF_PATCH_A5_MULTI_PAGE_SITE: string = (() => {
  const opts = optionsForBankQuestion('a5');
  const matchPattern = fallbacks.a5MultiPageSite?.matchPattern ?? 'multi-page';
  const fallbackOption = fallbacks.a5MultiPageSite?.fallbackOption ?? 'Yes, multi-page site';
  const re = new RegExp(matchPattern, 'i');
  const hit = opts.find(o => re.test(o));
  return hit ?? fallbackOption;
})();

/** c3 option when Discovery implies no on-site analytics tool (from question-bank.v1.json, fallbacks in JSON). */
export const DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE: string = (() => {
  const opts = optionsForBankQuestion('c3');
  const needle = fallbacks.c3AnalyticsNotOnSite.equalsNormalized;
  const hit = opts.find(o => o.trim().toLowerCase() === needle);
  return hit ?? fallbacks.c3AnalyticsNotOnSite.fallbackOption;
})();

/**
 * Legacy c_nosite_1 labels from older bank versions. If still present in stored answers,
 * do not force brief c3 (analytics on site) to "No". Canon: `discovery-brief-fallbacks.v1.json`.
 */
export const C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS: readonly string[] =
  fallbacks.cNosite1LegacyFirstPartyWebLabels;

export function discoveryCnSite1SelectionsImplyFirstPartyWeb(selections: string[]): boolean {
  return selections.some(s => C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS.includes(s));
}
