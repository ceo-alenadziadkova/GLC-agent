import { describe, it, expect } from 'vitest';
import { mergeLegacyResponsesIntoBankV1 } from '../intake/legacy-to-bank.js';
import {
  hydrateLegacyFromBankForGates,
  mapA6ToHandlesPaymentsLegacy,
  mapC3ToHasGoogleAnalyticsLegacy,
  prepareBriefForValidation,
} from '../intake/hydrate-legacy-from-bank.js';
import { EXPRESS_REQUIRED_QUESTION_IDS } from '../schemas/intake-brief.js';
import { isIntakeAnswered } from '../intake/unwrap.js';

describe('hydrateLegacyFromBankForGates', () => {
  it('maps f1 into primary_goal and biggest_pain when legacy empty', () => {
    const r = hydrateLegacyFromBankForGates({ f1: { value: 'Scaling ads', source: 'consultant' } });
    expect((r.primary_goal as { value: string }).value).toBe('Scaling ads');
    expect((r.biggest_pain as { value: string }).value).toBe('Scaling ads');
  });

  it('does not overwrite existing legacy answers', () => {
    const r = hydrateLegacyFromBankForGates({
      f1: { value: 'From bank', source: 'consultant' },
      primary_goal: { value: 'Existing', source: 'consultant' },
    });
    expect((r.primary_goal as { value: string }).value).toBe('Existing');
  });

  it('maps a6 and c3 into legacy gates', () => {
    const r = hydrateLegacyFromBankForGates({
      a6: 'Yes',
      c3: 'Yes, GA4',
    });
    expect(mapA6ToHandlesPaymentsLegacy('Yes')).toBe('Yes — we process card data');
    expect(mapC3ToHasGoogleAnalyticsLegacy('Yes, GA4')).toBe('Yes, GA4');
    expect((r.handles_payments as { value: string }).value).toBe('Yes — we process card data');
    expect((r.has_google_analytics as { value: string }).value).toBe('Yes, GA4');
  });

  it('prepareBriefForValidation yields express gates when bank + revenue_model cover express required', () => {
    const raw = {
      f1: 'North star: more demos',
      b1: 'B2B ops leaders',
      c5: 'Book a call',
      c6: 'Slow pages',
      a6: 'Yes',
      c3: 'Yes, GA4',
      revenue_model: 'Consulting / services',
    };
    const prepared = prepareBriefForValidation(mergeLegacyResponsesIntoBankV1({ ...raw }));
    const missingExpress = EXPRESS_REQUIRED_QUESTION_IDS.filter(id => !isIntakeAnswered(prepared[id]));
    expect(missingExpress).toEqual([]);
  });
});
