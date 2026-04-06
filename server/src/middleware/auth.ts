import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase.js';
import { updateContext } from '../services/observability-context.js';
import { logger } from '../services/logger.js';

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
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email ?? undefined;
    req.userIsAnonymous = data.user.is_anonymous === true;
    updateContext({ userId: data.user.id });
    next();
  } catch {
    res.status(401).json({ error: 'Authentication failed' });
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
 * when the email is in CONSULTANT_EMAILS. It does not auto-downgrade an
 * existing consultant role from environment changes.
 *
 * Concurrency: parallel HTTP calls right after first login may both see "no row" and INSERT.
 * The loser gets unique_violation (23505); we refetch once and continue so role resolution
 * stays deterministic and guests/clients never share or cross user ids (pk is auth user id).
 */
export async function attachProfile(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const isAnon = req.userIsAnonymous === true;

    const consultantEmails = (process.env.CONSULTANT_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const emailLower = (req.userEmail ?? '').trim().toLowerCase();
    const intendedRole: UserRole =
      emailLower && consultantEmails.includes(emailLower) ? 'consultant' : 'client';

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
      res.status(500).json({ error: 'Failed to load user profile' });
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
          res.status(500).json({ error: 'Failed to create user profile' });
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
            res.status(500).json({ error: 'Failed to create user profile' });
            return;
          }
          existingProfile = winnerRow;
        } else if (!fallbackError && fallbackProfile) {
          req.userRole = 'guest';
          next();
          return;
        } else {
          res.status(500).json({ error: 'Failed to create user profile' });
          return;
        }
      } else {
        res.status(500).json({ error: 'Failed to create user profile' });
        return;
      }
    }

    if (!existingProfile) {
      res.status(500).json({ error: 'Failed to load user profile' });
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
            res.status(500).json({ error: 'Failed to update user profile' });
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
        res.status(500).json({ error: 'Failed to update user profile' });
        return;
      }
      resolvedRole = updatedProfile.role as UserRole;
    }

    if (!isAnon && resolvedRole !== 'consultant' && intendedRole === 'consultant') {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'consultant' })
        .eq('id', req.userId)
        .select('role')
        .single();

      if (updateError || !updatedProfile) {
        res.status(500).json({ error: 'Failed to update user profile' });
        return;
      }

      resolvedRole = updatedProfile.role as UserRole;
    }

    if (!resolvedRole) {
      res.status(500).json({ error: 'Failed to load user profile' });
      return;
    }

    req.userRole = resolvedRole;
    next();
  } catch {
    res.status(500).json({ error: 'Profile lookup failed' });
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
      res.status(403).json({ error: `Access denied. Required role: ${role}` });
      return;
    }
    next();
  };
}

/** Use after attachProfile. Blocks snapshot-only (anonymous) sessions from portal audit APIs. */
export function rejectGuestFromPortal(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole === 'guest' || req.userIsAnonymous === true) {
    res.status(403).json({ error: 'Complete registration to access this in the portal.' });
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
  res.status(403).json({ error: 'Use POST /api/log for registered accounts.' });
}
