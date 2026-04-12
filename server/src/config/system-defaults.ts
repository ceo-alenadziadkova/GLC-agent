/**
 * Canonical defaults for server behaviour (static CONFIG layer).
 * Prefer adding tunables here; use `process.env` only for secrets, deploy wiring, or
 * documented infra needs (see `server/.env.example`).
 */

export const SYSTEM_DEFAULTS = {
  express: {
    jsonBodyLimit: '2mb',
  },
  rateLimits: {
    auditCreateMaxPerDay: 5,
    auditCreateWindowHours: 24,
    pipelineMaxPerHour: 30,
    pipelineWindowMinutes: 60,
    generalMaxPerMin: 100,
    generalWindowSeconds: 60,
    snapshotPublicMaxPerDay: 3,
    snapshotPublicWindowHours: 24,
    logIngestMaxPerMin: 180,
    logIngestWindowSeconds: 60,
    snapshotCompareMaxPerHour: 15,
    snapshotCompareWindowHours: 1,
    snapshotLogIngestMaxPerMin: 40,
  },
  auditsList: {
    defaultLimit: 50,
    maxLimit: 200,
  },
  /**
   * Supabase `.limit()` caps and list pagination for dashboard / status routes.
   */
  routeQueries: {
    notifications: { defaultLimit: 30, maxLimit: 100, minLimit: 1 },
    discoverSessionsMaxRows: 100,
    intakeSubmissionsMaxRows: 100,
    pipelineStatusEventsLimit: 50,
  },
  /** Report export / markdown profile slice sizes (`ReportProfiler`). */
  reportProfiler: {
    ownerTopIssuesMax: 5,
    ownerTopRecsMax: 8,
    onepagerTopIssuesMax: 3,
    onepagerTopQuickWinsMax: 3,
  },
  /** Upper bounds on arrays stored or shown from collectors and follow-up heuristics. */
  collectorsSampling: {
    crawlerContactFieldMax: 10,
    marketingBlogPageSamples: 3,
    accessibilityAuditUrlsMax: 5,
    axePlaywrightUrlsMax: 5,
    axeViolationIdSampleMax: 8,
    uxSampleH1sMax: 5,
    uxSampleCtasMax: 5,
    postAuditFollowupsMax: 2,
  },
  /** Tentative tech hints cap (fast snapshot heuristics). */
  techTentative: {
    maxHints: 8,
  },
  crawler: {
    maxPages: 20,
    maxPagesHardCap: 100,
    pageTimeoutMs: 15_000,
    totalBudgetMs: 90_000,
  },
  collectorsHttp: {
    fetchTimeoutMs: 10_000,
    headerPreviewMax: 200,
    seoFetchTimeoutMs: 15_000,
    seoRobotsContentMax: 2000,
    sitemapFetchTimeoutMs: 25_000,
  },
  /** Wappalyzer-style inline script scan bound (memory / CPU). */
  techWappalyzer: {
    maxInlineScriptChars: 400_000,
  },
  snapshotPublic: {
    freeSnapshotTokenBudget: 80_000,
    tokenTtlHours: 72,
    guestFunnelRetentionDays: 90,
    guestHeaderMaxLen: 2000,
    uxSummaryMaxChars: 280,
    competitorTimeoutMs: 3000,
  },
  snapshotGuestSession: {
    cookieName: 'glc_snapshot_guest',
    maxAgeSec: 90 * 24 * 60 * 60,
    tokenBytes: 32,
  },
  idempotency: {
    ttlHours: 24,
  },
  snapshotAudit: {
    partialScoreFactor: 0.5,
  },
  snapshotFetchBudgetMs: 10_000,
  collectorCacheTtlMs: 86_400_000,
  alerts: {
    windowMinutes: 15,
    windowMinutesMin: 1,
    windowMinutesMax: 1440,
    intervalMs: 60_000,
    /** Idempotency cleanup `setInterval` runs every `intervalMs * this` (see `services/alerts.ts`). */
    idempotencyCleanupTickMultiplier: 5,
    failureRateThreshold: 0.2,
    latencyP95MsThreshold: 180_000,
    tokenBurn15mThreshold: 300_000,
    cooldownMs: 900_000,
    lockTtlMs: 55_000,
  },
  observability: {
    pipelineErrorStackMaxChars: 500,
    /** Default Sentry traces sample rate when `SENTRY_TRACES_SAMPLE_RATE` is unset. */
    sentryTracesSampleRateDefault: 0.2,
  },
  /** Raw collector JSON injected into Claude context (`ContextBuilder`). */
  contextBuilder: {
    maxRawCharsPerCollector: 40_000,
    maxTotalRawChars: 120_000,
  },
  publicRouteRateLimits: {
    intakeLegacyMaxPerHour: 30,
    discoverCreateMaxPerHour: 12,
    discoverReadMaxPerHour: 80,
    discoverAnalyticsMaxPerHour: 200,
    intakeReadMaxPerHour: 60,
    intakeWriteMaxPerHour: 30,
    marketingBriefMaxPerHour: 24,
  },
  pipelineModel: {
    claudeModelId: 'claude-sonnet-4-20250514',
    /** USD per 1M tokens (input / output) for `claudeModelId`; used by token-tracker cost estimates. */
    usdPerMillionTokens: { input: 3.0, output: 15.0 },
    minTokenReserve: 10_000,
    budgetWarningThreshold: 0.8,
    maxTokensDomain: 4096,
    maxTokensStrategy: 8192,
    maxTokensRecon: 4096,
  },
  /** Other Anthropic model IDs token-tracker may see (e.g. historical rows); not the pipeline default. */
  anthropicAlternateModelPricingUsdPerMtok: {
    'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
    'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
  },
  claudeHttp: {
    maxRetries: 3,
    retryBaseMs: 1500,
    retryJitterMs: 300,
    timeoutMs: 90_000,
    cbThreshold: 3,
    cbTtlSec: 60,
  },
  pipelineOrchestrator: {
    stalledPhaseTimeoutMin: 15,
    parallelFailureThreshold: 2,
  },
  pipelineWorker: {
    leaseTtlSeconds: 60,
    heartbeatMs: 10_000,
    concurrency: 2,
  },
  pipelineQueue: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    jobAttempts: 3,
  },
  snapshotTiming: {
    fetchMinRemainingMs: 800,
    fetchSinglePageBudgetCapMs: 8000,
    headMinRemainingMs: 500,
    headBudgetCapMs: 3500,
    robotsAbortMinMs: 500,
    robotsAbortMaxMs: 2500,
    maxExtraPages: 3,
    maxDiscoveryLinks: 80,
    maxHtmlBytes: 3_000_000,
    playwrightRemainingReserveMs: 1200,
    playwrightMinBudgetMs: 4500,
    crawlDelayRoomSubtractMs: 400,
    pwBudgetSubtractMs: 2000,
    pwNavTimeoutMinMs: 4000,
    pwNavTimeoutMaxMs: 25_000,
    pwSettleMinMs: 300,
    pwSettleMaxMs: 2000,
    pwVisibleTextMinChars: 280,
    pwVisibleTextRatio: 1.1,
    pwVisibleShortBeforeMax: 220,
    pwVisibleShortGainMin: 80,
    axeNavTimeoutMinMs: 4000,
    axeNavTimeoutMaxMs: 30_000,
  },
  snapshotAbuse: {
    maxConcurrent: 4,
    domainFreshCooldownMs: 10 * 60 * 1000,
    useSharedAbuseStore: false,
  },
  snapshotRobots: {
    cacheMs: 20 * 60 * 1000,
  },
  snapshotDomainCache: {
    ttlHours: 48,
  },
  snapshotLinkSlug: {
    max: 80,
    hardCap: 200,
  },
  snapshotTieredFetch: {
    playwrightEnabled: true,
    playwrightBudgetMs: 14_000,
    robotsHeadRetryBrowserUa: false,
  },
  snapshotClassification: {
    debugSignals: false,
  },
  pageAnomaly: {
    sampleBytes: 96_000,
    registrarThinVisibleMax: 3_800,
    oauthRawMarkupMax: 16_000,
    passwordRawMarkupMax: 12_000,
    spaShellVisibleMax: 520,
    spaShellScriptMin: 10,
    suppressOrgVisibleMin: 350,
    suppressMailtoVisibleMin: 650,
    suppressPathLinksHigh: 12,
    suppressPathLinksHighVisibleMin: 550,
    suppressPathLinksMed: 8,
    suppressPathLinksMedVisibleMin: 1_800,
    suppressLongCopyVisibleMin: 3_200,
  },
  auditDeepScan: {
    deepScanEnabled: false,
    lighthouseEnabled: false,
    axePlaywrightEnabled: false,
    lighthouseBudgetMsDefault: 55_000,
    lighthouseBudgetMsMin: 10_000,
    lighthouseBudgetMsMax: 120_000,
    axeNavigateTimeoutMsDefault: 12_000,
    axeNavigateTimeoutMsMin: 4000,
    axeNavigateTimeoutMsMax: 30_000,
  },
  /**
   * Version token in `GLC-*` product names inside outbound user-agents (not the Chromium build string).
   * Bump when you intentionally change how we identify bots to external sites.
   */
  outboundBot: {
    uaProductVersion: '1.0',
  },
  /** Length caps for `upgradeFreeSnapshotAudit` scraped-context prefill (not CMS copy). */
  upgradeFreeSnapshotPrefill: {
    industrySpecifyMaxChars: 200,
    uxRowSummarySoftMaxChars: 400,
    uxRowSummarySliceChars: 397,
    businessActivityBlurbMaxChars: 1200,
    reconPrefillTechStackLinesMax: 40,
  },
} as const;
