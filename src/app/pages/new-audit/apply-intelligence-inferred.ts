import type { BriefResponseSource } from '../../data/auditTypes';
import type { BriefResponses } from '../../data/briefQuestions';

/**
 * Applies user-selected inferred cells from the confirm step (Lighthouse / LLM snapshot).
 * `low` and `medium` rows apply when the id is in `selectedQuestionIds`.
 * If the user selected a row, the suggested value is written even when a prior non-unknown
 * source exists — the confirm screen is the explicit approval for that cell.
 */
export function applyIntelligenceInferredSelections(
  responses: BriefResponses,
  inferred: ReadonlyArray<{
    questionId: string;
    confidence: 'low' | 'medium';
    suggestedValue: string | boolean;
  }>,
  selectedQuestionIds: ReadonlySet<string>,
  source: BriefResponseSource,
): BriefResponses {
  const next: BriefResponses = { ...responses };
  for (const row of inferred) {
    if (row.confidence !== 'medium' && row.confidence !== 'low') continue;
    if (!selectedQuestionIds.has(row.questionId)) continue;
    next[row.questionId] = { value: row.suggestedValue, source };
  }
  return next;
}
