/**
 * Default English marketing footer copy (public pages).
 * Override at deploy time via GET /api/public/brand env: PUBLIC_BRAND_NAME, PUBLIC_SUPPORT_EMAIL, PUBLIC_BRAND_LEGAL_LINE.
 */

export const GLC_DEV_BRAND_NAME = 'GLC Tech' as const;

export const GLC_DEV_BRAND_LEGAL_LINE = 'Palma de Mallorca · Spain · GLC Tech / GLCTech' as const;

/** Structured strings for MarketingFooter; paths stay in marketing-nav (SPA). */
export const GLC_DEV_MARKETING_FOOTER_EN = {
  brandTitle: GLC_DEV_BRAND_NAME,
  introParagraph:
    'Audits of digital systems, processes, and your website. Bottlenecks, priorities, automation, and a clear roadmap—from diagnosis to implementation.',
  routesSectionTitle: 'Routes',
  clientSignInLabel: 'Client sign-in',
  nextStepSectionTitle: 'Next step',
  nextStepBeforeSnapshot: 'Not sure where to start? Try ',
  snapshotLinkLabel: 'Snapshot',
  nextStepBetweenSnapshotAndBrief: '. Want a human in the loop—',
  briefLinkLabel: 'short brief',
  nextStepAfterBrief: '.',
  legalLine: GLC_DEV_BRAND_LEGAL_LINE,
} as const;

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
