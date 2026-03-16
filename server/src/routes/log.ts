import type { Request, Response } from 'express';
import { Router } from 'express';

interface LogBody {
  level?: 'debug' | 'info' | 'warn' | 'error';
  source?: string;
  message?: string;
  context?: Record<string, unknown>;
  timestamp?: string;
}

export const logRouter = Router();

logRouter.post('/', (req: Request<unknown, unknown, LogBody>, res: Response) => {
  const { level = 'info', source = 'frontend', message = '', context, timestamp } = req.body ?? {};

  const prefix = `[LOG][${level.toUpperCase()}][${source}]`;
  const ts = timestamp ?? new Date().toISOString();

  // Структурированное логирование на бэкенде
  // eslint-disable-next-line no-console
  console.log(prefix, ts, message, context ?? {});

  res.status(204).end();
});

