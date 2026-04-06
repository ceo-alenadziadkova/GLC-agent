/**
 * Behaviour: mirror of src/app/lib/choice-specify-triggers.ts — intake validation.
 */
import { describe, expect, it } from 'vitest';
import { choiceValueNeedsSpecify } from '../intake/choice-specify-triggers.js';

describe('choiceValueNeedsSpecify (server)', () => {
  it('returns false for nullish', () => {
    expect(choiceValueNeedsSpecify(null)).toBe(false);
    expect(choiceValueNeedsSpecify(undefined)).toBe(false);
  });

  it('detects trigger strings', () => {
    expect(choiceValueNeedsSpecify('Other')).toBe(true);
    expect(choiceValueNeedsSpecify('Something else')).toBe(true);
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
