import { FACT_CHECKER_THRESHOLDS } from '../../../config/fact-checker-thresholds.js';
import { factCheckerCopy } from '../../../config/fact-checker-copy.js';
import { SCORE_LABEL_BANDS, SCORE_LABEL_EXCELLENT_KEY } from '../../../config/fact-checker/score-label-bands.js';
import type { DomainResult } from '../../../types/audit.js';
import type { FactCorrection } from '../types.js';

const T = FACT_CHECKER_THRESHOLDS;

function scoreLabel(score: number): string {
  const L = factCheckerCopy().scoreLabels;
  const band = SCORE_LABEL_BANDS.find(b => score <= b.maxScore);
  if (!band) return L[SCORE_LABEL_EXCELLENT_KEY as keyof typeof L];
  return L[band.labelKey as keyof typeof L];
}

export function applyCorrections(result: DomainResult, corrections: FactCorrection[]): DomainResult {
  if (corrections.length === 0) return result;

  let { score } = result;

  // 1. Apply hard overrides first (action: 'override' with explicit corrected_value)
  for (const c of corrections) {
    if (c.action === 'override' && c.field === 'score' && c.corrected_value !== undefined) {
      score = c.corrected_value as number;
    }
  }

  // 2. For each "score too high" flag, cap by 1 point per flag (max reduction: 2)
  //    This prevents over-correction while still forcing inflated scores down.
  const scoreFlags = corrections.filter(c => c.action === 'flag' && c.field === 'score');
  if (scoreFlags.length > 0) {
    const reduction = Math.min(scoreFlags.length, T.applyScore.maxReductionSteps);
    score = Math.max(T.applyScore.minScoreAfterReduction, score - reduction);
  }

  if (score === result.score) return result; // No change needed

  return {
    ...result,
    score,
    // Recalculate label to stay consistent with the new score
    label: scoreLabel(score),
  };
}

