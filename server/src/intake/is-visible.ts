/**
 * Question visibility from branch conditions — docs/QUESTION_BANK §2.3, §6.
 */
import { evalBranchCondition } from './branch-rules.js';
import { isDiscoverySurfaceQuestion } from './discovery.js';
import type { CollectionMode, IntakeQuestionStub, IntakeResponsesMap } from './types.js';

export interface IntakeVisibilityContext {
  collectionMode?: CollectionMode;
  /** Reserved for future stricter discovery subsets. */
  discoveryStrict?: boolean;
}

export function isQuestionVisible(
  question: IntakeQuestionStub,
  responses: IntakeResponsesMap,
  ctx?: IntakeVisibilityContext,
): boolean {
  if (!evalBranchCondition(question.branchCondition, responses)) return false;
  if (ctx?.collectionMode === 'discovery' && !isDiscoverySurfaceQuestion(question.id)) {
    return false;
  }
  return true;
}

export function filterVisibleQuestions(
  questions: IntakeQuestionStub[],
  responses: IntakeResponsesMap,
  ctx?: IntakeVisibilityContext,
): IntakeQuestionStub[] {
  return questions.filter(q => isQuestionVisible(q, responses, ctx));
}
