import { describe, expect, it } from 'vitest';
import {
  patchBriefQuestionResponse,
  patchIndustryResponse,
  patchUnknownResponse,
  patchWebsitePresenceResponse,
} from './intake-brief-response-updates';
import { WEBSITE_PRESENCE_NO_SITE_LABEL } from '../../../data/briefQuestions';

describe('intake-brief-response-updates', () => {
  it('patchBriefQuestionResponse clears __other when specify not needed', () => {
    const prev = {
      q1: { value: 'x', source: 'client' as const },
      q1__other: { value: 'detail', source: 'client' as const },
    };
    const next = patchBriefQuestionResponse(prev, 'q1', 'plain');
    expect(next.q1).toEqual({ value: 'plain', source: 'client' });
    expect(next.q1__other).toBeUndefined();
  });

  it('patchIndustryResponse drops intake_industry_specify when not Other', () => {
    const prev = {
      a2: { value: 'Other', source: 'client' as const },
      intake_industry_specify: { value: 'foo', source: 'client' as const },
    };
    const next = patchIndustryResponse(prev, 'Retail');
    expect(next.a2).toEqual({ value: 'Retail', source: 'client' });
    expect(next.intake_industry_specify).toBeUndefined();
  });

  it('patchWebsitePresenceResponse sets canonical a11 for no public site label', () => {
    const prev = {};
    const next = patchWebsitePresenceResponse(prev, WEBSITE_PRESENCE_NO_SITE_LABEL);
    expect(next.a5).toEqual({ value: WEBSITE_PRESENCE_NO_SITE_LABEL, source: 'client' });
    expect(next.a11).toEqual({ value: 'none', source: 'client' });
  });

  it('patchUnknownResponse clears cascaded keys for a2 and a5', () => {
    const prev = {
      a2: { value: 'Other', source: 'client' as const },
      intake_industry_specify: { value: 'x', source: 'client' as const },
      a2__other: { value: 'y', source: 'client' as const },
      a5: { value: 'Has site', source: 'client' as const },
      a11: { value: 'https://a.com', source: 'client' as const },
    };
    expect(patchUnknownResponse(prev, 'a2').intake_industry_specify).toBeUndefined();
    const afterA5 = patchUnknownResponse(prev, 'a5');
    expect(afterA5.a11).toBeUndefined();
  });
});
