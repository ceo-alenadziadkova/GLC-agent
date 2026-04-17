import { SETTINGS_PAGE_DEFAULTS } from '../../../config/settings-page-defaults';

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: 'email_invalid' | 'email_already_current' | 'password_min_length' | 'password_mismatch' };

export function normalizeFullName(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeEmailInput(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmailChangeInput(input: { nextEmailRaw: string; currentEmail?: string | null }): ValidationResult {
  const nextEmail = normalizeEmailInput(input.nextEmailRaw);
  if (!nextEmail || !nextEmail.includes('@')) {
    return { ok: false, code: 'email_invalid' };
  }

  if (nextEmail === normalizeEmailInput(input.currentEmail ?? '')) {
    return { ok: false, code: 'email_already_current' };
  }

  return { ok: true };
}

export function validatePasswordChangeInput(input: {
  newPassword: string;
  confirmPassword: string;
  minChars?: number;
}): ValidationResult {
  const minChars = input.minChars ?? SETTINGS_PAGE_DEFAULTS.minPasswordChars;
  if (input.newPassword.length < minChars) {
    return { ok: false, code: 'password_min_length' };
  }

  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, code: 'password_mismatch' };
  }

  return { ok: true };
}
