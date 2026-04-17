/**
 * Classic "All sections" brief UI: same visible question set and order as IntakeBankWizard
 * (`buildIntakePlan` + bank JSON order).
 */
import type { IntakeBriefCollectionMode } from './audit/contracts/intake/intake-brief.types';
import { buildIntakePlan } from '@glc/intake-core';
import type { IntakeSurface } from '@glc/intake-core';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import type { IntakeQuestionStub } from '@glc/intake-core';
import { bankIdToBriefQuestion } from './bankQuestionUiCatalog';
import type { BriefQuestion, BriefResponses } from './briefQuestions';
import { briefResponsesToIntakeMap } from './intakeBriefMap';

const HIDDEN_IDENTITY_BANK_IDS = new Set(['a2', 'a11', 'a12']);

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
  briefCollectionMode?: IntakeBriefCollectionMode,
  intakeSurface?: IntakeSurface,
): BankClassicSection[] {
  const map = { ...briefResponsesToIntakeMap(responses) };
  const plan = buildIntakePlan({
    responses: map,
    productMode: 'full',
    collectionMode: briefCollectionMode,
    surface: intakeSurface,
  });
  const visible = new Set(plan.visible);
  const visibleStubs = sortStubsByBankOrder(
    QUESTION_BANK_V1_STUBS.filter(q => visible.has(q.id) && !HIDDEN_IDENTITY_BANK_IDS.has(q.id)),
  );
  const flat = visibleStubs.map(stub => bankIdToBriefQuestion(stub.id, stub.priority));

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
