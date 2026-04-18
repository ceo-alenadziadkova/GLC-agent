import type { Response } from 'express';
import { apiErrorJson } from '../../../config/api-error-codes.js';
import type { ApiErrorCode } from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import { IntakeTraceHttpError } from './intake-trace-http-error.js';

type ErrorPayload = {
  status: number;
  code: ApiErrorCode;
  message: string;
};

export function handleIntakeTraceControllerError(
  res: Response,
  err: unknown,
  logEvent: string,
  fallback: ErrorPayload,
): void {
  if (err instanceof IntakeTraceHttpError) {
    res.status(err.status).json(apiErrorJson(err.code, err.messageText, err.details));
    return;
  }

  const error = err as Error;
  logger.error(logEvent, { error: error.message, stack: error.stack });
  res.status(fallback.status).json(apiErrorJson(fallback.code, fallback.message));
}
