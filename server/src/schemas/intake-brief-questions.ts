/**
 * Classic intake brief — built in `@glc/intake-core` **`intake-brief-catalog-meta`** (JSON + TS).
 * Re-export only; keeps stable server paths for `intake-brief.ts`.
 *
 * - **Bank** — stems/options: `question-bank.v1.json`.
 * - **Catalog meta** — hints, sections, `classicBriefSlice`, triggers: `intake-brief-catalog-meta.v1.json`.
 * - **Policy** — modes, pre-brief, express SLA: `intake-policy.v1.json`.
 */
export type { BriefQuestion } from '../types/audit.js';

export {
  BRIEF_ANSWER_STRING_MAX,
  BRIEF_QUESTION_UI_SECTION,
  BRIEF_QUESTIONS,
  EXPRESS_REQUIRED_QUESTION_IDS,
  getBriefQuestionText,
  getBriefQuestionsByIds,
  getQuestionsForDomain,
  INTAKE_IDENTITY_BRIEF_QUESTIONS,
  INTAKE_IDENTITY_FIELD_IDS,
  OPTIONAL_QUESTION_IDS,
  PRE_BRIEF_PARTICIPATION_IDS,
  PRE_BRIEF_QUESTION_IDS,
  PRE_BRIEF_REQUIRED_SUBMIT_IDS,
  RECOMMENDED_QUESTION_IDS,
  REQUIRED_QUESTION_IDS,
} from '@glc/intake-core';
