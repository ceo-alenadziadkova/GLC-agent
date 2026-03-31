import { describe, it, expect } from 'vitest';
import { maxPhaseForMode, reviewPhasesForMode } from '../types/audit.js';

describe('product mode guards', () => {
  it('free_snapshot caps phases and skips review gates', () => {
    expect(maxPhaseForMode('free_snapshot')).toBe(4);
    expect(reviewPhasesForMode('free_snapshot')).toEqual([]);
  });

  it('express caps at phase 4 with gates after 0 and 4', () => {
    expect(maxPhaseForMode('express')).toBe(4);
    expect(reviewPhasesForMode('express')).toEqual([0, 4]);
  });

  it('full runs through strategy', () => {
    expect(maxPhaseForMode('full')).toBe(7);
    expect(reviewPhasesForMode('full')).toEqual([0, 4, 7]);
  });
});
