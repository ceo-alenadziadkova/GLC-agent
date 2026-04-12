import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, rejectGuestFromPortal, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../services/logger.js';
import {
  API_ERROR_CODES,
  NOTIFICATIONS_LIST_FAILED_MESSAGE,
  NOTIFICATIONS_MARK_ALL_FAILED_MESSAGE,
  NOTIFICATIONS_MARK_READ_FAILED_MESSAGE,
  NOTIFICATIONS_NOT_FOUND_MESSAGE,
  NOTIFICATIONS_UNREAD_COUNT_FAILED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';
import {
  NOTIFICATIONS_LIST_DEFAULT_LIMIT,
  NOTIFICATIONS_LIST_MAX_LIMIT,
  NOTIFICATIONS_LIST_MIN_LIMIT,
} from '../config/route-query-limits.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.use(attachProfile);
notificationsRouter.use(rejectGuestFromPortal);

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(
      Math.max(
        parseInt(String(req.query.limit ?? String(NOTIFICATIONS_LIST_DEFAULT_LIMIT)), 10) ||
          NOTIFICATIONS_LIST_DEFAULT_LIMIT,
        NOTIFICATIONS_LIST_MIN_LIMIT,
      ),
      NOTIFICATIONS_LIST_MAX_LIMIT,
    );
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
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.NOTIFICATIONS_LIST_FAILED, NOTIFICATIONS_LIST_FAILED_MESSAGE));
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
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.NOTIFICATIONS_UNREAD_COUNT_FAILED, NOTIFICATIONS_UNREAD_COUNT_FAILED_MESSAGE),
      );
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
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.NOTIFICATIONS_NOT_FOUND, NOTIFICATIONS_NOT_FOUND_MESSAGE));
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    const e = err as Error;
    logger.error('route.notifications_mark_read_failed', { component: 'notifications', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.NOTIFICATIONS_MARK_READ_FAILED, NOTIFICATIONS_MARK_READ_FAILED_MESSAGE),
      );
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
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.NOTIFICATIONS_MARK_ALL_FAILED, NOTIFICATIONS_MARK_ALL_FAILED_MESSAGE),
      );
  }
});
