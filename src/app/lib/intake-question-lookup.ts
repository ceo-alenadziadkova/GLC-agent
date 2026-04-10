import bankRaw from '@glc/intake-core/question-bank.v1.json';
import { getBriefQuestionText } from '../data/briefQuestions';

type RawQ = { id: string; label: string };

const RAW_QUESTIONS = (bankRaw as { questions: RawQ[] }).questions;
const BANK_LABEL_BY_ID = new Map(RAW_QUESTIONS.map(q => [q.id, q.label] as const));

/**
 * Unified intake question label lookup.
 * - prefers canonical bank labels for bank ids
 * - falls back to legacy brief catalog (`intake_*`, compatibility aliases)
 */
export function getQuestionLabel(id: string): string {
  if (id === 'revenue_model') {
    return BANK_LABEL_BY_ID.get('a10') ?? getBriefQuestionText('revenue_model');
  }
  return BANK_LABEL_BY_ID.get(id) ?? getBriefQuestionText(id);
}

