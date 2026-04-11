import { describe, expect, it } from 'vitest';
import {
  choiceSpecifyResponseKey,
  INTAKE_IDENTITY_FIELD_IDS,
  INTAKE_REVENUE_BANK_ID,
  PRE_BRIEF_BANK_INCLUDED_IDS,
} from '@glc/intake-core';

/**
 * Mirrors `mergePreBriefFromParsedResponses` whitelist construction in `server/src/routes/intake.ts`
 * (visible + identity + revenue + choice-specify companion keys).
 */
function mergeKeySetLikeIntakeRoute(visible: readonly string[]): Set<string> {
  const mergeIds = new Set<string>([
    ...visible,
    ...INTAKE_IDENTITY_FIELD_IDS,
    INTAKE_REVENUE_BANK_ID,
    choiceSpecifyResponseKey(INTAKE_REVENUE_BANK_ID),
  ]);
  const specifyScopeIds = [...visible, ...INTAKE_IDENTITY_FIELD_IDS];
  for (const id of specifyScopeIds) {
    mergeIds.add(choiceSpecifyResponseKey(id));
  }
  return mergeIds;
}

describe('pre-brief merge whitelist (choice specify keys)', () => {
  it('includes f1__other and intake_industry_specify for policy bankIncluded + identity (c3 not in pre_brief slice)', () => {
    const keys = mergeKeySetLikeIntakeRoute(PRE_BRIEF_BANK_INCLUDED_IDS);
    expect(keys.has('f1__other')).toBe(true);
    expect(keys.has('c3__other')).toBe(false);
    expect(keys.has('intake_industry_specify')).toBe(true);
    expect(keys.has(choiceSpecifyResponseKey(INTAKE_REVENUE_BANK_ID))).toBe(true);
  });
});
