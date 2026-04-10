/**
 * Intake validation helpers from `@glc/intake-core` (`choice-specify-triggers.ts`).
 */
import { describe, expect, it } from 'vitest';
import { choiceSpecifyResponseKey, choiceValueNeedsSpecify } from '@glc/intake-core';

describe('choiceValueNeedsSpecify (server)', () => {
  it('returns false for nullish', () => {
    expect(choiceValueNeedsSpecify(null)).toBe(false);
    expect(choiceValueNeedsSpecify(undefined)).toBe(false);
  });

  it('detects trigger strings', () => {
    expect(choiceValueNeedsSpecify('Other')).toBe(true);
    expect(choiceValueNeedsSpecify('Something else')).toBe(true);
    expect(choiceValueNeedsSpecify('Yes, there are additional details')).toBe(true);
  });

  it('ignores non-strings in array', () => {
    expect(choiceValueNeedsSpecify([42, null, 'Other'] as unknown[])).toBe(true);
    expect(choiceValueNeedsSpecify([42, null] as unknown[])).toBe(false);
  });

  it('returns false for non-string primitives', () => {
    expect(choiceValueNeedsSpecify(1)).toBe(false);
    expect(choiceValueNeedsSpecify({})).toBe(false);
  });
});

describe('choiceSpecifyResponseKey (server)', () => {
  it('maps industry questions to intake_industry_specify', () => {
    expect(choiceSpecifyResponseKey('a2')).toBe('intake_industry_specify');
    expect(choiceSpecifyResponseKey('intake_industry')).toBe('intake_industry_specify');
  });

  it('uses __other suffix for other bank ids', () => {
    expect(choiceSpecifyResponseKey('d2')).toBe('d2__other');
  });
});
