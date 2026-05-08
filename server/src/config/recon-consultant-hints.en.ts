/**
 * Admin-facing consultant hints attached to recon context summary (Phase 0).
 * Shown in pipeline review UI; not client portal copy.
 */

export const RECON_CONTEXT_SUMMARY_CONSULTANT_HINTS_POLICY = {
  maxHints: 12,
  /** Few pages often means incomplete footprint; prompt consultant to widen scope. */
  thinCrawlPageMax: 2,
} as const;

export const RECON_CONSULTANT_HINTS_COPY_EN = {
  askPublicFootprint:
    'Ask the client to add a canonical public URL—or LinkedIn company page, app listing, storefront, or portfolio—so later phases anchor to real collateral.',
  askWebEvidenceThin:
    'Offer to deepen web evidence (extra key URLs, storefront subpaths, locales, help center) or a short stakeholder map before approving deeper crawl-dependent scoring.',
  askValueProposition:
    'Invite the client to summarize value proposition and main offer (one paragraph is enough) via intake edits, notes, or a slide deck attachment.',
  askTargetAudience:
    'Ask who buys or uses the product (segments, geography, buyer vs user) and paste it into the intake brief or Consultant notes.',
  askProductsServices:
    'Collect a concise list of products/services and monetization basics (SKU, SaaS tiers, bookings, etc.).',
  crawlTechThin:
    'Few tech signals auto-detected on the crawl—confirm real stack if traffic is gated, single-page-heavy, or tag manager hides tools; capture corrections in Consultant notes.',
  crawlSocialThin:
    'Limited public social links found—confirm official profiles (especially LinkedIn, Instagram, storefront social) so Marketing/SEO do not chase ghosts.',
  crawlContactThin:
    'No dependable public email or phone was extracted—ask the client to confirm primary inbound routes or where leads should reply; capture in Consultant notes if sensitive.',
  askArtifactsNoSite:
    'Without a conventional site, request artifacts: investor deck snippet, KPI export, funnel map, product screenshots, or support portal URL—even partial helps.',
  modeIdeaDiscovery:
    'For idea-stage work, ask for 2–3 short discovery bullets: who you talked to, what you learned, and the riskiest assumption to test.',
  modeProblemBaseline:
    'For problem-heavy intakes, ask for baseline numbers (volume, conversion, SLA, backlog) even if approximate—strategy phases need measurable anchors.',
  modeMixedLockTruth:
    'When inputs disagree, prioritize what the client certifies today and freeze it in Consultant notes before downstream automation and roadmap work.',
  websiteApproveWithCorrections:
    'Typical crawl path still benefits from verifying brand name, HQ region, flagship offering, and any regulated-industry disclaimers—the client can confirm inline or in notes.',
} as const;
