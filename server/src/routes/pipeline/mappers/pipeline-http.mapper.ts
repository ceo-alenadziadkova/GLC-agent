import type { Response } from 'express';
import { apiErrorJson, type ApiErrorCode } from '../../../config/api-error-codes.js';

export function sendPipelineApiError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>,
) {
  const base = apiErrorJson(code, message);
  res.status(status).json(extra ? { ...base, ...extra } : base);
}
