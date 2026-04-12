/**
 * Brand, footer, and sentinel strings — single source: `./public-brand-defaults.v1.json`.
 * Forks / white-label: edit the JSON only (no duplicate TS literals).
 */

import raw from './public-brand-defaults.v1.json' with { type: 'json' };

export const PUBLIC_BRAND_DEFAULTS_VERSION = raw.version as string;

/** Persisted `audits.company_url` when the client has no public site. */
export const GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL = raw.no_public_website_sentinel as string;

/** English UI label when `no_public_website` or sentinel URL applies (`formatAuditWebsiteDisplay`). */
export const GLC_DEV_NO_PUBLIC_WEBSITE_DISPLAY_EN = raw.no_public_website_display_en as string;

/** Canonical marketing / dev fallback public site origin (hostname used in non-prod when env unset). */
export const GLC_DEV_BRAND_ORIGIN = raw.brand_origin as string;

export const GLC_DEV_SUPPORT_EMAIL = raw.support_email as string;

export const GLC_DEV_BRAND_NAME = raw.brand_name as string;

export const GLC_DEV_BRAND_LEGAL_LINE = raw.legal_line as string;

/** Mutable strings for server overrides (env) and JSON responses. */
export type MarketingFooterCopyEn = {
  brandTitle: string;
  introParagraph: string;
  routesSectionTitle: string;
  clientSignInLabel: string;
  nextStepSectionTitle: string;
  nextStepBeforeSnapshot: string;
  snapshotLinkLabel: string;
  nextStepBetweenSnapshotAndBrief: string;
  briefLinkLabel: string;
  nextStepAfterBrief: string;
  legalLine: string;
};

function marketingFooterFromRaw(brandName: string, legalLine: string): MarketingFooterCopyEn {
  const f = raw.footer;
  return {
    brandTitle: brandName,
    introParagraph: f.introParagraph,
    routesSectionTitle: f.routesSectionTitle,
    clientSignInLabel: f.clientSignInLabel,
    nextStepSectionTitle: f.nextStepSectionTitle,
    nextStepBeforeSnapshot: f.nextStepBeforeSnapshot,
    snapshotLinkLabel: f.snapshotLinkLabel,
    nextStepBetweenSnapshotAndBrief: f.nextStepBetweenSnapshotAndBrief,
    briefLinkLabel: f.briefLinkLabel,
    nextStepAfterBrief: f.nextStepAfterBrief,
    legalLine,
  };
}

/** Default English marketing footer (public pages) — derived from JSON. */
export const GLC_DEV_MARKETING_FOOTER_EN = marketingFooterFromRaw(
  raw.brand_name,
  raw.legal_line,
);

export type PublicBrandDefaultsJsonV1 = typeof raw;
