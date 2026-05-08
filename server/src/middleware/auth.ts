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
import { AUTH_GET_USER_TIMEOUT_MS } from '../config/auth-network.js';
import { supabase } from '../services/supabase.js';
import { updateContext } from '../services/observability-context.js';
import { logger } from '../services/logger.js';
import { emitStructuredNotification } from '../services/notifications.js';
import { isConsultantEmailRegistered } from '../services/consultant-allowlist.js';
import {
  REGISTRATION_GUEST_REGISTERED_NOTIFICATION_TITLE,
  registrationGuestRegisteredMessage,
} from '../config/route-notification-messages.js';

export type UserRole = 'consultant' | 'client' | 'guest';

export interface AuthRequest extends Request {
  /** Absent or undefined: no optional-auth attempt; `null`: bearer present but invalid / no user. */
  userId?: string | null;
  userEmail?: string | null;
  /** True when Supabase session is anonymous (snapshot flow until linkIdentity / full sign-up). */
  userIsAnonymous?: boolean;
  userRole?: UserRole;
}

type SupabaseAuthTransportError = Error & {
  code?: string;
  cause?: {
    code?: string;
  };
};

function isAuthTransportFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const authErr = error as SupabaseAuthTransportError;
  const directCode = authErr.code;
  const causeCode = authErr.cause?.code;
  return (
    directCode === 'UND_ERR_INFO' ||
    causeCode === 'UND_ERR_INFO' ||
    causeCode === 'EADDRNOTAVAIL' ||
    causeCode === 'ECONNRESET' ||
    error.name === 'AbortError'
  );
}

async function getSupabaseUserWithTimeout(token: string) {
  if (typeof AbortSignal.timeout !== 'function') {
    return supabase.auth.getUser(token);
  }

  return Promise.race([
    supabase.auth.getUser(token),
    new Promise<never>((_, reject) => {
      const signal = AbortSignal.timeout(AUTH_GET_USER_TIMEOUT_MS);
      signal.addEventListener(
        'abort',
        () => {
          reject(new DOMException('TimeoutError', 'AbortError'));
        },
        { once: true },
      );
    }),
  ]);
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
    const { data, error } = await getSupabaseUserWithTimeout(token);

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
    const transportFailure = isAuthTransportFailure(err);
    logger.warn('requireAuth: token verification failed', {
      error: err instanceof Error ? err.message : String(err),
      transport_failure: transportFailure,
    });
    res.status(transportFailure ? 503 : 401).json(
      apiErrorJson(API_ERROR_CODES.AUTH_AUTHENTICATION_FAILED, AUTH_AUTHENTICATION_FAILED_MESSAGE),
    );
  }
}

/**
 * Optional auth — attaches user info if token is present, but doesn't block.
 */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  req.userId = undefined;
  req.userEmail = undefined;

  const authHeader = req.headers.authorization;
  const hasBearer = authHeader?.startsWith('Bearer ') === true;

  if (!hasBearer) {
    next();
    return;
  }

  const token = authHeader!.slice(7);
  try {
    const { data, error } = await getSupabaseUserWithTimeout(token);
    if (error) {
      req.userId = null;
      req.userEmail = null;
      const transportFailure = isAuthTransportFailure(error);
      logger.debug('optionalAuth: bearer token rejected', {
        metric: 'optional_auth.bearer_failure',
        optional_auth_failure: true,
        failure_category: 'get_user_error',
        category: 'get_user_error',
        has_bearer: true,
        transport_failure: transportFailure,
        error: error.message,
      });
      if (transportFailure) {
        logger.warn('optionalAuth: transport failure validating bearer token', {
          error: error.message,
          transport_failure: true,
        });
      }
      next();
      return;
    }
    if (!data.user) {
      req.userId = null;
      req.userEmail = null;
      logger.debug('optionalAuth: no user for bearer token', {
        metric: 'optional_auth.bearer_failure',
        optional_auth_failure: true,
        failure_category: 'no_user',
        category: 'no_user',
        has_bearer: true,
      });
      next();
      return;
    }
    req.userId = data.user.id;
    req.userEmail = data.user.email ?? undefined;
  } catch (err) {
    req.userId = null;
    req.userEmail = null;
    const transportFailure = isAuthTransportFailure(err);
    logger.debug('optionalAuth: bearer validation threw', {
      metric: 'optional_auth.bearer_failure',
      optional_auth_failure: true,
      failure_category: 'exception',
      category: 'exception',
      has_bearer: true,
      transport_failure: transportFailure,
      error: err instanceof Error ? err.message : String(err),
    });
    if (transportFailure) {
      logger.warn('optionalAuth: transport failure during bearer verification', {
        error: err instanceof Error ? err.message : String(err),
        transport_failure: true,
      });
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
        title: REGISTRATION_GUEST_REGISTERED_NOTIFICATION_TITLE,
        message: registrationGuestRegisteredMessage(resolvedRole),
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
