import type { ApiErrorCode } from '../../config/api-error-codes.js';

export class AuditRequestHttpError extends Error {
  statusCode: number;
  code: ApiErrorCode;
  details?: Record<string, unknown>;

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
