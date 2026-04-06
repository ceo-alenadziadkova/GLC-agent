/**
 * Behaviour: aligned with server/src/intake/choice-specify-triggers.ts (intake “Other” paths).
 */
import { describe, expect, it } from 'vitest';
import {
  choiceSpecifyResponseKey,
  choiceValueNeedsSpecify,
} from './choice-specify-triggers';

describe('choiceValueNeedsSpecify', () => {
  it('returns false for nullish', () => {
    expect(choiceValueNeedsSpecify(null)).toBe(false);
    expect(choiceValueNeedsSpecify(undefined)).toBe(false);
  });

  it('detects trigger labels on string', () => {
    expect(choiceValueNeedsSpecify('Other')).toBe(true);
    expect(choiceValueNeedsSpecify('Something else')).toBe(true);
    expect(choiceValueNeedsSpecify('Yes, other tool')).toBe(true);
    expect(choiceValueNeedsSpecify('Regular option')).toBe(false);
  });

  it('detects trigger labels in array', () => {
    expect(choiceValueNeedsSpecify(['Email', 'Other'])).toBe(true);
    expect(choiceValueNeedsSpecify(['Email', 'CRM'])).toBe(false);
  });
});

describe('choiceSpecifyResponseKey', () => {
  it('maps industry question ids to intake_industry_specify', () => {
    expect(choiceSpecifyResponseKey('a2')).toBe('intake_industry_specify');
    expect(choiceSpecifyResponseKey('intake_industry')).toBe('intake_industry_specify');
  });

  it('suffixes other question ids', () => {
    expect(choiceSpecifyResponseKey('d2')).toBe('d2__other');
  });
});
