export const SYSTEM_DEFAULTS_ALERTS = {
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
} as const;

export const SYSTEM_DEFAULTS_OBSERVABILITY = {
  pipelineErrorStackMaxChars: 500,
  /** Default Sentry traces sample rate when `SENTRY_TRACES_SAMPLE_RATE` is unset. */
  sentryTracesSampleRateDefault: 0.2,
} as const;

/** Raw collector JSON injected into Claude context (`ContextBuilder`). */
export const SYSTEM_DEFAULTS_CONTEXT_BUILDER = {
  maxRawCharsPerCollector: 40_000,
  maxTotalRawChars: 120_000,
  /** Below this char budget, `trimJsonByTopLevelKeys` collapses to `{}`. */
  trimMinObjectChars: 2,
  /** Halve top-level arrays longer than this when serialised size exceeds the fraction threshold. */
  trimArrayHalveMinLength: 5,
  /** Halve step runs when `JSON.stringify(array).length > maxChars * this`. */
  trimArraySizeFractionOfMax: 0.25,
  /** Default `source` on brief response objects when omitted. */
  defaultBriefResponseSource: 'client',
} as const;
