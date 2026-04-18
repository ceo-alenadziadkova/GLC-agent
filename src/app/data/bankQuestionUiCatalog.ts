/**
 * Maps question-bank v1 ids to BriefField-ready definitions (labels from question-bank.v1.json).
 * Option sets and hints: single source in `@glc/intake-core` (`bank-question-ui-overrides.ts`).
 */
import type { BriefQuestion, BriefPriority, BriefQuestionType } from './briefQuestions';
import bankRaw from '@glc/intake-core/question-bank.v1.json';
import {
  getBankQuestionUiOptions,
  getBankQuestionUiOverride,
} from '@glc/intake-core';

type RawQ = { id: string; section: string; label: string };

const RAW_QUESTIONS = (bankRaw as { questions: RawQ[] }).questions;
const LABEL_BY_ID = new Map(RAW_QUESTIONS.map(q => [q.id, q.label] as const));
const SECTION_BY_ID = new Map(RAW_QUESTIONS.map(q => [q.id, q.section] as const));

const SECTION_TITLE: Record<string, string> = {
  A: 'Business basics',
  B: 'Customers and growth',
  C: 'Website and digital',
  D: 'Tools and processes',
  E: 'Security and compliance',
  F: 'Goals for this audit',
};

export { getBankQuestionUiOptions };

/** BriefField-ready question for a bank id (visibility handled separately). */
export function bankIdToBriefQuestion(id: string, priority: BriefPriority): BriefQuestion {
  const letter = SECTION_BY_ID.get(id) ?? 'A';
  const ov = getBankQuestionUiOverride(id) ?? {};
  const t: BriefQuestionType = ov.type ?? 'free_text';
  return {
    id,
    priority,
    section: SECTION_TITLE[letter] ?? `Section ${letter}`,
    question: LABEL_BY_ID.get(id) ?? id,
    hint: ov.hint,
    type: t,
    options: ov.options ? [...ov.options] : undefined,
  };
}
