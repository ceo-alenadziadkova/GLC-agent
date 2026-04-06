import { supabase } from '../services/supabase.js';
import { getStoredSelfServeAuditOwnerUserId } from './platform-self-serve-settings.js';

export const SELF_SERVE_OWNER_UNAVAILABLE_CODE = 'SELF_SERVE_OWNER_UNAVAILABLE' as const;

export type SelfServeOwnerResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      error: string;
      statusCode: number;
      code: typeof SELF_SERVE_OWNER_UNAVAILABLE_CODE;
    };

const CLIENT_SAFE_UNAVAILABLE: SelfServeOwnerResult = {
  ok: false,
  statusCode: 503,
  code: SELF_SERVE_OWNER_UNAVAILABLE_CODE,
  error:
    'We could not assign ownership for this audit. Please try again later or contact the GLC team.',
};

async function validateConsultantUserId(raw: string): Promise<SelfServeOwnerResult> {
  const id = raw.trim();
  if (!id) {
    return CLIENT_SAFE_UNAVAILABLE;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', id)
    .maybeSingle();

  if (error || !profile || (profile.role as string) !== 'consultant') {
    return CLIENT_SAFE_UNAVAILABLE;
  }

  return { ok: true, userId: profile.id as string };
}

/**
 * Resolves the consultant `audits.user_id` for audits created by clients
 * (self-serve). Order: value stored in `platform_settings`, then optional
 * `SELF_SERVE_AUDIT_OWNER_USER_ID` env (legacy / bootstrap).
 */
export async function resolveSelfServeAuditOwnerUserId(): Promise<SelfServeOwnerResult> {
  const stored = await getStoredSelfServeAuditOwnerUserId();
  if (stored) {
    const validated = await validateConsultantUserId(stored);
    if (validated.ok) {
      return validated;
    }
    // Invalid stored id: fall through to env if present
  }

  const envRaw = process.env.SELF_SERVE_AUDIT_OWNER_USER_ID?.trim();
  if (envRaw) {
    return validateConsultantUserId(envRaw);
  }

  return CLIENT_SAFE_UNAVAILABLE;
}
