import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
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
