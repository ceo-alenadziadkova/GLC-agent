import { choiceValueNeedsSpecify } from '@glc/intake-core';
import type { BriefResponses, BriefResponseValue } from '../../../data/briefQuestions';
import {
  A11_VALUE_WHEN_NO_PUBLIC_SITE,
  unwrapResponse,
  WEBSITE_PRESENCE_NO_SITE_LABEL,
} from '../../../data/briefQuestions';

export function patchBriefQuestionResponse(
  prev: BriefResponses,
  id: string,
  value: string | string[] | number | null,
): BriefResponses {
  const next: BriefResponses = { ...prev, [id]: { value, source: 'client' } };
  if (!choiceValueNeedsSpecify(value)) {
    delete next[`${id}__other`];
  }
  return next;
}

export function patchIndustryResponse(
  prev: BriefResponses,
  value: string | string[] | number | null,
): BriefResponses {
  const next: BriefResponses = {
    ...prev,
    a2: { value: value as BriefResponseValue, source: 'client' },
  };
  if (value !== 'Other') {
    delete next.intake_industry_specify;
  }
  return next;
}

export function patchWebsitePresenceResponse(
  prev: BriefResponses,
  value: string | string[] | number | null,
): BriefResponses {
  const next: BriefResponses = {
    ...prev,
    a5: { value: value as BriefResponseValue, source: 'client' },
  };
  if (value === WEBSITE_PRESENCE_NO_SITE_LABEL) {
    next.a11 = { value: A11_VALUE_WHEN_NO_PUBLIC_SITE, source: 'client' };
  } else {
    const prevA11 = unwrapResponse(prev.a11);
    const s = typeof prevA11 === 'string' ? prevA11.trim().toLowerCase() : '';
    if (s === 'none' || s === 'no website' || s === 'n/a' || s === 'na') {
      const { a11: _, ...rest } = next;
      return rest as BriefResponses;
    }
  }
  return next;
}

export function patchUnknownResponse(prev: BriefResponses, id: string): BriefResponses {
  const next: BriefResponses = { ...prev, [id]: { value: null, source: 'unknown' } };
  delete next[`${id}__other`];
  if (id === 'a2') {
    delete next.intake_industry_specify;
  }
  if (id === 'a5') {
    delete next.a11;
  }
  return next;
}
