/**
 * External truth connectors (`ConnectorRunner`, `server/src/connectors/*`).
 * Hard timeout caps per-connector `timeout_ms`; individual connectors may use stricter budgets.
 */
export const SYSTEM_DEFAULTS_CONNECTORS = {
  hardTimeoutMs: 3_000,
  /** Warn threshold for degraded connector runs: (timed_out + error) / total connectors. */
  degradedWarnRatio: 0.5,
  securityTxt: {
    fetchBudgetMs: 2_500,
    /** In-memory connector cache TTL to reduce repeat fetches in close reruns. */
    cacheTtlMs: 5 * 60 * 1000,
    maxBodyChars: 64_000,
    /** HTTPS path suffixes tried after host: `https://{host}{suffix}`. */
    pathSuffixes: ['/.well-known/security.txt', '/security.txt'],
    /**
     * Emitted `confirmed_fact_types` when file is well-formed.
     * Must stay aligned with `PHASE_PROFILES.security_compliance.high_risk_fact_types`.
     */
    confirmedFactTypes: ['compliance_status'],
    /** RFC 9116 `Contact:` field — RegExp source, tested per line (case-insensitive). */
    contactFieldLinePatternSource: '^\\s*Contact\\s*:',
  },
} as const;
