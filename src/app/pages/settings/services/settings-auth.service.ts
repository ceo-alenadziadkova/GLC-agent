import { supabase } from '../../../lib/supabase';
import { mapSupabaseAuthErrorCode, type AuthOperationErrorCode } from '../domain/settings.error-policy';
import { normalizeEmailInput } from '../domain/settings.validation';

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; errorMessage: string; errorCode: AuthOperationErrorCode };

export async function changePassword(password: string): Promise<ChangePasswordResult> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
      errorCode: mapSupabaseAuthErrorCode(error.message),
    };
  }
  return { ok: true };
}

export type ChangeEmailResult = { ok: true } | { ok: false; errorMessage: string };

export async function changeEmail(emailRaw: string): Promise<ChangeEmailResult> {
  const { error } = await supabase.auth.updateUser({ email: normalizeEmailInput(emailRaw) });
  if (error) {
    return { ok: false, errorMessage: error.message };
  }
  return { ok: true };
}
