import { ApiError } from '../data/api-error';
import { API_ERROR_UI_COPY } from '../config/api-error-ui-copy.en';

const API_ERROR_CODE_MESSAGES: Record<string, string> = API_ERROR_UI_COPY.byCode as Record<string, string>;

function fallbackMessage(status: number, fallback: string): string {
  if (status === 401 || status === 403) {
    return API_ERROR_CODE_MESSAGES.AUTH_NOT_AUTHENTICATED;
  }
  if (status === 429) {
    return API_ERROR_CODE_MESSAGES.GENERAL_API_RATE_LIMITED;
  }
  return fallback;
}

export function toUiApiErrorMessage(error: unknown, fallback = API_ERROR_UI_COPY.fallback): string {
  const fallbackText = fallback || API_ERROR_UI_COPY.fallback;
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message.trim() ? error.message : fallbackText;
  }
  if (error.code && API_ERROR_CODE_MESSAGES[error.code]) {
    return API_ERROR_CODE_MESSAGES[error.code];
  }
  return fallbackMessage(error.status, error.message || fallbackText);
}
