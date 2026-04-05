/**
 * Classic "All sections" brief UI: same visible question set and order as IntakeBankWizard
 * (mergeLegacyResponsesIntoBankV1 + filterVisibleQuestions + bank JSON order).
 */
import { filterVisibleQuestions } from '../../../server/src/intake/is-visible';
import { mergeLegacyResponsesIntoBankV1 } from '../../../server/src/intake/legacy-to-bank';
import { QUESTION_BANK_V1_STUBS } from '../../../server/src/intake/question-bank';
import type { CollectionMode, IntakeQuestionStub } from '../../../server/src/intake/types';
import { bankIdToBriefQuestion } from './bankQuestionUiCatalog';
import type { BriefQuestion, BriefResponses } from './briefQuestions';
import { briefResponsesToIntakeMap } from './intakeBriefMap';

function sortStubsByBankOrder(stubs: IntakeQuestionStub[]): IntakeQuestionStub[] {
  const order = new Map(QUESTION_BANK_V1_STUBS.map((q, i) => [q.id, i] as const));
  return [...stubs].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
}

export interface BankClassicSection {
  sectionTitle: string;
  questions: BriefQuestion[];
}

/**
 * Visible bank questions for the current answers, in canonical bank order, grouped by UI section title.
 */
export function getVisibleBankBriefSections(
  responses: BriefResponses,
  collectionMode?: CollectionMode,
): BankClassicSection[] {
  const map = mergeLegacyResponsesIntoBankV1({ ...briefResponsesToIntakeMap(responses) });
  const visible = sortStubsByBankOrder(
    filterVisibleQuestions(QUESTION_BANK_V1_STUBS, map, { collectionMode }),
  );
  const flat = visible.map(stub => bankIdToBriefQuestion(stub.id, stub.priority));

  const groups: BankClassicSection[] = [];
  for (const q of flat) {
    const last = groups[groups.length - 1];
    if (last && last.sectionTitle === q.section) {
      last.questions.push(q);
    } else {
      groups.push({ sectionTitle: q.section ?? 'Other', questions: [q] });
    }
  }
  return groups;
}
