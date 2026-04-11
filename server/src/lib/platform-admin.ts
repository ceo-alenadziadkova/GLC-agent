/**
 * Who may change platform settings (self-serve audit owner, consultant allowlist).
 *
 * - **Open mode:** no `profiles.is_platform_admin`, legacy `PLATFORM_ADMIN_USER_IDS` empty → any consultant may manage.
 * - **Restricted:** at least one consultant has `is_platform_admin = true` and/or legacy env list is non-empty → only those users.
 *
 * Legacy **`PLATFORM_ADMIN_USER_IDS`** (comma-separated `profiles.id`) is merged for transition; prefer DB flag for new deployments.
 */

import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';

export function listPlatformAdminUserIdsFromEnv(): string[] {
  const raw = process.env.PLATFORM_ADMIN_USER_IDS?.trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export async function canManagePlatformSettings(userId: string): Promise<boolean> {
  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('role, is_platform_admin')
    .eq('id', userId)
    .maybeSingle();

  if (meErr) {
    logger.warn('platform_admin.profile_lookup_failed', { error: meErr.message, userId });
    return false;
  }

  if (!me || (me.role as string) !== 'consultant') return false;

  const legacy = listPlatformAdminUserIdsFromEnv();
  if (legacy.length > 0 && legacy.includes(userId)) return true;

  if (me.is_platform_admin === true) return true;

  const { count, error: countErr } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_platform_admin', true);

  if (countErr) {
    logger.warn('platform_admin.admin_count_failed', { error: countErr.message });
    return true;
  }

  const hasDbAdmins = (count ?? 0) > 0;
  const restricted = legacy.length > 0 || hasDbAdmins;

  if (!restricted) return true;

  return false;
}
