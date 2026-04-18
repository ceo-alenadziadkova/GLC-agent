import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import type { AuthOperationErrorCode } from '../domain/settings.error-policy';
import type { ValidationResult } from '../domain/settings.validation';
type InvalidValidationResult = Extract<ValidationResult, { ok: false }>;

export function mapProfileSaveError(error: unknown): string {
  return error instanceof Error ? error.message : WORKSPACE_PAGE_COPY.settings.profileUpdateFailed;
}

export function mapSelfServeSaveError(error: unknown): string {
  return error instanceof Error ? error.message : WORKSPACE_PAGE_COPY.settings.assignmentUpdateFailed;
}

export function mapEmailValidationError(result: InvalidValidationResult): string {
  switch (result.code) {
    case 'email_invalid':
      return WORKSPACE_PAGE_COPY.settings.emailInvalid;
    case 'email_already_current':
      return WORKSPACE_PAGE_COPY.settings.emailAlreadyCurrent;
    default:
      return WORKSPACE_PAGE_COPY.settings.emailInvalid;
  }
}

export function mapPasswordValidationError(result: InvalidValidationResult): string {
  switch (result.code) {
    case 'password_mismatch':
      return WORKSPACE_PAGE_COPY.settings.passwordMismatch;
    case 'password_min_length':
      return WORKSPACE_PAGE_COPY.settings.passwordMinLengthError;
    default:
      return WORKSPACE_PAGE_COPY.settings.passwordMismatch;
  }
}

export function mapPasswordChangeError(code: AuthOperationErrorCode, fallback: string): string {
  if (code === 'reauth_required') {
    return WORKSPACE_PAGE_COPY.settings.passwordReauthRequired;
  }
  return fallback || SETTINGS_PAGE_COPY.account.updatePassword;
}
