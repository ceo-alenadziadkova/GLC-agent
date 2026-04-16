import { FACT_CHECKER_THRESHOLDS } from '../../../config/fact-checker-thresholds.js';
import type { ConfidenceLevel, DomainResult } from '../../../types/audit.js';
import type { FactCorrection } from '../types.js';

const T = FACT_CHECKER_THRESHOLDS;

/**
 * Calculates an overall confidence score (0–1) by combining:
 * 1. Structural corrections (overrides lower confidence more than flags)
 * 2. Per-finding confidence levels reported by the agent
 *
 * Rules:
 * - Start at 1.0
 * - Each 'override' correction: -0.2
 * - Each 'flag' correction: -0.1 (max deduction from flags: -0.2)
 * - Finding-level confidence ratio: if >50% of issues are 'low': -0.15; if >50% 'medium': -0.05
 * - Final value clamped to [0, 1]
 */
export function calculateConfidence(result: DomainResult, corrections: FactCorrection[]): number {
  let score = 1.0;

  const overrideCount = corrections.filter(c => c.action === 'override').length;
  const flagCount = corrections.filter(c => c.action === 'flag').length;
  score -= overrideCount * T.confidence.perOverrideDeduction;
  score -= Math.min(flagCount * T.confidence.perFlagDeduction, T.confidence.maxFlagDeduction);

  // Factor in per-finding confidence levels
  if (result.issues.length > 0) {
    const lowCount = result.issues.filter(i => (i.confidence as ConfidenceLevel) === 'low').length;
    const mediumCount = result.issues.filter(i => (i.confidence as ConfidenceLevel) === 'medium').length;
    const ratio = (level: number) => level / result.issues.length;

    if (ratio(lowCount) > T.confidence.lowConfidenceIssueRatio) score -= T.confidence.lowConfidencePenalty;
    else if (ratio(mediumCount) > T.confidence.lowConfidenceIssueRatio)
      score -= T.confidence.mediumConfidencePenalty;
  }

  return Math.max(0, Math.min(1, score));
}

