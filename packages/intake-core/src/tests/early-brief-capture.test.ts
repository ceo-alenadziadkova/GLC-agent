import { describe, expect, it } from 'vitest';
import {
  areEarlyBriefCaptureSlotsSatisfied,
  arePreBriefSubmitSlotsSatisfied,
  getEarlyBriefCaptureSubmitSlotIds,
  getPreBriefSubmitSlotIds,
  INTAKE_IDENTITY_FIELD_IDS,
} from '../index.js';
import { PRE_BRIEF_BANK_INCLUDED_IDS } from '../core/load-policy.js';
import { DISCOVERY_BRIEF_PATCH_A5_MULTI_PAGE_SITE } from '../discovery-brief-mapping.js';

describe('early brief capture (consultant lighthouse + sparse LLM gate)', () => {
  const baseIdentity = {
    a5: { value: DISCOVERY_BRIEF_PATCH_A5_MULTI_PAGE_SITE, source: 'consultant' },
    a11: { value: 'https://example.com/', source: 'consultant' },
    a12: { value: 'ACME Clinic', source: 'consultant' },
    a2: { value: 'Healthcare', source: 'consultant' },
  };

  it('early slots are strictly identity (+ industry specify when Other)', () => {
    const r = { ...baseIdentity, a2: { value: 'Other', source: 'consultant' }, intake_industry_specify: 'Medspa' };
    expect(getEarlyBriefCaptureSubmitSlotIds(r)).toEqual([
      ...INTAKE_IDENTITY_FIELD_IDS,
      'intake_industry_specify',
    ]);
  });

  it('areEarlyBriefCaptureSlotsSatisfied passes when identity is complete', () => {
    expect(areEarlyBriefCaptureSlotsSatisfied(baseIdentity)).toBe(true);
  });

  it('arePreBriefSubmitSlotsSatisfied stays stricter than early capture', () => {
    expect(areEarlyBriefCaptureSlotsSatisfied(baseIdentity)).toBe(true);
    expect(arePreBriefSubmitSlotsSatisfied(baseIdentity)).toBe(false);
    const pb = getPreBriefSubmitSlotIds(baseIdentity);
    expect(pb.length).toBeGreaterThan(getEarlyBriefCaptureSubmitSlotIds(baseIdentity).length);
    expect(pb).toEqual(expect.arrayContaining(PRE_BRIEF_BANK_INCLUDED_IDS));
  });
});
