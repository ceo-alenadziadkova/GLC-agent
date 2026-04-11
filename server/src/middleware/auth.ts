import type { Request, Response, NextFunction } from 'express';
import {
  API_ERROR_CODES,
  AUTH_AUTHENTICATION_FAILED_MESSAGE,
  AUTH_GUEST_PORTAL_FORBIDDEN_MESSAGE,
  AUTH_INVALID_TOKEN_MESSAGE,
  AUTH_MISSING_AUTHORIZATION_MESSAGE,
  AUTH_NOT_AUTHENTICATED_MESSAGE,
  AUTH_PROFILE_CREATE_FAILED_MESSAGE,
  AUTH_PROFILE_LOAD_FAILED_MESSAGE,
  AUTH_PROFILE_LOOKUP_FAILED_MESSAGE,
  AUTH_PROFILE_UPDATE_FAILED_MESSAGE,
  AUTH_REGISTERED_LOG_REQUIRED_MESSAGE,
  apiErrorJson,
  authRoleRequiredMessage,
} from '../config/api-error-codes.js';
import { supabase } from '../services/supabase.js';
import { updateContext } from '../services/observability-context.js';
import { logger } from '../services/logger.js';
import { emitStructuredNotification } from '../services/notifications.js';
import { isConsultantEmailRegistered } from '../services/consultant-allowlist.js';

export type UserRole = 'consultant' | 'client' | 'guest';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  /** True when Supabase session is anonymous (snapshot flow until linkIdentity / full sign-up). */
  userIsAnonymous?: boolean;
  userRole?: UserRole;
}

function isGuestRoleConstraintError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; details?: string; hint?: string } | null;
  if (!e) return false;
  if (e.code === '23514') return true;
  const blob = `${e.message ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`.toLowerCase();
  return blob.includes('profiles_role_check') || blob.includes('role');
}

/** Postgres unique_violation — two concurrent first requests can race on INSERT into profiles. */
function isUniqueViolationError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === '23505') return true;
  return (e.message ?? '').toLowerCase().includes('duplicate key');
}

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches userId and userEmail to the request object.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res
      .status(401)
      .json(apiErrorJson(API_ERROR_CODES.AUTH_MISSING_AUTHORIZATION, AUTH_MISSING_AUTHORIZATION_MESSAGE));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json(apiErrorJson(API_ERROR_CODES.AUTH_INVALID_TOKEN, AUTH_INVALID_TOKEN_MESSAGE));
      return;
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email ?? undefined;
    req.userIsAnonymous = data.user.is_anonymous === true;
    updateContext({ userId: data.user.id });
    next();
  } catch (err) {
    logger.warn('requireAuth: token verification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    res
      .status(401)
      .json(apiErrorJson(API_ERROR_CODES.AUTH_AUTHENTICATION_FAILED, AUTH_AUTHENTICATION_FAILED_MESSAGE));
  }
}

/**
 * Optional auth — attaches user info if token is present, but doesn't block.
 */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data } = await supabase.auth.getUser(token);
      if (data.user) {
        req.userId = data.user.id;
        req.userEmail = data.user.email ?? undefined;
      }
    } catch {
      // Silently continue without auth
    }
  }

  next();
}

/**
 * Reads the user's profile from the DB and attaches their role to the request.
 * Must be called AFTER requireAuth (req.userId must be set).
 * Handles first-login profile creation and one-way promotion to 'consultant'
 * when the email is in `consultant_email_allowlist` (DB).
 * It does not auto-downgrade an existing consultant when allowlist or env changes.
 *
 * Concurrency: parallel HTTP calls right after first login may both see "no row" and INSERT.
 * The loser gets unique_violation (23505); we refetch once and continue so role resolution
 * stays deterministic and guests/clients never share or cross user ids (pk is auth user id).
 */
