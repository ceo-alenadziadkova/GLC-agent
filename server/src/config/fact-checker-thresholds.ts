/**
 * Fact-checker policy: score caps, coverage ratios, confidence blending.
 */

export const FACT_CHECKER_THRESHOLDS = {
  security: {
    invalidSslMaxScore: 2,
    missingCriticalHeadersMinCount: 2,
    missingCriticalHeadersFlagMinScore: 4,
    cookieIssuesMinCount: 1,
    hygieneHeadersMinCount: 1,
  },
  seo: {
    perfectScore: 5,
    metaDescriptionMinCoverage: 0.5,
    metaDescriptionFlagMinScore: 4,
  },
  tech: {
    flagMinScore: 4,
    maxAvgLoadTimeMs: 3500,
    minLazyLoadCoveragePercent: 30,
  },
  ux: {
    imageAltMinCoveragePercent: 50,
    flagMinScore: 4,
  },
  consistency: {
    maxScore: 5,
    minScore: 1,
    highScoreFlagMin: 4,
    strengthsToWeaknessesRatio: 2,
  },
  confidence: {
    perOverrideDeduction: 0.2,
    perFlagDeduction: 0.1,
    maxFlagDeduction: 0.2,
    lowConfidenceIssueRatio: 0.5,
    lowConfidencePenalty: 0.15,
    mediumConfidencePenalty: 0.05,
  },
  applyScore: {
    maxReductionSteps: 2,
    minScoreAfterReduction: 1,
  },
  /**
   * Heuristics for CONTROL_OBJECT population in `FactChecker.buildControlObject`.
   * Keep patterns maintainable here instead of inline in the service.
   */
  controlObjectHeuristics: {
    /** `errors.data_gaps` keys: truncate longer `unknown_items` strings to this max length. */
    unknownItemKeyMaxChars: 60,
    unknownItemKeyTruncationEllipsis: '...',
    /**
     * Alternation (inside word boundaries) for risky language on recommendations.
     * Compiled as `\b(${alternation})\b` with case-insensitive flag.
     */
    riskyRecommendationLanguageAlternation:
      'guarantee|guaranteed|definitely|certainly|always|never|100%|will increase|will reduce',
    /**
     * Structural `error_type` codes matching this pattern increment `counts.statuses.strategic_inconsistency`.
     */
    strategicInconsistencyStructuralCodePattern: 'conflict|mismatch|inconsistency',
    /** Weighted blend for `co.confidence.strategic` (0–100 scale). */
    strategicConfidence: {
      riskyPromiseMultiplier: 30,
      unverifiedMultiplier: 20,
    },
    /** Penalties subtracted from 100 for `co.confidence.consistency`. */
    consistencyConfidence: {
      structuralErrorMultiplier: 15,
      hallucinationMultiplier: 20,
    },
    /** Gates for `human_attention_required` in buildControlObject. */
    humanAttention: {
      minLikelyHallucination: 3,
      minDataGaps: 5,
      highRiskAssumptionsGte: 2,
      mediumRiskAssumptionsGte: 5,
      feasibilityScoreMaxInclusive: 0.35,
    },
  },
} as const;
