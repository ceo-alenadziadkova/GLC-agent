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
  /** Min interval between Telegram notifications for the same user + support ref (`spa_ui_incident`). */
  spaUiIncidentTelegramCooldownMs: 300_000,
  /**
   * Delivery Board: min count of `plan_board_conflict_409` events after the first `plan_board_reconciled`
   * in the rolling alert window (same minutes as `windowMinutes`) before emitting `alert_plan_board_conflict_burst`.
   */
  boardConflictBurstMinCount: 3,
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
