/**
 * Bank-derived metrics that depend on `buildIntakePlan` — kept out of `question-bank.ts`
 * to avoid a circular import with `branch-condition-deps` (loads before stubs init).
 */
import { calcDataQualityScore } from './data-quality-via-plan.js';
import {
  QUESTION_BANK_V1_STUBS,
  responsesUseQuestionBankV1,
  roundDataQualityScore,
} from './question-bank.js';

/**
 * Server-side data_quality_score for `intake_brief` when responses use bank ids; else null (caller skips DB field).
 * Uses `buildIntakePlan` with consultant full-bank surface (`consultant_interview`) — same defaults as
 * `DATA_QUALITY_DEFAULT_PLAN_INPUT` in `visibility-from-plan.ts`.
 */
export function deriveBankV1DataQuality(responses: Record<string, unknown>): number | null {
  if (!responsesUseQuestionBankV1(responses)) return null;
  return roundDataQualityScore(calcDataQualityScore(QUESTION_BANK_V1_STUBS, responses).score);
}
