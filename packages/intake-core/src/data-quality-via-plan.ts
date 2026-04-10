/**
 * Branch-aware data quality via `buildIntakePlan` (see `visibility-from-plan.ts`).
 */
import {
  calcDataQualityScoreFromVisible,
  DEFAULT_DATA_QUALITY_WEIGHTS,
  type DataQualityWeights,
} from './data-quality.js';
import type { IntakeQuestionStub, IntakeResponsesMap, IntakeVisibilityContext } from './types.js';
import { filterVisibleQuestionsFromPlan } from './visibility-from-plan.js';

export function calcDataQualityScore(
  questions: IntakeQuestionStub[],
  responses: IntakeResponsesMap,
  weights: DataQualityWeights = DEFAULT_DATA_QUALITY_WEIGHTS,
  visibility?: IntakeVisibilityContext,
) {
  return calcDataQualityScoreFromVisible(
    filterVisibleQuestionsFromPlan(questions, responses, visibility),
    responses,
    weights,
  );
}
