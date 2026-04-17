/** Upper bounds on arrays stored or shown from collectors and follow-up heuristics. */
export const SYSTEM_DEFAULTS_COLLECTORS_SAMPLING = {
  crawlerContactFieldMax: 10,
  marketingBlogPageSamples: 3,
  accessibilityAuditUrlsMax: 5,
  axePlaywrightUrlsMax: 5,
  axeViolationIdSampleMax: 8,
  uxSampleH1sMax: 5,
  uxSampleCtasMax: 5,
  postAuditFollowupsMax: 2,
} as const;

/** Tentative tech hints cap (fast snapshot heuristics). */
export const SYSTEM_DEFAULTS_TECH_TENTATIVE = {
  maxHints: 8,
} as const;

export const SYSTEM_DEFAULTS_CRAWLER = {
  maxPages: 20,
  maxPagesHardCap: 100,
  pageTimeoutMs: 15_000,
  totalBudgetMs: 90_000,
} as const;

export const SYSTEM_DEFAULTS_COLLECTORS_HTTP = {
  fetchTimeoutMs: 10_000,
  headerPreviewMax: 200,
  seoFetchTimeoutMs: 15_000,
  seoRobotsContentMax: 2000,
  sitemapFetchTimeoutMs: 25_000,
} as const;

/** Wappalyzer-style inline script scan bound (memory / CPU). */
export const SYSTEM_DEFAULTS_TECH_WAPPALYZER = {
  maxInlineScriptChars: 400_000,
} as const;

export const SYSTEM_DEFAULTS_COLLECTOR_CACHE_TTL_MS = 86_400_000;
