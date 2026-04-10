/**
 * Data quality score — docs/QUESTION_BANK.md §10.
 * For branch-aware scoring over the full bank use `calcDataQualityScore` from `data-quality-via-plan.ts`
 * (avoids importing `buildIntakePlan` here — `plan-derived.ts` imports `calcDataQualityScoreFromVisible` only).
 */
import type {
  DataQualityResult,
  DataQualityWeights,
  IntakeQuestionStub,
  IntakeResponsesMap,
} from './types.js';

export type { DataQualityWeights };
import { isIntakeAnswered } from './unwrap.js';

export const DEFAULT_DATA_QUALITY_WEIGHTS: DataQualityWeights = {
  required: 0.55,
  recommended: 0.35,
  optional: 0.1,
};

const DEFAULT_WEIGHTS = DEFAULT_DATA_QUALITY_WEIGHTS;

/**
 * Score from an already-resolved visible stub list (e.g. same list as wizard steps from `buildIntakePlan`).
 */
export function calcDataQualityScoreFromVisible(
  visible: IntakeQuestionStub[],
  responses: IntakeResponsesMap,
  weights: DataQualityWeights = DEFAULT_WEIGHTS,
): DataQualityResult {
  const req = visible.filter(q => q.priority === 'required');
  const rec = visible.filter(q => q.priority === 'recommended');
  const opt = visible.filter(q => q.priority === 'optional');

  const answeredFor = (list: IntakeQuestionStub[]) =>
    list.filter(q => isIntakeAnswered(responses[q.id])).length;

  const ar = answeredFor(req);
  const arec = answeredFor(rec);
  const ao = answeredFor(opt);

  const nr = req.length;
  const nrec = rec.length;
  const no = opt.length;

  const requiredWeight = nr === 0 ? 1 : ar / nr;
  const recommendedWeight = nrec === 0 ? 1 : arec / nrec;
  const optionalWeight = no === 0 ? 1 : ao / no;

  const score = Math.min(
    1,
    Math.max(
      0,
      weights.required * requiredWeight +
        weights.recommended * recommendedWeight +
        weights.optional * optionalWeight,
    ),
  );

  return {
    score,
    requiredWeight,
    recommendedWeight,
    optionalWeight,
    visibleRequired: nr,
    visibleRecommended: nrec,
    visibleOptional: no,
    answeredRequired: ar,
    answeredRecommended: arec,
    answeredOptional: ao,
  };
}
