/**
 * Versioned UI copy + i18n key registry (English defaults today).
 * Consumers use label maps for rendering; `i18nKey*` fields feed future catalogs.
 */
import type { DomainKey } from './audit-contract.js';
import type { MarketingBriefRoute } from './marketing-brief-routing.js';
import raw from './ui-copy-registry.v1.json' with { type: 'json' };
import { MARKETING_BRIEF_ALLOWED_ROUTES, SPA_MARKETING_BRIEF_PATHS } from './spa-routes.js';

export const UI_COPY_REGISTRY_VERSION = raw.version as string;

export const PUBLIC_DISCOVERY_UI_FRAGMENT_CONTRACT_VERSION = raw.contracts.publicDiscoveryUiFragmentVersion as string;

type MarketingRow = { route: string; i18nKey: string; labelEn: string };

type DomainRow = { domainKey: string; i18nKey: string; labelEn: string };

type ScoreRow = { i18nKey: string; labelEn: string; color: string };

type ReportProfileRow = {
  id: string;
  i18nKeyLabel: string;
  i18nKeyDescription: string;
  labelEn: string;
  descriptionEn: string;
};

export type ReportProfile = 'full' | 'owner' | 'tech' | 'marketing' | 'onepager';

const REPORT_PROFILE_ORDER: readonly ReportProfile[] = [
  'full',
  'owner',
  'tech',
  'marketing',
  'onepager',
] as const;

function assertMarketingRoutes(rows: MarketingRow[]): void {
  const allowed = new Set<string>(MARKETING_BRIEF_ALLOWED_ROUTES);
  for (const r of rows) {
    if (!allowed.has(r.route)) {
      throw new Error(`ui-copy-registry: unknown marketing route "${r.route}"`);
    }
  }
  for (const path of MARKETING_BRIEF_ALLOWED_ROUTES) {
    if (!rows.some(x => x.route === path)) {
      throw new Error(`ui-copy-registry: missing marketing copy for "${path}"`);
    }
  }
}

function buildDomainMaps(rows: DomainRow[]): {
  labels: Record<DomainKey, string>;
  i18nKeys: Record<DomainKey, string>;
} {
  const labels = {} as Record<DomainKey, string>;
  const i18nKeys = {} as Record<DomainKey, string>;
  for (const r of rows) {
    (labels as Record<string, string>)[r.domainKey] = r.labelEn;
    (i18nKeys as Record<string, string>)[r.domainKey] = r.i18nKey;
  }
  return { labels, i18nKeys };
}

function buildScoreMaps(scale: Record<string, ScoreRow>): {
  labels: Record<number, string>;
  colors: Record<number, string>;
  i18nKeys: Record<number, string>;
} {
  const labels: Record<number, string> = {};
  const colors: Record<number, string> = {};
  const i18nKeys: Record<number, string> = {};
  for (const [k, row] of Object.entries(scale)) {
    const n = Number(k);
    if (!Number.isFinite(n)) continue;
    labels[n] = row.labelEn;
    colors[n] = row.color;
    i18nKeys[n] = row.i18nKey;
  }
  return { labels, colors, i18nKeys };
}

function buildReportProfileMaps(rows: ReportProfileRow[]): {
  labels: Record<ReportProfile, string>;
  descriptions: Record<ReportProfile, string>;
  i18nKeyLabels: Record<ReportProfile, string>;
  i18nKeyDescriptions: Record<ReportProfile, string>;
} {
  const labels = {} as Record<ReportProfile, string>;
  const descriptions = {} as Record<ReportProfile, string>;
  const i18nKeyLabels = {} as Record<ReportProfile, string>;
  const i18nKeyDescriptions = {} as Record<ReportProfile, string>;
  const seen = new Set<string>();
  const allowedIds = REPORT_PROFILE_ORDER as readonly string[];
  for (const r of rows) {
    if (!allowedIds.includes(r.id)) {
      throw new Error(`ui-copy-registry: unknown report profile "${r.id}"`);
    }
    seen.add(r.id);
    const id = r.id as ReportProfile;
    labels[id] = r.labelEn;
    descriptions[id] = r.descriptionEn;
    i18nKeyLabels[id] = r.i18nKeyLabel;
    i18nKeyDescriptions[id] = r.i18nKeyDescription;
  }
  if (seen.size !== REPORT_PROFILE_ORDER.length) {
    throw new Error('ui-copy-registry: reportProfiles must cover all profile ids');
  }
  return { labels, descriptions, i18nKeyLabels, i18nKeyDescriptions };
}

