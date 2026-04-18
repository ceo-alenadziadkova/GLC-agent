import { describe, expect, it } from 'vitest';
import { mapSupabaseAuthErrorCode } from './settings.error-policy';

describe('settings.error-policy', () => {
  it('maps reauth-related messages', () => {
    expect(mapSupabaseAuthErrorCode('Please reauthenticate')).toBe('reauth_required');
    expect(mapSupabaseAuthErrorCode('Recent login required')).toBe('reauth_required');
    expect(mapSupabaseAuthErrorCode('Invalid session')).toBe('reauth_required');
  });

  it('maps generic errors', () => {
    expect(mapSupabaseAuthErrorCode('Wrong password')).toBe('generic');
    expect(mapSupabaseAuthErrorCode('')).toBe('generic');
    expect(mapSupabaseAuthErrorCode(undefined)).toBe('generic');
    expect(mapSupabaseAuthErrorCode(null)).toBe('generic');
  });
});
