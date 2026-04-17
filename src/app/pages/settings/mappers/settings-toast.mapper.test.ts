import { describe, expect, it } from 'vitest';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import {
  mapEmailValidationError,
  mapPasswordChangeError,
  mapPasswordValidationError,
  mapProfileSaveError,
  mapSelfServeSaveError,
} from './settings-toast.mapper';

describe('settings-toast.mapper', () => {
  it('mapProfileSaveError prefers Error message', () => {
    expect(mapProfileSaveError(new Error('boom'))).toBe('boom');
    expect(mapProfileSaveError('not an error')).toBe(WORKSPACE_PAGE_COPY.settings.profileUpdateFailed);
  });

  it('mapSelfServeSaveError prefers Error message', () => {
    expect(mapSelfServeSaveError(new Error('denied'))).toBe('denied');
    expect(mapSelfServeSaveError(null)).toBe(WORKSPACE_PAGE_COPY.settings.assignmentUpdateFailed);
  });

  it('mapEmailValidationError maps codes', () => {
    expect(mapEmailValidationError({ ok: false, code: 'email_invalid' })).toBe(
      WORKSPACE_PAGE_COPY.settings.emailInvalid,
    );
    expect(mapEmailValidationError({ ok: false, code: 'email_already_current' })).toBe(
      WORKSPACE_PAGE_COPY.settings.emailAlreadyCurrent,
    );
  });

  it('mapPasswordValidationError maps codes', () => {
    expect(mapPasswordValidationError({ ok: false, code: 'password_mismatch' })).toBe(
      WORKSPACE_PAGE_COPY.settings.passwordMismatch,
    );
    expect(mapPasswordValidationError({ ok: false, code: 'password_min_length' })).toBe(
      WORKSPACE_PAGE_COPY.settings.passwordMinLengthError,
    );
  });

  it('mapPasswordChangeError maps reauth', () => {
    expect(mapPasswordChangeError('reauth_required', 'fallback')).toBe(
      WORKSPACE_PAGE_COPY.settings.passwordReauthRequired,
    );
    expect(mapPasswordChangeError('generic', 'Server error')).toBe('Server error');
    expect(mapPasswordChangeError('generic', '')).toBe(SETTINGS_PAGE_COPY.account.updatePassword);
  });
});
