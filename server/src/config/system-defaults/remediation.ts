/**
 * Phase 9 auto-remediation: deterministic tone fixes on cleaned domain output.
 * Master on/off: `isAutoRemediationEnabled()` in `feature-flags.ts` (FEATURE_AUTO_REMEDIATION=true).
 * Confidence gate must stay aligned with `DECISION_LAYER_THRESHOLDS.accept_with_warnings` in `decision-layer.ts`
 * (remediation service imports that object — do not duplicate the numeric threshold here).
 *
 * See ADR-AUTO-REMEDIATION.md.
 */
export const SYSTEM_DEFAULTS_AUTO_REMEDIATION = {
  /** Max chars stored in `audit_remediations.original_excerpt` / `applied_fix` (DB column budget). */
  auditLogFieldMaxChars: 500,
  /** Fallback excerpt length when building `original_excerpt` from summary. */
  excerptMaxChars: 500,
  /**
   * Decision hints for which output remediation may run (after an initial Decision Layer pass).
   * Refine runs are handled by auto-loop / manual review instead.
   */
  allowedDecisionHints: ['accept', 'accept_with_warnings'] as const,
  outcomeDisclaimerAppend:
    '\n\n[Note: Forward-looking statements above are hypotheses pending verification with data.]',
  /** Skip disclaimer append when summary already contains this substring (idempotency). */
  outcomeDisclaimerSkipIfContains: '[Note: Forward-looking statements',
  appliedFixDescription: {
    softenAbsolutes: 'Softened absolute or over-strong phrasing in domain text fields.',
    appendOutcomeDisclaimer: 'Appended forward-looking disclaimer to summary.',
  },
  /** Regex-driven softening for `remediation_action: soften_absolutes`. */
  absoluteSoftening: {
    phraseAlternation: [
      'guaranteed',
      'guarantee',
      'always',
      'never fails',
      'zero risk',
      'no risk',
      'risk-free',
      'certainly',
      'definitely will',
      'will never fail',
    ] as const,
    percentPatternSource: '100\\s*%',
    defaultReplacement: 'may',
    rules: [
      { type: 'starts_with' as const, prefix: '100', replacement: 'a large share' },
      { type: 'exact' as const, phrases: ['always'], replacement: 'often' },
      {
        type: 'exact' as const,
        phrases: ['never fails', 'will never fail'],
        replacement: 'may still fail',
      },
      { type: 'exact' as const, phrases: ['guaranteed', 'guarantee'], replacement: 'expected' },
      {
        type: 'exact' as const,
        phrases: ['zero risk', 'no risk', 'risk-free'],
        replacement: 'residual risk',
      },
      { type: 'exact' as const, phrases: ['certainly'], replacement: 'likely' },
      { type: 'exact' as const, phrases: ['definitely will'], replacement: 'may' },
    ],
  },
} as const;
