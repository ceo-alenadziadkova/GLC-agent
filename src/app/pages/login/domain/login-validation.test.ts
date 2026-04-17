import { describe, expect, it } from 'vitest';
import { validateAuthCredentials, validateForgotPasswordEmail, validateRecoveryPasswords } from './login-validation';

describe('login-validation', () => {
  it('rejects invalid email for auth credentials', () => {
    const result = validateAuthCredentials('bad-email', 'password123', false);
    expect(result).toEqual({ email: 'Enter a valid email address.' });
  });

  it('requires minimum password for sign-up', () => {
    const result = validateAuthCredentials('user@example.com', 'short', true);
    expect(result).toEqual({ password: 'Password must be at least 8 characters.' });
  });

  it('accepts sign-in password length as-is', () => {
    const result = validateAuthCredentials('user@example.com', 'a', false);
    expect(result).toEqual({});
  });

  it('validates forgot-password email', () => {
    const result = validateForgotPasswordEmail('invalid');
    expect(result).toEqual({ email: 'Enter a valid email address.' });
  });

  it('validates recovery password and confirmation', () => {
    expect(validateRecoveryPasswords('short', 'short')).toEqual({
      recoveryPassword: 'Password must be at least 8 characters.',
    });
    expect(validateRecoveryPasswords('password123', 'password124')).toEqual({
      recoveryConfirm: 'Passwords do not match.',
    });
  });
});
