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
 * Also handles first-login profile creation, and upgrades to 'consultant' if
 * the user's email is in the CONSULTANT_EMAILS env variable.
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

    // Upsert profile (handles first login + role upgrade/downgrade)
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert(
        { id: req.userId, role: intendedRole },
        { onConflict: 'id' }
      )
      .select('role')
      .single();

    if (error || !profile) {
      res.status(500).json({ error: 'Failed to load user profile' });
      return;
    }

    req.userRole = profile.role as UserRole;
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
