/**
 * Canonical numeric defaults for server behaviour (static CONFIG layer).
 * Deploy-time overrides: documented `process.env.*` in each consuming module under
 * `server/src/config/` (ops tuning — not secrets).
 */

export const SYSTEM_DEFAULTS = {
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
  crawler: {
    maxPages: 20,
    maxPagesHardCap: 100,
    pageTimeoutMs: 15_000,
    totalBudgetMs: 90_000,
  },
  snapshotFetchBudgetMs: 10_000,
  /** Collector cache TTL when `COLLECTOR_CACHE_TTL_MS` is unset (24 hours). */
  collectorCacheTtlMs: 86_400_000,
  alerts: {
    windowMinutes: 15,
    windowMinutesMin: 1,
    windowMinutesMax: 1440,
    intervalMs: 60_000,
    failureRateThreshold: 0.2,
    latencyP95MsThreshold: 180_000,
    tokenBurn15mThreshold: 300_000,
    cooldownMs: 900_000,
    lockTtlMs: 55_000,
  },
  observability: {
    pipelineErrorStackMaxChars: 500,
  },
} as const;
