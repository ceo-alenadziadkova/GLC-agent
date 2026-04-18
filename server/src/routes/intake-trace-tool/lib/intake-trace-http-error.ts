import type { ApiErrorCode } from '../../../config/api-error-codes.js';

export class IntakeTraceHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    public readonly messageText: string,
    public readonly details?: unknown,
  ) {
    super(messageText);
    this.name = 'IntakeTraceHttpError';
  }
}
