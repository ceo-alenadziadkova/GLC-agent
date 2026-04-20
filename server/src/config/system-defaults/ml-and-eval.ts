/**
 * Evaluation `evaluation_datasets` inserts: `isEvaluationDatasetsInsertEnabled()` in `feature-flags.ts`
 * (default: `featureFlags.evaluationDatasetsInsertEnabled`).
 *
 * ML Bandits: ε-greedy agent-variant selection per GLC domain phase.
 * Master on/off: `isBanditsEnabled()` in `feature-flags.ts` (default: `featureFlags.banditsEnabled`; env FEATURE_BANDITS=true enables).
 *
 * Activation requires all three readiness gates to pass (see bandit.ts).
 * Falls back to 'default' variant on any gate failure, disabled flag, or DB error.
 *
 * See ADR-ML-BANDITS.md for full design rationale.
 */
export const SYSTEM_DEFAULTS_BANDITS = {
  /** ε-greedy exploration rate: probability of picking a random arm. */
  epsilon: 0.15,
  /** Minimum evaluation runs per arm before bandit considers it reliable. */
  minEvaluationCount: 10,
  /**
   * Minimum distinct phase_ids with sufficient arm data before any bandit activates.
   * Prevents a single outlier client from skewing the policy.
   */
  minPhasesWithData: 3,
  /**
   * Maximum non-default variants allowed per phase.
   * 2 non-default + 1 implicit default = 3 total arms (keeps ε-greedy convergence tractable).
   */
  maxVariantsPerPhase: 2,
  /** Distributed lock TTL for platform-triggered bandit recompute. */
  recomputeLockTtlMs: 10 * 60 * 1000,
} as const;

export const SYSTEM_DEFAULTS_EVALUATION_DATASETS = {
  /** Retry attempts for `(audit_id, phase_id, run_number)` insert conflicts in `evaluation_datasets`. */
  insertMaxRetries: 3,
  /** Background cleanup interval for deleting rows where `expires_at < now()`. */
  cleanupIntervalMs: 5 * 60 * 1000,
} as const;

/**
 * Domain benchmark snapshots (evaluation_datasets rollups). Master: `isBenchmarksEnabled()` in `feature-flags.ts`.
 * Recompute via `POST /api/benchmarks/recompute` (cron secret) or `POST /api/platform/benchmarks/recompute` (platform admin).
 * See ADR-DOMAIN-BENCHMARKS.md.
 */
export const SYSTEM_DEFAULTS_BENCHMARKS = {
  /** Minimum rows in a (phase_id × industry × period) bucket before a snapshot is stored. */
  minSampleCount: 20,
  /** Period used when attaching `context.benchmark_reference_id` during pipeline publish. */
  defaultReferencePeriod: 'last_90d' as const,
  /** Periods computed on each recompute run. */
  computePeriods: ['last_30d', 'last_90d', 'all_time'] as const,
  /**
   * Only evaluation rows with these `decision_applied` values contribute (aligned with remediation eligibility).
   */
  includedDecisionHints: ['accept', 'accept_with_warnings'] as const,
  /** How many dominant error codes to persist in `top_error_types`. */
  topErrorTypesCount: 3,
  /** Page size when scanning evaluation_datasets (PostgREST range). */
  evaluationPageSize: 1000,
  /** Rolling window length for time-bounded periods (UTC day count). */
  periodDays: {
    last_30d: 30,
    last_90d: 90,
  } as const,
} as const;

export const SYSTEM_DEFAULTS_AGENT_PERFORMANCE = {
  minEvaluationCount: 10,
  scoreWeights: {
    hallucination: 0.4,
    inconsistency: 0.25,
    riskyPromise: 0.2,
    unverified: 0.15,
  },
} as const;
