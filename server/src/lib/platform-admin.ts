/**
 * Who may change platform settings (self-serve audit owner, consultant allowlist).
 *
 * - **Open mode:** no `profiles.is_platform_admin`, legacy env/DB list empty → any consultant may manage.
 * - **Restricted:** at least one consultant has `is_platform_admin = true` and/or non-empty legacy UUID list → only those users.
 *
 * Prefer **`profiles.is_platform_admin`** or **`platform_settings.legacy_platform_admin_user_ids`** (migration 050);
 * **`PLATFORM_ADMIN_USER_IDS`** env is a fallback when the DB array is empty.
 */

import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';
import { getStoredLegacyPlatformAdminUserIds } from './platform-self-serve-settings.js';

export function listPlatformAdminUserIdsFromEnv(): string[] {
  const raw = process.env.PLATFORM_ADMIN_USER_IDS?.trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Logs once at startup when `PLATFORM_ADMIN_USER_IDS` is set.
 * Prefer `profiles.is_platform_admin` or `platform_settings.legacy_platform_admin_user_ids`; remove env after migration.
 */
export function warnPlatformAdminUserIdsEnvBootstrap(logger: {
  warn: (msg: string, meta?: Record<string, unknown>) => void;
}): void {
  if (!listPlatformAdminUserIdsFromEnv().length) return;
  logger.warn('platform_admin.env_bootstrap_active', {
    message:
      'PLATFORM_ADMIN_USER_IDS is set. Prefer profiles.is_platform_admin or platform_settings.legacy_platform_admin_user_ids; remove env once admins are in the database.',
  });
}

/**
 * Legacy admin UUID list: DB column when non-empty, else `PLATFORM_ADMIN_USER_IDS` env.
 */
export async function listLegacyPlatformAdminUserIds(): Promise<string[]> {
  const fromDb = await getStoredLegacyPlatformAdminUserIds();
  if (fromDb.length > 0) {
    return fromDb;
  }
  return listPlatformAdminUserIdsFromEnv();
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

  const legacy = await listLegacyPlatformAdminUserIds();
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
