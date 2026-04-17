/**
 * Score-to-label mapping used by FactChecker.verify().
 *
 * Numeric bands live here to avoid scattering thresholds across services.
 * Labels are provided by `factCheckerCopy().scoreLabels`.
 */
export const SCORE_LABEL_BANDS = [
  { maxScore: 1, labelKey: 'critical' },
  { maxScore: 2, labelKey: 'needsWork' },
  { maxScore: 3, labelKey: 'moderate' },
  { maxScore: 4, labelKey: 'good' },
] as const;

export const SCORE_LABEL_EXCELLENT_KEY = 'excellent' as const;

