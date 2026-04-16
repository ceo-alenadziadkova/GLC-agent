import { describe, expect, it } from 'vitest';
import { legacyUxLabelForScore } from './snapshot-ux-legacy-labels.js';

describe('legacyUxLabelForScore', () => {
  it('maps legacy UX scores to labels (1..5)', () => {
    expect(legacyUxLabelForScore(5)).toBe('Good');
    expect(legacyUxLabelForScore(4)).toBe('Good');
    expect(legacyUxLabelForScore(3)).toBe('Moderate');
    expect(legacyUxLabelForScore(2)).toBe('Needs Work');
    expect(legacyUxLabelForScore(1)).toBe('Critical');
  });

  it('falls back to Critical for unexpected scores', () => {
    expect(legacyUxLabelForScore(0)).toBe('Critical');
    expect(legacyUxLabelForScore(-1)).toBe('Critical');
  });
});

