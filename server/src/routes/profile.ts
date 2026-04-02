import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, attachProfile, type AuthRequest } from '../middleware/auth.js';
import { updateContext } from '../services/observability-context.js';
import { supabase } from '../services/supabase.js';

const patchProfileSchema = z.object({
  full_name: z.string().trim().max(200).nullable().optional(),
});

export const profileRouter = Router();

profileRouter.get('/', requireAuth, attachProfile, async (req: AuthRequest, res) => {
  updateContext({ userId: req.userId });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', req.userId)
    .single();

  if (error) {
    res.status(500).json({ error: 'Failed to load user profile' });
    return;
  }

  res.json({
    id: req.userId,
    role: req.userRole,
    email: req.userEmail,
    full_name: profile?.full_name ?? null,
  });
});

profileRouter.patch('/', requireAuth, attachProfile, async (req: AuthRequest, res) => {
  updateContext({ userId: req.userId });

  const parsed = patchProfileSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid profile payload' });
    return;
  }

  const normalizedFullName = (() => {
    if (parsed.data.full_name === undefined || parsed.data.full_name === null) {
      return null;
    }
    const trimmed = parsed.data.full_name.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: normalizedFullName })
    .eq('id', req.userId);

  if (error) {
    res.status(500).json({ error: 'Failed to update user profile' });
    return;
  }

  res.json({
    id: req.userId,
    role: req.userRole,
    email: req.userEmail,
    full_name: normalizedFullName,
  });
});
