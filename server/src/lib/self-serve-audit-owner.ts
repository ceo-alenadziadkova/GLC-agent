import { supabase } from '../services/supabase.js';
import { getStoredSelfServeAuditOwnerUserId } from './platform-self-serve-settings.js';
import { listPlatformAdminUserIdsFromEnv } from './platform-admin.js';
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
      'Set platform_settings.self_serve_audit_owner_user_id or SELF_SERVE_AUDIT_OWNER_USER_ID, or set profiles.is_platform_admin / PLATFORM_ADMIN_USER_IDS (or ensure at least one consultant profile exists).',
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
  for (const adminRaw of listPlatformAdminUserIdsFromEnv()) {
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
 * When PLATFORM_ADMIN_USER_IDS is unset and no consultant has is_platform_admin (open mode), use the earliest consultant
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
 * 2. `SELF_SERVE_AUDIT_OWNER_USER_ID` env
 * 3. First valid id in `PLATFORM_ADMIN_USER_IDS` (when non-empty; legacy)
 * 4. If unrestricted (open mode): earliest consultant profile (`created_at`)
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

  const envRaw = process.env.SELF_SERVE_AUDIT_OWNER_USER_ID?.trim();
  if (envRaw) {
    const fromEnv = await consultantIdIfValid(envRaw);
    if (fromEnv) {
      return { ok: true, userId: fromEnv };
    }
    return unavailable(
      'SELF_SERVE_AUDIT_OWNER_USER_ID is set but does not reference a valid consultant profile',
    );
  }

  const fromAdmins = await tryFirstPlatformAdmin();
  if (fromAdmins) {
    return fromAdmins;
  }

  if (listPlatformAdminUserIdsFromEnv().length === 0) {
    const fromFirst = await tryFirstConsultantByCreatedAt();
    if (fromFirst) {
      return fromFirst;
    }
  }

  if (stored) {
    logger.error('self_serve_audit_owner.unavailable', {
      component: 'self_serve_audit_owner',
      reason:
        'stored self-serve owner invalid and no env / platform-admin / first-consultant fallback succeeded',
      remediation:
        'Fix platform_settings.self_serve_audit_owner_user_id or set SELF_SERVE_AUDIT_OWNER_USER_ID / platform admin flags.',
    });
    return CLIENT_SAFE_UNAVAILABLE;
  }

  return unavailable(
    'no valid self-serve audit owner: platform_settings empty, SELF_SERVE_AUDIT_OWNER_USER_ID unset, platform admin list empty or invalid, and no consultant profiles',
  );
}
