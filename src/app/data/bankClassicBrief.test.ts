import { describe, it, expect } from 'vitest';
import { getVisibleBankBriefSections } from './bankClassicBrief';
import { mergeLegacyResponsesIntoBankV1 } from '../../../server/src/intake/legacy-to-bank';
import { filterVisibleQuestions } from '../../../server/src/intake/is-visible';
import { QUESTION_BANK_V1_STUBS } from '../../../server/src/intake/question-bank';
import { briefResponsesToIntakeMap } from './intakeBriefMap';
import { sortStubsByBankOrder } from '../hooks/useIntakeWizard';
import type { BriefResponses } from './briefQuestions';

function visibleStubIds(
  responses: BriefResponses,
  collectionMode?: 'discovery',
): string[] {
  const map = mergeLegacyResponsesIntoBankV1({ ...briefResponsesToIntakeMap(responses) });
  return sortStubsByBankOrder(
    filterVisibleQuestions(QUESTION_BANK_V1_STUBS, map, { collectionMode }),
  ).map(s => s.id);
}

describe('getVisibleBankBriefSections', () => {
  it('matches wizard visible ids and order (empty brief)', () => {
    const responses: BriefResponses = {};
    const want = visibleStubIds(responses);
    const got = getVisibleBankBriefSections(responses).flatMap(s => s.questions.map(q => q.id));
    expect(got).toEqual(want);
  });

  it('matches wizard visible set in discovery mode', () => {
    const responses: BriefResponses = {};
    const want = visibleStubIds(responses, 'discovery');
    const got = getVisibleBankBriefSections(responses, 'discovery').flatMap(s =>
      s.questions.map(q => q.id),
    );
    expect(got).toEqual(want);
  });
});