const marketingRows = raw.marketingBriefRoutes as MarketingRow[];
assertMarketingRoutes(marketingRows);

const { labels: DOMAIN_DISPLAY_LABELS, i18nKeys: DOMAIN_DISPLAY_I18N_KEYS } = buildDomainMaps(
  raw.domainDisplay as DomainRow[],
);

const { labels: SCORE_LABELS, colors: SCORE_COLORS, i18nKeys: SCORE_LABEL_I18N_KEYS } = buildScoreMaps(
  raw.scoreScale as Record<string, ScoreRow>,
);

const {
  labels: REPORT_PROFILE_LABELS,
  descriptions: REPORT_PROFILE_DESCRIPTIONS,
  i18nKeyLabels: REPORT_PROFILE_I18N_KEY_LABELS,
  i18nKeyDescriptions: REPORT_PROFILE_I18N_KEY_DESCRIPTIONS,
} = buildReportProfileMaps(raw.reportProfiles as ReportProfileRow[]);

const mdFocus = raw.reportMarkdownFocusTitle as {
  tech: { i18nKey: string; labelEn: string };
  marketing: { i18nKey: string; labelEn: string };
};

export const REPORT_PROFILE_MARKDOWN_FOCUS_TITLE: Record<'tech' | 'marketing', string> = {
  tech: mdFocus.tech.labelEn,
  marketing: mdFocus.marketing.labelEn,
};

export const REPORT_PROFILE_MARKDOWN_FOCUS_I18N_KEYS: Record<'tech' | 'marketing', string> = {
  tech: mdFocus.tech.i18nKey,
  marketing: mdFocus.marketing.i18nKey,
};

export {
  DOMAIN_DISPLAY_LABELS,
  DOMAIN_DISPLAY_I18N_KEYS,
  REPORT_PROFILE_DESCRIPTIONS,
  REPORT_PROFILE_I18N_KEY_DESCRIPTIONS,
  REPORT_PROFILE_I18N_KEY_LABELS,
  REPORT_PROFILE_LABELS,
  SCORE_COLORS,
  SCORE_LABELS,
  SCORE_LABEL_I18N_KEYS,
};

export const REPORT_PROFILES: ReportProfile[] = [...REPORT_PROFILE_ORDER];

/** English labels keyed by marketing SPA path (for brief preview UI). */
export const MARKETING_BRIEF_ROUTE_LABELS_EN: Record<MarketingBriefRoute, string> = (() => {
  const out = {} as Record<MarketingBriefRoute, string>;
  for (const r of marketingRows) {
    (out as Record<string, string>)[r.route] = r.labelEn;
  }
  return out;
})();

export const MARKETING_BRIEF_ROUTE_I18N_KEYS: Record<MarketingBriefRoute, string> = (() => {
  const out = {} as Record<MarketingBriefRoute, string>;
  for (const r of marketingRows) {
    (out as Record<string, string>)[r.route] = r.i18nKey;
  }
  return out;
})();

/** Dev-only: ensure registry paths stay aligned with `SPA_MARKETING_BRIEF_PATHS`. */
export function assertMarketingCopyMatchesSpaRoutes(): void {
  for (const k of Object.keys(SPA_MARKETING_BRIEF_PATHS) as (keyof typeof SPA_MARKETING_BRIEF_PATHS)[]) {
    const path = SPA_MARKETING_BRIEF_PATHS[k];
    if (MARKETING_BRIEF_ROUTE_LABELS_EN[path] == null || MARKETING_BRIEF_ROUTE_I18N_KEYS[path] == null) {
      throw new Error(`ui-copy-registry: missing marketing copy for SPA path ${path} (${String(k)})`);
    }
  }
}

void assertMarketingCopyMatchesSpaRoutes();
