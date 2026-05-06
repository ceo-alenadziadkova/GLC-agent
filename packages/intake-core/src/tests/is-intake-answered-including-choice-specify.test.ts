import { describe, expect, it } from 'vitest';
import { isIntakeAnsweredIncludingChoiceSpecify } from '../unwrap.js';

describe('isIntakeAnsweredIncludingChoiceSpecify', () => {
  it('returns false for clarify-trigger labels without specify field answered', () => {
    expect(isIntakeAnsweredIncludingChoiceSpecify({ c3: 'Other' }, 'c3')).toBe(false);
    expect(isIntakeAnsweredIncludingChoiceSpecify({ c3: 'Yes, another tool' }, 'c3')).toBe(false);
  });

  it('returns true when primary and specify answers are present', () => {
    expect(
      isIntakeAnsweredIncludingChoiceSpecify({ c3: 'Yes, another tool', c3__other: 'Google Search Console' }, 'c3'),
    ).toBe(true);
    expect(isIntakeAnsweredIncludingChoiceSpecify({ c3: 'Other', c3__other: 'Mixpanel' }, 'c3')).toBe(true);
  });

  it('uses intake_industry_specify for industry Other', () => {
    expect(isIntakeAnsweredIncludingChoiceSpecify({ a2: 'Other' }, 'a2')).toBe(false);
    expect(isIntakeAnsweredIncludingChoiceSpecify({ a2: 'Other', intake_industry_specify: 'FinTech' }, 'a2')).toBe(true);
  });
});
