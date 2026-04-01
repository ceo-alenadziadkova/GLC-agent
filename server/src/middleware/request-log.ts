import type { NextFunction, Request, Response } from 'express';
import { logger } from '../services/logger.js';
import { redactRequestPath } from '../lib/redact-log-path.js';

function resolvePath(req: Request): string {
  const fromRoute = `${req.baseUrl ?? ''}${req.path ?? ''}`;
  const raw = fromRoute || (req.originalUrl?.split('?')[0] ?? '');
  return redactRequestPath(raw);
}

/**
 * One structured line per HTTP request (on response finish). Uses same trace/user fields as logger.
 */
export function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const path = resolvePath(req);
    if (path === '/api/health' && res.statusCode < 400) {
      return;
    }
    const duration_ms = Date.now() - start;
    logger.info('http.request', {
      method: req.method,
      path,
      status: res.statusCode,
      duration_ms,
    });
  });
  next();
}
