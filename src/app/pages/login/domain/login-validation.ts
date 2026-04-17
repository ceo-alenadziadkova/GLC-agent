import { LOGIN_PAGE_COPY_EN as LC } from '../../../config/login-copy.en';
import { LOGIN_UI_POLICY } from '../config/login-ui-policy';
import type { FieldErrors } from '../types';

export function validateEmail(emailRaw: string): string | null {
  const email = emailRaw.trim();
  if (!email) {
    return LC.errorInvalidEmail;
  }
  if (!LOGIN_UI_POLICY.emailValidationPattern.test(email)) {
    return LC.errorInvalidEmail;
  }
  return null;
}

export function validateAuthCredentials(emailRaw: string, password: string, isSignUp: boolean): Partial<FieldErrors> {
  const emailError = validateEmail(emailRaw);
  if (emailError) {
    return { email: emailError };
  }
  if (isSignUp && password.length < LOGIN_UI_POLICY.minPasswordLength) {
    return { password: LC.errorPasswordMinLength };
  }
  return {};
}

export function validateForgotPasswordEmail(emailRaw: string): Partial<FieldErrors> {
  const emailError = validateEmail(emailRaw);
  return emailError ? { email: emailError } : {};
}

export function validateRecoveryPasswords(password: string, confirmPassword: string): Partial<FieldErrors> {
  if (password.length < LOGIN_UI_POLICY.minPasswordLength) {
    return { recoveryPassword: LC.errorPasswordMinLength };
  }
  if (password !== confirmPassword) {
    return { recoveryConfirm: LC.errorPasswordsMismatch };
  }
  return {};
}