export async function attachProfile(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json(apiErrorJson(API_ERROR_CODES.AUTH_NOT_AUTHENTICATED, AUTH_NOT_AUTHENTICATED_MESSAGE));
    return;
  }

  try {
    const isAnon = req.userIsAnonymous === true;

    const emailLower = (req.userEmail ?? '').trim().toLowerCase();
    const allowlisted = emailLower ? await isConsultantEmailRegistered(emailLower) : false;
    const intendedRole: UserRole = emailLower && allowlisted ? 'consultant' : 'client';

    /** Role for a brand-new profile row: anonymous → guest; otherwise client/consultant from email. */
    const roleForInsert: UserRole = isAnon ? 'guest' : intendedRole;

    const profileFetch = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.userId)
      .single();
    let existingProfile = profileFetch.data;
    const fetchError = profileFetch.error;

    if (fetchError && fetchError.code !== 'PGRST116') {
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_LOAD_FAILED, AUTH_PROFILE_LOAD_FAILED_MESSAGE));
      return;
    }

    if (!existingProfile) {
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ id: req.userId, role: roleForInsert })
        .select('role')
        .single();

      if (!createError && createdProfile) {
        req.userRole = createdProfile.role as UserRole;
        next();
        return;
      }

      if (createError && isUniqueViolationError(createError)) {
        const { data: winnerRow, error: refetchErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', req.userId)
          .single();
        if (refetchErr || !winnerRow) {
          res
            .status(500)
            .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_CREATE_FAILED, AUTH_PROFILE_CREATE_FAILED_MESSAGE));
          return;
        }
        existingProfile = winnerRow;
      } else if (isAnon && isGuestRoleConstraintError(createError)) {
        logger.warn('auth.guest_role_not_supported_fallback', {
          user_id: req.userId,
          hint: 'apply migration 023_profiles_guest_role.sql',
        });
        const { data: fallbackProfile, error: fallbackError } = await supabase
          .from('profiles')
          .insert({ id: req.userId, role: intendedRole })
          .select('role')
          .single();
        if (fallbackError && isUniqueViolationError(fallbackError)) {
          const { data: winnerRow, error: refetchErr } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.userId)
            .single();
          if (refetchErr || !winnerRow) {
            res
              .status(500)
              .json(
                apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_CREATE_FAILED, AUTH_PROFILE_CREATE_FAILED_MESSAGE),
              );
            return;
          }
          existingProfile = winnerRow;
        } else if (!fallbackError && fallbackProfile) {
          req.userRole = 'guest';
          next();
          return;
        } else {
          res
            .status(500)
            .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_CREATE_FAILED, AUTH_PROFILE_CREATE_FAILED_MESSAGE));
          return;
        }
      } else {
        res
          .status(500)
          .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_CREATE_FAILED, AUTH_PROFILE_CREATE_FAILED_MESSAGE));
        return;
      }
    }

    if (!existingProfile) {
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_LOAD_FAILED, AUTH_PROFILE_LOAD_FAILED_MESSAGE));
      return;
    }

    let resolvedRole = existingProfile.role as UserRole;

    if (isAnon) {
      if (resolvedRole !== 'guest') {
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'guest' })
          .eq('id', req.userId)
          .select('role')
          .single();

        if (updateError || !updatedProfile) {
          if (isGuestRoleConstraintError(updateError)) {
            logger.warn('auth.guest_role_not_supported_on_update', {
              user_id: req.userId,
              hint: 'apply migration 023_profiles_guest_role.sql',
            });
            resolvedRole = 'guest';
          } else {
            res
              .status(500)
              .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_UPDATE_FAILED, AUTH_PROFILE_UPDATE_FAILED_MESSAGE));
            return;
          }
        } else {
          resolvedRole = updatedProfile.role as UserRole;
        }
      }
    } else if (resolvedRole === 'guest') {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: intendedRole })
        .eq('id', req.userId)
        .select('role')
        .single();

      if (updateError || !updatedProfile) {
        res
          .status(500)
          .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_UPDATE_FAILED, AUTH_PROFILE_UPDATE_FAILED_MESSAGE));
        return;
      }
      resolvedRole = updatedProfile.role as UserRole;
      await emitStructuredNotification({
        category: 'registration',
        event: 'user_registered',
        priority: 'low',
        audience: 'consultants',
        title: 'New user registered',
        message: `Guest user completed registration as ${resolvedRole}.`,
        payload: {
          user_id: req.userId,
          role: resolvedRole,
          actor_role: 'client',
          user_email: req.userEmail,
        },
      });
    }

    if (!isAnon && resolvedRole !== 'consultant' && intendedRole === 'consultant') {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'consultant' })
        .eq('id', req.userId)
        .select('role')
        .single();

      if (updateError || !updatedProfile) {
        res
          .status(500)
          .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_UPDATE_FAILED, AUTH_PROFILE_UPDATE_FAILED_MESSAGE));
        return;
      }

      resolvedRole = updatedProfile.role as UserRole;
    }

    if (!resolvedRole) {
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_LOAD_FAILED, AUTH_PROFILE_LOAD_FAILED_MESSAGE));
      return;
    }

    req.userRole = resolvedRole;
    next();
  } catch {
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUTH_PROFILE_LOOKUP_FAILED, AUTH_PROFILE_LOOKUP_FAILED_MESSAGE));
  }
}

/**
 * Middleware factory that restricts a route to a specific role.
 * Must be chained AFTER requireAuth + attachProfile.
 *
 * Usage:
 *   router.post('/pipeline/start', requireAuth, attachProfile, requireRole('consultant'), handler)
 */
export function requireRole(role: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.userRole !== role) {
      res
        .status(403)
        .json(apiErrorJson(API_ERROR_CODES.AUTH_ROLE_REQUIRED, authRoleRequiredMessage(role)));
      return;
    }
    next();
  };
}

/** Use after attachProfile. Blocks snapshot-only (anonymous) sessions from portal audit APIs. */
export function rejectGuestFromPortal(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole === 'guest' || req.userIsAnonymous === true) {
    res
      .status(403)
      .json(apiErrorJson(API_ERROR_CODES.AUTH_GUEST_PORTAL_FORBIDDEN, AUTH_GUEST_PORTAL_FORBIDDEN_MESSAGE));
    return;
  }
  next();
}

/**
 * Use after attachProfile. The opposite of portal routes — only anonymous or `guest` profile
 * (free snapshot UX). Full `client`/`consultant` must use registered-only handlers (e.g. POST /api/log).
 */
export function allowGuestSnapshotLogIngest(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userIsAnonymous === true || req.userRole === 'guest') {
    next();
    return;
  }
  res
    .status(403)
    .json(apiErrorJson(API_ERROR_CODES.AUTH_REGISTERED_LOG_REQUIRED, AUTH_REGISTERED_LOG_REQUIRED_MESSAGE));
}
