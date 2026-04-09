import { z } from 'zod';

/** Normalized facts from tiered fetch + cheerio (input to classifier + audit rules). */
export const SnapshotFactsSchema = z.object({
  site: z.object({
    normalizedUrl: z.string(),
    homepageUrl: z.string(),
  }),
  document: z.object({
    lang: z.string().nullable(),
  }),
  contentQuality: z.enum(['high', 'medium', 'low']),
  appShellLikely: z.boolean(),
  siteText: z.object({
    title: z.string(),
    metaDescription: z.string(),
    /** og:description when `<meta name="description">` is empty or duplicated elsewhere. */
    ogDescription: z.string(),
    h1: z.string(),
    h1Count: z.number(),
    h2Texts: z.array(z.string()),
    topHeadings: z.array(z.string()),
    navItems: z.array(z.string()),
    ctaTexts: z.array(z.string()),
    topParagraphs: z.array(z.string()),
    bodyTextSample: z.string(),
  }),
  schema: z.object({
    types: z.array(z.string()),
  }),
  contact: z.object({
    phonePresent: z.boolean(),
    emailPresent: z.boolean(),
    addressPresent: z.boolean(),
    openingHoursPresent: z.boolean(),
  }),
  urls: z.object({
    slugs: z.array(z.string()),
    internalSample: z.array(z.string()),
  }),
  tech: z.object({
    platforms: z.array(z.string()),
    stackByCategory: z.record(z.array(z.string())),
  }),
  meta: z.object({
    canonical: z.string(),
    robotsMeta: z.string(),
    hasNoindex: z.boolean(),
    /** Homepage has a non-empty viewport meta (mobile baseline). */
    viewportPresent: z.boolean(),
    /** og:title present — light social/discoverability signal. */
    openGraphTitlePresent: z.boolean(),
  }),
  images: z.object({
    total: z.number(),
    withAlt: z.number(),
  }),
  forms: z.object({
    present: z.boolean(),
    primaryFieldCount: z.number(),
    primaryRequiredCount: z.number(),
    primaryHasLabels: z.boolean(),
  }),
  blocks: z.object({
    faqLike: z.boolean(),
    testimonialLike: z.boolean(),
    pricingMention: z.boolean(),
    processLike: z.boolean(),
  }),
  /** Hero-region CTA count (intent verbs); used by UX/CV rules */
  heroPrimaryCtaCount: z.number().optional(),
  /** Title/H1 looks like generic marketing fluff */
  genericMarketingHero: z.boolean().optional(),
  /** Hints for machine-facing surface (sitemap links, AI discovery files) from sampled HTML. */
  machineReadableSurface: z.object({
    sitemapLinkInHtml: z.boolean(),
    llmsOrAiTxtLinked: z.boolean(),
  }),
});

export type SnapshotFacts = z.infer<typeof SnapshotFactsSchema>;

/** Machine/AI surface gaps surfaced to clients (copy mapped in the app). */
export type AiVisibilityGapId = 'robots_txt' | 'sitemap_html' | 'structured_data' | 'discovery_files';

export const SiteProfileSchema = z.object({
  siteType: z.string(),
  industry: z.string(),
  conversionModel: z.string(),
  primaryOffer: z.string(),
  shortLabel: z.string(),
  audienceGuess: z.enum(['b2b', 'b2c', 'b2b2c', 'unknown']),
  businessSignals: z.array(z.string()),
  classificationConfidence: z.number().min(0).max(1),
  classificationConfidenceBand: z.enum(['high', 'medium', 'low']),
  companyNameGuess: z.string().nullable(),
  locationGuess: z.string().nullable(),
});

export type SiteProfile = z.infer<typeof SiteProfileSchema>;

/** Public, machine-readable trace for snapshot site-type rules (no PII). */
export interface SnapshotClassificationTransparency {
  matched_signals: string[];
  runner_up_site_type: string | null;
  runner_up_match_count: number | null;
  tie_ambiguous: boolean;
  score_top_two: [string, number][];
}

export const SnapshotAuditCategorySchema = z.enum([
  'ux_clarity',
  'conversion_readiness',
  'ai_readiness',
  'technical_basics',
]);
export type SnapshotAuditCategory = z.infer<typeof SnapshotAuditCategorySchema>;

export const RuleResultSchema = z.object({
  id: z.string(),
  category: SnapshotAuditCategorySchema,
  status: z.enum(['pass', 'partial', 'fail']),
  score: z.number(),
  maxScore: z.number(),
  evidence: z.array(z.string()),
  issueKey: z.string().optional(),
  quickWinKey: z.string().optional(),
  impactTier: z.enum(['high', 'medium', 'low']),
});

export type RuleResult = z.infer<typeof RuleResultSchema>;

export const SnapshotAuditResultSchema = z.object({
  overallScore: z.number(),
  categoryScores: z.record(z.number()),
  ruleResults: z.array(RuleResultSchema),
  scanBasis: z.string(),
  signalsFound: z.array(z.string()),
  scanConfidenceBand: z.enum(['high', 'medium', 'low']),
  /** Matches `version` in audit-rules YAML after filtering by site type. */
  rulesCatalogVersion: z.number().optional(),
  /** Normalized basis for API / UI (ADR). Omitted on legacy cache rows. */
  scanBasisCode: z
    .enum([
      'homepage_only',
      'homepage_plus_core_pages',
      'homepage_rendered_fallback',
      'degraded',
      'cache_hit',
    ])
    .optional(),
});

