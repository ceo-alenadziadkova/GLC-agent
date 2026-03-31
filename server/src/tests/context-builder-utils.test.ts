import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase.js', () => ({
  supabase: {},
}));

import { extractPrimaryCompetitor } from '../services/context-builder.js';

describe('extractPrimaryCompetitor', () => {
  it('returns first competitor from array input', () => {
    expect(extractPrimaryCompetitor(['Hotel ABC', 'Hotel DEF'])).toBe('Hotel ABC');
  });

  it('returns first competitor from CSV input', () => {
    expect(extractPrimaryCompetitor('Hotel ABC, Hotel DEF, Hotel XYZ')).toBe('Hotel ABC');
  });

  it('returns null for empty/whitespace-only values', () => {
    expect(extractPrimaryCompetitor('   , ; \n ')).toBeNull();
    expect(extractPrimaryCompetitor(['', '   ', '\n'])).toBeNull();
  });
});
