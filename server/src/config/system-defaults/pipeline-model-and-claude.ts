export const SYSTEM_DEFAULTS_PIPELINE_MODEL = {
  claudeModelId: 'claude-sonnet-4-20250514',
  /** USD per 1M tokens (input / output) for `claudeModelId`; used by token-tracker cost estimates. */
  usdPerMillionTokens: { input: 3.0, output: 15.0 },
  minTokenReserve: 10_000,
  budgetWarningThreshold: 0.8,
  maxTokensDomain: 4096,
  maxTokensStrategy: 8192,
  /** On-demand Strategy Lab execution pack (single Claude tool call). */
  maxTokensStrategyExecutionPack: 6144,
  maxTokensRecon: 4096,
} as const;

/** Other Anthropic model IDs token-tracker may see (e.g. historical rows); not the pipeline default. */
export const SYSTEM_DEFAULTS_ANTHROPIC_ALTERNATE_MODEL_PRICING_USD_PER_MTOK = {
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
} as const;

/** Stored `cost_usd` rounding in `pipeline_events` and audit cost rollups (`TokenTracker`). */
export const SYSTEM_DEFAULTS_TOKEN_TRACKER = {
  costUsdDecimalPlaces: 4,
} as const;

export const SYSTEM_DEFAULTS_CLAUDE_HTTP = {
  maxRetries: 3,
  retryBaseMs: 1500,
  retryJitterMs: 300,
  timeoutMs: 90_000,
  cbThreshold: 3,
  cbTtlSec: 60,
  /** HTTP statuses on which `BaseAgent` retries the Claude API call. */
  retryableAnthropicStatuses: [429, 500, 529] as const,
  /** Subset of retryable statuses that increment the distributed circuit-breaker counter. */
  circuitBreakerAnthropicStatuses: [500, 529] as const,
} as const;

/** Agent persistence policies (`BaseAgent` save paths, conflict retries). */
export const SYSTEM_DEFAULTS_AGENT_PERSISTENCE = {
  /**
   * When claiming `audit_domains` via INSERT after a failed pending UPDATE,
   * retry on Postgres unique_violation (concurrent version bump races).
   */
  auditDomainsInsertMaxAttemptsOnConflict: 3,
  /** Postgres `sqlstate` for unique_violation — stable across Supabase/Postgres. */
  postgresUniqueViolationSqlState: '23505' as const,
} as const;
