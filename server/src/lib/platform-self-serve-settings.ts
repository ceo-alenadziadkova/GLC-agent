import { supabase } from '../services/supabase.js';
import { PLATFORM_SELF_SERVE_PERSIST_FAILED_MESSAGE } from '../config/api-error-codes.js';

const SINGLETON_ID = 1;

export async function getStoredSelfServeAuditOwnerUserId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('self_serve_audit_owner_user_id')
    .eq('id', SINGLETON_ID)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  const raw = data.self_serve_audit_owner_user_id;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

/** When non-empty, contributes to legacy platform-admin ACL lists (with `profiles.is_platform_admin`). */
export async function getStoredLegacyPlatformAdminUserIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('legacy_platform_admin_user_ids')
    .eq('id', SINGLETON_ID)
    .maybeSingle();

  if (error || !data) {
    return [];
  }
  const raw = data.legacy_platform_admin_user_ids;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export async function setStoredSelfServeAuditOwnerUserId(
  ownerUserId: string | null,
  updatedBy: string,
): Promise<{ ok: true } | { ok: false; error: string; statusCode: number }> {
  const { error } = await supabase
    .from('platform_settings')
    .update({
      self_serve_audit_owner_user_id: ownerUserId,
      updated_by: updatedBy,
    })
    .eq('id', SINGLETON_ID);

  if (error) {
    return { ok: false, statusCode: 500, error: PLATFORM_SELF_SERVE_PERSIST_FAILED_MESSAGE };
  }
  return { ok: true };
}
