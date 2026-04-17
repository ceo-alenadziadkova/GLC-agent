import { describe, expect, it } from 'vitest';
import {
  normalizeEmailInput,
  normalizeFullName,
  validateEmailChangeInput,
  validatePasswordChangeInput,
} from './settings.validation';

describe('settings.validation', () => {
  describe('normalizeFullName', () => {
    it('returns null for empty or whitespace', () => {
      expect(normalizeFullName('')).toBeNull();
      expect(normalizeFullName('   ')).toBeNull();
    });

    it('returns trimmed non-empty name', () => {
      expect(normalizeFullName('  Jane Doe  ')).toBe('Jane Doe');
    });
  });

  describe('normalizeEmailInput', () => {
    it('trims and lowercases', () => {
      expect(normalizeEmailInput('  User@Example.COM  ')).toBe('user@example.com');
    });
  });

  describe('validateEmailChangeInput', () => {
    it('rejects missing @', () => {
      expect(validateEmailChangeInput({ nextEmailRaw: 'notanemail' })).toEqual({
        ok: false,
        code: 'email_invalid',
      });
    });

    it('rejects empty after trim', () => {
      expect(validateEmailChangeInput({ nextEmailRaw: '   ' })).toEqual({
        ok: false,
        code: 'email_invalid',
      });
    });

    it('rejects same as current (case-insensitive)', () => {
      expect(
        validateEmailChangeInput({
          nextEmailRaw: 'User@Example.com',
          currentEmail: 'user@example.com',
        }),
      ).toEqual({ ok: false, code: 'email_already_current' });
    });

    it('accepts valid new email', () => {
      expect(
        validateEmailChangeInput({
          nextEmailRaw: 'new@example.com',
          currentEmail: 'old@example.com',
        }),
      ).toEqual({ ok: true });
    });
  });

  describe('validatePasswordChangeInput', () => {
    it('rejects when below min length', () => {
      expect(
        validatePasswordChangeInput({
          newPassword: 'short',
          confirmPassword: 'short',
          minChars: 8,
        }),
      ).toEqual({ ok: false, code: 'password_min_length' });
    });

    it('rejects mismatch', () => {
      expect(
        validatePasswordChangeInput({
          newPassword: 'password123',
          confirmPassword: 'password124',
          minChars: 8,
        }),
      ).toEqual({ ok: false, code: 'password_mismatch' });
    });

    it('accepts matching passwords at min length', () => {
      expect(
        validatePasswordChangeInput({
          newPassword: 'password',
          confirmPassword: 'password',
          minChars: 8,
        }),
      ).toEqual({ ok: true });
    });
  });
});
