/**
 * Fact-checker policy: score caps, coverage ratios, confidence blending.
 */

export const FACT_CHECKER_THRESHOLDS = {
  security: {
    invalidSslMaxScore: 2,
    missingCriticalHeadersMinCount: 2,
    missingCriticalHeadersFlagMinScore: 4,
  },
  seo: {
    perfectScore: 5,
    metaDescriptionMinCoverage: 0.5,
    metaDescriptionFlagMinScore: 4,
  },
  tech: {
    flagMinScore: 4,
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
} as const;
