import type { Response } from 'express';
import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { logIngestLimiter } from '../middleware/rate-limit.js';
import { logger } from '../services/logger.js';

interface LogBody {
  level?: 'debug' | 'info' | 'warn' | 'error';
  source?: string;
  message?: string;
  context?: Record<string, unknown>;
  timestamp?: string;
}

export const logRouter = Router();

logRouter.post('/', requireAuth, logIngestLimiter, (req: AuthRequest, res: Response) => {
  const body = (req.body ?? {}) as LogBody;
  const level = body.level ?? 'info';
  const source = String(body.source ?? 'frontend').slice(0, 64);
  const message = String(body.message ?? '').slice(0, 4000);
  const context = body.context && typeof body.context === 'object' ? body.context : undefined;
  const timestamp = body.timestamp ?? new Date().toISOString();

  logger.info('Frontend log', {
    level,
    source,
    timestamp,
    message,
    user_id: req.userId,
    context: context ?? {},
  });

  res.status(204).end();
});
