import type { Response } from 'express';
import { apiErrorJson, type ApiErrorCode } from '../../../config/api-error-codes.js';

export function sendApiError(res: Response, status: number, code: ApiErrorCode, message: string, details?: unknown) {
  res.status(status).json(apiErrorJson(code, message, details));
}
