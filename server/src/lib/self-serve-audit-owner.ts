import { supabase } from '../services/supabase.js';
import { getStoredSelfServeAuditOwnerUserId } from './platform-self-serve-settings.js';
import { listLegacyPlatformAdminUserIds } from './platform-admin.js';
import { logger } from '../services/logger.js';
import { API_ERROR_CODES, SELF_SERVE_OWNER_UNAVAILABLE_MESSAGE } from '../config/api-error-codes.js';

/** Stable string for client checks; same value as `API_ERROR_CODES.SELF_SERVE_OWNER_UNAVAILABLE`. */
export const SELF_SERVE_OWNER_UNAVAILABLE_CODE = API_ERROR_CODES.SELF_SERVE_OWNER_UNAVAILABLE;

export type SelfServeOwnerResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      error: string;
      statusCode: number;
      code: typeof API_ERROR_CODES.SELF_SERVE_OWNER_UNAVAILABLE;
    };

const CLIENT_SAFE_UNAVAILABLE: SelfServeOwnerResult = {
  ok: false,
  statusCode: 503,
  code: API_ERROR_CODES.SELF_SERVE_OWNER_UNAVAILABLE,
  error: SELF_SERVE_OWNER_UNAVAILABLE_MESSAGE,
};

function unavailable(reason: string): SelfServeOwnerResult {
  logger.error('self_serve_audit_owner.unavailable', {
    component: 'self_serve_audit_owner',
    reason,
    remediation:
      'Set platform_settings.self_serve_audit_owner_user_id, or configure profiles.is_platform_admin / platform_settings.legacy_platform_admin_user_ids, or ensure at least one consultant profile exists (open mode).',
  });
  return CLIENT_SAFE_UNAVAILABLE;
}

/** Returns consultant `profiles.id` when `raw` is a consultant UUID, else null (no logging). */
async function consultantIdIfValid(raw: string): Promise<string | null> {
  const id = raw.trim();
  if (!id) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', id)
    .maybeSingle();

  if (error || !profile || (profile.role as string) !== 'consultant') {
    return null;
  }
  return profile.id as string;
}

async function tryFirstPlatformAdmin(): Promise<SelfServeOwnerResult | null> {
  for (const adminRaw of await listLegacyPlatformAdminUserIds()) {
    const cid = await consultantIdIfValid(adminRaw);
    if (cid) {
      logger.info('self_serve_audit_owner.fallback_platform_admin', {
        component: 'self_serve_audit_owner',
      });
      return { ok: true, userId: cid };
    }
  }
  return null;
}

/**
 * When legacy admin lists are empty and no consultant has is_platform_admin (open mode), use the earliest consultant
 * by signup time as implicit default owner.
 */
async function tryFirstConsultantByCreatedAt(): Promise<SelfServeOwnerResult | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'consultant')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  logger.info('self_serve_audit_owner.fallback_first_consultant', {
    component: 'self_serve_audit_owner',
    note: 'No platform admin restriction; using earliest consultant by created_at.',
  });
  return { ok: true, userId: data.id as string };
}

/**
 * Resolves the consultant `audits.user_id` for audits created by clients (self-serve) and
 * public snapshot. Order:
 * 1. `platform_settings.self_serve_audit_owner_user_id`
 * 2. First valid id in `platform_settings.legacy_platform_admin_user_ids`
 * 3. If unrestricted (open mode): earliest consultant profile (`created_at`)
 */
export async function resolveSelfServeAuditOwnerUserId(): Promise<SelfServeOwnerResult> {
  const stored = await getStoredSelfServeAuditOwnerUserId();
  if (stored) {
    const fromStored = await consultantIdIfValid(stored);
    if (fromStored) {
      return { ok: true, userId: fromStored };
    }
    logger.warn('self_serve_audit_owner.stored_owner_invalid', {
      component: 'self_serve_audit_owner',
      message:
        'platform_settings.self_serve_audit_owner_user_id is missing or not a consultant; trying fallbacks',
    });
  }

  const fromAdmins = await tryFirstPlatformAdmin();
  if (fromAdmins) {
    return fromAdmins;
  }

  if ((await listLegacyPlatformAdminUserIds()).length === 0) {
    const fromFirst = await tryFirstConsultantByCreatedAt();
    if (fromFirst) {
      return fromFirst;
    }
  }

  if (stored) {
    logger.error('self_serve_audit_owner.unavailable', {
      component: 'self_serve_audit_owner',
      reason:
        'stored self-serve owner invalid and no platform-admin / first-consultant fallback succeeded',
      remediation:
        'Fix platform_settings.self_serve_audit_owner_user_id or configure platform admin / consultant fallbacks.',
    });
    return CLIENT_SAFE_UNAVAILABLE;
  }

  return unavailable(
    'no valid self-serve audit owner: platform_settings empty, platform admin list empty or invalid, and no consultant profiles',
  );
}

/** Warn at startup when deprecated env is set (ignored at runtime). */
export function warnSelfServeAuditOwnerEnvIfSet(logger: {
  warn: (msg: string, meta?: Record<string, unknown>) => void;
}): void {
  const raw = process.env.SELF_SERVE_AUDIT_OWNER_USER_ID?.trim();
  if (!raw) return;
  logger.warn('self_serve_audit_owner.env_deprecated_ignored', {
    message:
      'SELF_SERVE_AUDIT_OWNER_USER_ID is set but ignored. Persist the owner via PATCH /api/platform/self-serve-owner (platform_settings.self_serve_audit_owner_user_id), then remove the env var.',
  });
}
