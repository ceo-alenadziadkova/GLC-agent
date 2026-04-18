/**
 * Question visibility — delegates to `buildIntakePlan` (docs/QUESTION_BANK §2.3, §6).
 */
import { filterVisibleQuestionsFromPlan } from './visibility-from-plan.js';
import type { IntakeQuestionStub, IntakeResponsesMap, IntakeVisibilityContext } from './types.js';

export type { IntakeVisibilityContext };

export function filterVisibleQuestions(
  questions: IntakeQuestionStub[],
  responses: IntakeResponsesMap,
  ctx?: IntakeVisibilityContext,
): IntakeQuestionStub[] {
  return filterVisibleQuestionsFromPlan(questions, responses, ctx);
}

export function isQuestionVisible(
  question: IntakeQuestionStub,
  responses: IntakeResponsesMap,
  ctx?: IntakeVisibilityContext,
): boolean {
  return filterVisibleQuestionsFromPlan([question], responses, ctx).length > 0;
}
