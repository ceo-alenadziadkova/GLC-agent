import { describe, expect, it } from 'vitest';
import { isLikelyTransientSupabaseError } from '../lib/supabase-rest-transient.js';

describe('isLikelyTransientSupabaseError', () => {
  it('returns false for null', () => {
    expect(isLikelyTransientSupabaseError(null)).toBe(false);
  });

  it('treats common timeout / gateway codes as transient', () => {
    expect(isLikelyTransientSupabaseError({ code: '57014', message: 'canceling statement due to statement timeout' })).toBe(
      true,
    );
    expect(isLikelyTransientSupabaseError({ code: 'PGRST503', message: 'Service Unavailable' })).toBe(true);
    expect(isLikelyTransientSupabaseError({ code: 'PGRST504', message: 'Gateway Timeout' })).toBe(true);
  });

  it('uses message heuristics when code is unknown', () => {
    expect(isLikelyTransientSupabaseError({ message: 'fetch failed' })).toBe(true);
    expect(isLikelyTransientSupabaseError({ message: 'ECONNRESET' })).toBe(true);
  });

  it('returns false for typical not-found', () => {
    expect(isLikelyTransientSupabaseError({ code: 'PGRST116', message: 'No rows' })).toBe(false);
  });
});
