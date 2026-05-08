import {
  buildIntakePlan,
  currentIntakeVersionTuple,
  isIntakeMinimumContextBankId,
} from '@glc/intake-core';

import { getBriefQuestionsByIds } from '../../schemas/intake-brief.js';
import { DEFAULT_AUDIT_PRODUCT_MODE } from '../../types/audit.js';

/**
 * Full-plan `nextRecommended` minus pre-brief baseline ids — suggested follow-ups after the link-capture minimum.
 * See ADR-INTAKE-PERSONALIZATION-PRODUCT-SCOPE §3.
 */
export function buildTailoredQuestionsForResponses(raw: Record<string, unknown>): {
  questionIds: string[];
  questions: ReturnType<typeof getBriefQuestionsByIds>;
  caseKeys: string[];
  nextRecommended: string[];
} {
  const tuple = currentIntakeVersionTuple();
  const plan = buildIntakePlan({
    responses: raw,
    productMode: DEFAULT_AUDIT_PRODUCT_MODE,
    collectionMode: 'interview',
    surface: 'client_form',
    intakeVersionTuple: tuple,
  });
  const tailIds = plan.nextRecommended.filter(id => !isIntakeMinimumContextBankId(id));
  return {
    questionIds: tailIds,
    questions: getBriefQuestionsByIds(tailIds),
    caseKeys: plan.casePatternMatch?.caseKeys ?? [],
    nextRecommended: plan.nextRecommended,
  };
}
