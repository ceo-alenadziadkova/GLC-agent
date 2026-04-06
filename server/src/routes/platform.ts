import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rate-limit.js';
import { canManagePlatformSettings } from '../lib/platform-admin.js';
import {
  getStoredSelfServeAuditOwnerUserId,
  setStoredSelfServeAuditOwnerUserId,
} from '../lib/platform-self-serve-settings.js';
import { resolveSelfServeAuditOwnerUserId } from '../lib/self-serve-audit-owner.js';
import { listConsultantDirectoryRows } from '../lib/consultant-directory.js';

export const platformRouter = Router();

platformRouter.use(requireAuth);
platformRouter.use(generalLimiter);
platformRouter.use(attachProfile);

platformRouter.get('/self-serve-owner', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    const stored = await getStoredSelfServeAuditOwnerUserId();
    const envSet = Boolean(process.env.SELF_SERVE_AUDIT_OWNER_USER_ID?.trim());
    const resolved = await resolveSelfServeAuditOwnerUserId();
    const consultants = await listConsultantDirectoryRows();

    const effectiveReady = resolved.ok;
    const envFallbackActive = effectiveReady && !stored && envSet;

    res.json({
      stored_owner_user_id: stored,
      effective_owner_user_id: resolved.ok ? resolved.userId : null,
      effective_ready: effectiveReady,
      env_fallback_active: envFallbackActive,
      consultants,
      can_manage: canManagePlatformSettings(uid),
    });
  } catch {
    res.status(500).json({ error: 'Failed to load platform settings' });
  }
});

platformRouter.patch('/self-serve-owner', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    if (!canManagePlatformSettings(uid)) {
      res.status(403).json({ error: 'Only platform administrators can change this setting' });
      return;
    }

    const { owner_user_id: bodyOwner } = req.body as { owner_user_id?: unknown };
    if (!('owner_user_id' in (req.body as object))) {
      res.status(400).json({ error: 'owner_user_id is required (UUID string or null)' });
      return;
    }

    let next: string | null;
    if (bodyOwner === null || bodyOwner === '') {
      next = null;
    } else if (typeof bodyOwner === 'string') {
      const t = bodyOwner.trim();
      next = t.length > 0 ? t : null;
    } else {
      res.status(400).json({ error: 'owner_user_id must be a string UUID or null' });
      return;
    }

    if (next) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', next)
        .maybeSingle();

      if (error || !profile || (profile.role as string) !== 'consultant') {
        res.status(400).json({ error: 'owner_user_id must be an active consultant profile' });
        return;
      }
    }

    const updated = await setStoredSelfServeAuditOwnerUserId(next, uid);
    if (!updated.ok) {
      res.status(updated.statusCode).json({ error: updated.error });
      return;
    }

    const resolved = await resolveSelfServeAuditOwnerUserId();
    const envSet = Boolean(process.env.SELF_SERVE_AUDIT_OWNER_USER_ID?.trim());
    const envFallbackActive = resolved.ok && !next && envSet;
    res.json({
      ok: true,
      stored_owner_user_id: next,
      effective_ready: resolved.ok,
      effective_owner_user_id: resolved.ok ? resolved.userId : null,
      env_fallback_active: envFallbackActive,
    });
  } catch {
    res.status(500).json({ error: 'Failed to update platform settings' });
  }
});
