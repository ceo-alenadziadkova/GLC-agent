/**
 * Who may change platform settings (self-serve audit owner, consultant allowlist).
 *
 * - **Open mode:** no `profiles.is_platform_admin`, legacy DB list empty → any consultant may manage.
 * - **Restricted:** at least one consultant has `is_platform_admin = true` and/or non-empty legacy UUID list → only those users.
 *
 * Source of truth for legacy UUID lists: **`platform_settings.legacy_platform_admin_user_ids`** (migration 050)
 * and **`profiles.is_platform_admin`** (migration 049). **`PLATFORM_ADMIN_USER_IDS`** is ignored at runtime;
 * copy values into the database if you still have the variable set in deploy config.
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
 * Warn at startup when `PLATFORM_ADMIN_USER_IDS` is set — the server no longer reads it; migrate to the DB.
 */
export function warnPlatformAdminUserIdsEnvBootstrap(logger: {
  warn: (msg: string, meta?: Record<string, unknown>) => void;
}): void {
  if (!listPlatformAdminUserIdsFromEnv().length) return;
  logger.warn('platform_admin.env_deprecated_ignored', {
    message:
      'PLATFORM_ADMIN_USER_IDS is set but ignored. Copy ids into platform_settings.legacy_platform_admin_user_ids or set profiles.is_platform_admin, then remove the env var.',
  });
}

/**
 * Legacy admin UUID list from **`platform_settings.legacy_platform_admin_user_ids`** only.
 */
export async function listLegacyPlatformAdminUserIds(): Promise<string[]> {
  return getStoredLegacyPlatformAdminUserIds();
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
