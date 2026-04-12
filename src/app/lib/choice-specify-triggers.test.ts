/**
 * Behavioural contract for `choice-specify-triggers` (implemented in `@glc/intake-core` only).
 */
import { describe, expect, it } from 'vitest';
import {
  choiceSpecifyResponseKey,
  choiceValueNeedsSpecify,
} from '@glc/intake-core';

describe('choiceValueNeedsSpecify', () => {
  it('returns false for nullish', () => {
    expect(choiceValueNeedsSpecify(null)).toBe(false);
    expect(choiceValueNeedsSpecify(undefined)).toBe(false);
  });

  it('detects trigger labels on string', () => {
    expect(choiceValueNeedsSpecify('Other')).toBe(true);
    expect(choiceValueNeedsSpecify('Something else')).toBe(true);
    expect(choiceValueNeedsSpecify('Yes, other tool')).toBe(true);
    expect(choiceValueNeedsSpecify('Yes, there are additional details')).toBe(true);
    expect(choiceValueNeedsSpecify('Regular option')).toBe(false);
  });

  it('detects trigger labels in array', () => {
    expect(choiceValueNeedsSpecify(['Email', 'Other'])).toBe(true);
    expect(choiceValueNeedsSpecify(['Email', 'CRM'])).toBe(false);
  });
});

describe('choiceSpecifyResponseKey', () => {
  it('maps a2 industry to intake_industry_specify', () => {
    expect(choiceSpecifyResponseKey('a2')).toBe('intake_industry_specify');
  });

  it('suffixes other question ids', () => {
    expect(choiceSpecifyResponseKey('d2')).toBe('d2__other');
  });
});
