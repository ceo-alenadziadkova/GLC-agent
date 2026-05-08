export const SYSTEM_DEFAULTS_RATE_LIMITS = {
  auditCreateMaxPerDay: 5,
  auditCreateWindowHours: 24,
  pipelineMaxPerHour: 30,
  pipelineWindowMinutes: 60,
  generalMaxPerMin: 100,
  generalWindowSeconds: 60,
  reportPdfMaxPerMin: 12,
  reportPdfWindowSeconds: 60,
  snapshotPublicMaxPerDay: 3,
  snapshotPublicWindowHours: 24,
  logIngestMaxPerMin: 180,
  logIngestWindowSeconds: 60,
  snapshotCompareMaxPerHour: 15,
  snapshotCompareWindowHours: 1,
  snapshotLogIngestMaxPerMin: 40,
  /** Unauthenticated POST /api/benchmarks/recompute (cron secret) — per IP per hour. */
  benchmarkRecomputeMaxPerHour: 12,
} as const;

export const SYSTEM_DEFAULTS_PUBLIC_ROUTE_RATE_LIMITS = {
  intakeLegacyMaxPerHour: 30,
  discoverCreateMaxPerHour: 12,
  discoverReadMaxPerHour: 80,
  discoverUiFragmentReadMaxPerHour: 600,
  discoverAnalyticsMaxPerHour: 200,
  briefPublicCreateMaxPerHour: 24,
  briefPublicReadMaxPerHour: 80,
  briefPublicWriteMaxPerHour: 40,
  intakeReadMaxPerHour: 60,
  /**
   * POST /api/intake/:token/* (respond, next-question, etc.) per (token, client IP) per hour.
   * Set high enough for a long adaptive flow plus extra intelligence/NL calls.
   */
  intakeWriteMaxPerHour: 300,
  /**
   * When `NODE_ENV` is not `production` (local dev, tests): avoid blocking a single `localhost` IP
   * while still applying a finite guardrail in non-prod.
   */
  intakeWriteMaxPerHourNonProduction: 5000,
  marketingBriefMaxPerHour: 24,
} as const;