export type SnapshotAuditResult = z.infer<typeof SnapshotAuditResultSchema>;

export interface FetchedPage {
  url: string;
  html: string;
  status: number;
  finalUrl: string;
}

/** How much of the site was actually fetched (for transparency in UI and API). */
export const SnapshotPageRoleSchema = z.enum([
  'home',
  'contact',
  'pricing',
  'about',
  'services',
  'other',
]);
export type SnapshotPageRole = z.infer<typeof SnapshotPageRoleSchema>;

export const SnapshotScanCoverageSchema = z.object({
  budgetMs: z.number(),
  elapsedMs: z.number(),
  pagesFetched: z.number(),
  maxPagesPlanned: z.number(),
  pages: z.array(
    z.object({
      finalUrl: z.string(),
      status: z.number(),
      role: SnapshotPageRoleSchema,
    }),
  ),
  /** Static homepage HTML matched client-shell heuristics (thin text + many scripts or known root mounts). */
  playwrightEligible: z.boolean().optional(),
  /** Homepage HTML was replaced with a Chromium-rendered document (tier-3). */
  playwrightUsed: z.boolean().optional(),
  /** robots.txt was retrieved (HTTP success); false if missing or error. */
  robotsTxtFetched: z.boolean().optional(),
  /** robots.txt disallows crawling `/` for our snapshot user-agent — no pages fetched. */
  robotsHomeDisallowed: z.boolean().optional(),
  /** When homepage is disallowed: HEAD probe on the same URL (no body; status / headers only). */
  robotsHeadProbe: z
    .object({
      status: z.number(),
      contentType: z.string().optional(),
      finalUrl: z.string().optional(),
      xRobotsTag: z.string().optional(),
      uaUsed: z.enum(['glc_scanner', 'browser_compat']).optional(),
    })
    .optional(),
  /** Deterministic bucket for copy / profile notes when `robotsHomeDisallowed`. */
  robotsFallbackSiteClass: z.enum(['major_platform', 'standard']).optional(),
  /** Extra same-origin URLs skipped due to robots Disallow rules. */
  robotsExtrasSkipped: z.number().optional(),
  /** Milliseconds slept between fetches to honor Crawl-delay (capped). */
  crawlDelayMsApplied: z.number().optional(),
  /** Why the homepage could not be used (when `pages` is empty and robots allowed). */
  homeFetchFailure: z
    .enum(['network_or_timeout', 'http_error', 'non_html', 'empty_body'])
    .optional(),
  /** HTML heuristics — machine-readable (API snake_case via `toApiScanCoverage`). */
  challengeLikely: z.boolean().optional(),
  /** Sub-type when `challengeLikely` (e.g. `cloudflare`, `generic_bot_interstitial`). */
  challengeTaxonomy: z.string().optional(),
  parkedLikely: z.boolean().optional(),
  parkedTaxonomy: z.string().optional(),
  loginWallLikely: z.boolean().optional(),
  loginWallTaxonomy: z.string().optional(),
});

export type SnapshotScanCoverage = z.infer<typeof SnapshotScanCoverageSchema>;

export interface SnapshotCachePayload {
  version: 1;
  site_profile: SiteProfile;
  audit: SnapshotAuditResult;
  tech_stack: Record<string, string[]>;
  /** Weak-signal hints (JSON-LD, generator, SPA shell); not verified like `tech_stack`. */
  tech_stack_tentative?: Array<{ name: string; category: string; signal: string }>;
  pages_crawled: import('../types/audit.js').CrawledPage[];
  /** Fetch budget and pages actually retrieved (optional on older cache rows). */
  scan_coverage?: SnapshotScanCoverage;
  company_name: string | null;
  location: string | null;
  languages: string[];
  /** Cached rows should use empty lists for raw contacts (see `redactSnapshotPayloadForDomainCache`). */
  contact_info: { emails: string[]; phones: string[]; addresses: string[] };
  /** ISO timestamp when this snapshot payload was produced (fresh run). */
  scanned_at?: string;
  /** User-facing constraint messages (degraded / partial runs). */
  limitations?: string[];
  /** Gaps in machine/AI-oriented surface coverage inferred from this scan (for client copy). */
  ai_visibility?: { gaps: AiVisibilityGapId[] };
  /** True when no HTML could be scored (e.g. robots block, unreachable). */
  degraded?: boolean;
  /** Public-facing excerpt from the fetched homepage (title + meta / OG / first paragraph). */
  homepage_snippet?: { title: string; description: string };
  classification_version?: number;
  fetch_strategy_version?: string;
  snapshot_engine_version?: string;
  /** Which YAML signals fired and runner-up site type counts (helps explain `site_profile.siteType`). */
  classification_transparency?: SnapshotClassificationTransparency;
}
