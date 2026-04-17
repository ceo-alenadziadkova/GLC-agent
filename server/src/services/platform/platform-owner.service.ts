import { supabase } from '../supabase.js';
import { listConsultantDirectoryRows } from '../../lib/consultant-directory.js';
import {
  getStoredSelfServeAuditOwnerUserId,
  setStoredSelfServeAuditOwnerUserId,
} from '../../lib/platform-self-serve-settings.js';
import { resolveSelfServeAuditOwnerUserId } from '../../lib/self-serve-audit-owner.js';
import { PLATFORM_CONSULTANT_ROLE } from '../../config/platform-role-policy.js';

export type PlatformOwnerView = {
  stored_owner_user_id: string | null;
  effective_owner_user_id: string | null;
  effective_ready: boolean;
  env_fallback_active: boolean;
  implicit_fallback_active: boolean;
  consultants: Array<{ id: string }>;
  can_manage: boolean;
};

export async function getSelfServeOwnerView(userId: string, canManage: boolean): Promise<PlatformOwnerView> {
  const stored = await getStoredSelfServeAuditOwnerUserId();
  const resolved = await resolveSelfServeAuditOwnerUserId();
  const consultants = canManage ? await listConsultantDirectoryRows() : [{ id: userId }];
  const effectiveReady = resolved.ok;

  return {
    stored_owner_user_id: stored,
    effective_owner_user_id: resolved.ok ? resolved.userId : null,
    effective_ready: effectiveReady,
    env_fallback_active: false,
    implicit_fallback_active: effectiveReady && !stored,
    consultants,
    can_manage: canManage,
  };
}

export async function isConsultantProfile(userId: string): Promise<boolean> {
  const { data: profile, error } = await supabase.from('profiles').select('id, role').eq('id', userId).maybeSingle();
  return !error && !!profile && (profile.role as string) === PLATFORM_CONSULTANT_ROLE;
}

export async function updateStoredOwnerAndResolve(ownerUserId: string | null, actorUserId: string) {
  const updated = await setStoredSelfServeAuditOwnerUserId(ownerUserId, actorUserId);
  if (!updated.ok) {
    return updated;
  }
  const resolved = await resolveSelfServeAuditOwnerUserId();
  return {
    ok: true as const,
    payload: {
      ok: true,
      stored_owner_user_id: ownerUserId,
      effective_ready: resolved.ok,
      effective_owner_user_id: resolved.ok ? resolved.userId : null,
      env_fallback_active: false,
      implicit_fallback_active: resolved.ok && !ownerUserId,
    },
  };
}
