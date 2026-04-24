export class ApiError extends Error {
  status: number;
  code?: string;
  /** Optional structured body from `sendApiError` (e.g. `{ detail: string }`). */
  details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
