import {
  INTAKE_IDENTITY_BRIEF_QUESTIONS,
  PRE_BRIEF_QUESTION_IDS,
  type BriefQuestion,
} from '../../../data/briefQuestions';
import { getQuestionLabel } from '../../../lib/intake-question-lookup';

/** Identity + pre-brief fields in stable order for admin queue intake detail. */
export const ORDERED_PRE_BRIEF_QUESTIONS: BriefQuestion[] = [
  ...INTAKE_IDENTITY_BRIEF_QUESTIONS,
  ...PRE_BRIEF_QUESTION_IDS.map(
    id =>
      ({
        id,
        question: getQuestionLabel(id),
        priority: 'required',
        type: 'free_text',
        domains: ['all'],
      }) as BriefQuestion,
  ),
];
