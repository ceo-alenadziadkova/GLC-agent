import { buildIntakePlan } from '@glc/intake-core';

import {
  getBriefQuestionsByIds,
  INTAKE_IDENTITY_BRIEF_QUESTIONS,
} from '../../schemas/intake-brief.js';
import { DEFAULT_AUDIT_PRODUCT_MODE } from '../../types/audit.js';
import {
  INTAKE_PREBRIEF_PUBLIC_PLAN_COLLECTION_MODE,
  INTAKE_PREBRIEF_PUBLIC_PLAN_SURFACE,
} from '../../config/intake-prebrief-route-policy.js';

/** Question rows for public/prefill GET: policy identity block, then catalog rows for `plan.visible` (pre_brief slice). */
export function buildPreBriefQuestionsForResponses(raw: Record<string, unknown>) {
  const preBriefPlan = buildIntakePlan({
    responses: raw,
    productMode: DEFAULT_AUDIT_PRODUCT_MODE,
    collectionMode: INTAKE_PREBRIEF_PUBLIC_PLAN_COLLECTION_MODE,
    surface: INTAKE_PREBRIEF_PUBLIC_PLAN_SURFACE,
  });
  const coreQuestions = getBriefQuestionsByIds(preBriefPlan.visible);
  return [...INTAKE_IDENTITY_BRIEF_QUESTIONS, ...coreQuestions];
}
