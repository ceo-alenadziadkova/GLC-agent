import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase.js';

export type UserRole = 'consultant' | 'client';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
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
    req.userEmail = data.user.email;
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
        req.userEmail = data.user.email;
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
 */
export async function attachProfile(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId || !req.userEmail) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    // Determine intended role from env allowlist
    const consultantEmails = (process.env.CONSULTANT_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const intendedRole: UserRole = consultantEmails.includes(req.userEmail.toLowerCase())
      ? 'consultant'
      : 'client';

    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      res.status(500).json({ error: 'Failed to load user profile' });
      return;
    }

    // First login: create profile from allowlist-derived role.
    if (!existingProfile) {
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ id: req.userId, role: intendedRole })
        .select('role')
        .single();

      if (createError || !createdProfile) {
        res.status(500).json({ error: 'Failed to create user profile' });
        return;
      }

      req.userRole = createdProfile.role as UserRole;
      next();
      return;
    }

    let resolvedRole = existingProfile.role as UserRole;

    // One-way promotion only: never auto-downgrade consultants.
    if (resolvedRole !== 'consultant' && intendedRole === 'consultant') {
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
