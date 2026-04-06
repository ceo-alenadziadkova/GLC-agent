import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../services/logger.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '30'), 10) || 30, 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const unreadOnly = String(req.query.unreadOnly ?? 'false') === 'true';

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('route.notifications_list_failed', { component: 'notifications', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to list notifications' });
  }
});

notificationsRouter.get('/unread-count', async (req: AuthRequest, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ unread: count ?? 0 });
  } catch (err) {
    const e = err as Error;
    logger.error('route.notifications_unread_failed', { component: 'notifications', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

notificationsRouter.post('/:id/read', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.userId!)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    const e = err as Error;
    logger.error('route.notifications_mark_read_failed', { component: 'notifications', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', req.userId!)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    const e = err as Error;
    logger.error('route.notifications_read_all_failed', { component: 'notifications', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});
