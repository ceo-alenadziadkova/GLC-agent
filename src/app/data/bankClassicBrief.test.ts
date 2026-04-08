import { describe, it, expect } from 'vitest';
import { getVisibleBankBriefSections } from './bankClassicBrief';
import { buildIntakePlan } from '../../../server/src/intake/core/build-intake-plan';
import { QUESTION_BANK_V1_STUBS } from '../../../server/src/intake/question-bank';
import { briefResponsesToIntakeMap } from './intakeBriefMap';
import { sortStubsByBankOrder } from '../hooks/useIntakeWizard';
import type { BriefResponses } from './briefQuestions';
import type { IntakeBriefCollectionMode } from './auditTypes';
import { makeWebsitePathFullBrief } from '../../../server/src/tests/bank-brief-fixtures';

function wrapAsBriefResponses(raw: Record<string, unknown>): BriefResponses {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, { value: v as never, source: 'client' as const }]),
  ) as BriefResponses;
}

function visibleStubIds(
  responses: BriefResponses,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  const map = { ...briefResponsesToIntakeMap(responses) };
  const plan = buildIntakePlan({
    responses: map,
    productMode: 'full',
    collectionMode,
  });
  const visible = new Set(plan.visible);
  return sortStubsByBankOrder(QUESTION_BANK_V1_STUBS.filter(q => visible.has(q.id))).map(s => s.id);
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

  it('client_form surface omits c1 from flat ids when website branch makes it eligible', () => {
    const responses = wrapAsBriefResponses(makeWebsitePathFullBrief());
    const consultantIds = getVisibleBankBriefSections(
      responses,
      'self_serve',
      'consultant_interview',
    ).flatMap(s => s.questions.map(q => q.id));
    const clientIds = getVisibleBankBriefSections(responses, 'self_serve', 'client_form').flatMap(s =>
      s.questions.map(q => q.id),
    );
    expect(consultantIds).toContain('c1');
    expect(clientIds).not.toContain('c1');
  });
});
