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
import {
  addConsultantAllowlistEmail,
  listConsultantAllowlistEmails,
  normalizeConsultantAllowlistEmail,
  removeConsultantAllowlistEmail,
} from '../services/consultant-allowlist.js';
import {
  API_ERROR_CODES,
  PLATFORM_ADMIN_ONLY_MESSAGE,
  PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED_MESSAGE,
  PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID_MESSAGE,
  PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED_MESSAGE,
  PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED_MESSAGE,
  PLATFORM_OWNER_NOT_CONSULTANT_MESSAGE,
  PLATFORM_OWNER_REQUIRED_MESSAGE,
  PLATFORM_OWNER_UUID_INVALID_MESSAGE,
  PLATFORM_SELF_SERVE_LOAD_FAILED_MESSAGE,
  PLATFORM_SELF_SERVE_PERSIST_FAILED_MESSAGE,
  PLATFORM_SELF_SERVE_UPDATE_FAILED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';

export const platformRouter = Router();

platformRouter.use(requireAuth);
platformRouter.use(generalLimiter);
platformRouter.use(attachProfile);

platformRouter.get('/self-serve-owner', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    const canManage = await canManagePlatformSettings(uid);
    const stored = await getStoredSelfServeAuditOwnerUserId();
    const resolved = await resolveSelfServeAuditOwnerUserId();
    const consultants = canManage
      ? await listConsultantDirectoryRows()
      : [{ id: uid }];

    const effectiveReady = resolved.ok;
    /** True when the API resolved an owner without a persisted `platform_settings` row (admin list or first consultant). */
    const implicitFallbackActive = effectiveReady && !stored;
    /** Deprecated: always false; `SELF_SERVE_AUDIT_OWNER_USER_ID` is no longer read at runtime. */
    const envFallbackActive = false;

    res.json({
      stored_owner_user_id: stored,
      effective_owner_user_id: resolved.ok ? resolved.userId : null,
      effective_ready: effectiveReady,
      env_fallback_active: envFallbackActive,
      implicit_fallback_active: implicitFallbackActive,
      consultants,
      can_manage: canManage,
    });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_LOAD_FAILED, PLATFORM_SELF_SERVE_LOAD_FAILED_MESSAGE),
      );
  }
});

platformRouter.patch('/self-serve-owner', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    if (!(await canManagePlatformSettings(uid))) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.PLATFORM_ADMIN_ONLY, PLATFORM_ADMIN_ONLY_MESSAGE));
      return;
    }

    const { owner_user_id: bodyOwner } = req.body as { owner_user_id?: unknown };
    if (!('owner_user_id' in (req.body as object))) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PLATFORM_OWNER_REQUIRED, PLATFORM_OWNER_REQUIRED_MESSAGE));
      return;
    }

    let next: string | null;
    if (bodyOwner === null || bodyOwner === '') {
      next = null;
    } else if (typeof bodyOwner === 'string') {
      const t = bodyOwner.trim();
      next = t.length > 0 ? t : null;
    } else {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PLATFORM_OWNER_UUID_INVALID, PLATFORM_OWNER_UUID_INVALID_MESSAGE));
      return;
    }

    if (next) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', next)
        .maybeSingle();

      if (error || !profile || (profile.role as string) !== 'consultant') {
        res
          .status(400)
          .json(
            apiErrorJson(API_ERROR_CODES.PLATFORM_OWNER_NOT_CONSULTANT, PLATFORM_OWNER_NOT_CONSULTANT_MESSAGE),
          );
        return;
      }
    }

    const updated = await setStoredSelfServeAuditOwnerUserId(next, uid);
    if (!updated.ok) {
      res
        .status(updated.statusCode)
        .json(
          apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_PERSIST_FAILED, PLATFORM_SELF_SERVE_PERSIST_FAILED_MESSAGE),
        );
      return;
    }

    const resolved = await resolveSelfServeAuditOwnerUserId();
    const implicitFallbackActive = resolved.ok && !next;
    res.json({
      ok: true,
      stored_owner_user_id: next,
      effective_ready: resolved.ok,
      effective_owner_user_id: resolved.ok ? resolved.userId : null,
      env_fallback_active: false,
      implicit_fallback_active: implicitFallbackActive,
    });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_UPDATE_FAILED, PLATFORM_SELF_SERVE_UPDATE_FAILED_MESSAGE),
      );
  }
});

platformRouter.get('/consultant-allowlist', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    if (!(await canManagePlatformSettings(uid))) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.PLATFORM_ADMIN_ONLY, PLATFORM_ADMIN_ONLY_MESSAGE));
      return;
    }
    const listed = await listConsultantAllowlistEmails();
    if (!listed.ok) {
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED,
            PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED_MESSAGE,
          ),
        );
      return;
    }
    res.json({ emails: listed.emails });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED,
          PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED_MESSAGE,
        ),
      );
  }
});

platformRouter.post('/consultant-allowlist', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    if (!(await canManagePlatformSettings(uid))) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.PLATFORM_ADMIN_ONLY, PLATFORM_ADMIN_ONLY_MESSAGE));
      return;
    }
    const raw = (req.body as { email?: unknown })?.email;
    if (typeof raw !== 'string') {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID,
            PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID_MESSAGE,
          ),
        );
      return;
    }
    const normalized = normalizeConsultantAllowlistEmail(raw);
    if (!normalized) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID,
            PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID_MESSAGE,
          ),
        );
      return;
    }
    const added = await addConsultantAllowlistEmail(normalized);
    if (!added.ok) {
      if (added.conflict) {
        res.status(409).json(
          apiErrorJson(API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED, added.error, {
            details: { conflict: true },
          }),
        );
        return;
      }
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED,
            PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED_MESSAGE,
          ),
        );
      return;
    }
    res.status(201).json({ ok: true, email: normalized });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED,
          PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED_MESSAGE,
        ),
      );
  }
});

platformRouter.delete('/consultant-allowlist', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    if (!(await canManagePlatformSettings(uid))) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.PLATFORM_ADMIN_ONLY, PLATFORM_ADMIN_ONLY_MESSAGE));
      return;
    }
    const q = typeof req.query.email === 'string' ? req.query.email : '';
    const normalized = normalizeConsultantAllowlistEmail(q);
    if (!normalized) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID,
            PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID_MESSAGE,
          ),
        );
      return;
    }
    const removed = await removeConsultantAllowlistEmail(normalized);
    if (!removed.ok) {
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED,
            PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED_MESSAGE,
          ),
        );
      return;
    }
    res.json({ ok: true, removed: removed.removed, email: normalized });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED,
          PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED_MESSAGE,
        ),
      );
  }
});
