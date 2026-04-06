/**
 * Maps snapshot HTTP API error payloads to user-visible strings (shared test surface).
 */

export type SnapshotApiErrorPayload = {
  error?: string;
  code?: string;
  retry_after_seconds?: number;
  retry_after_minutes?: number;
  retry_after_hours?: number;
  limit?: number;
  remaining?: number;
  snapshot_token?: string;
};

export function toRetrySeconds(payload: SnapshotApiErrorPayload): number | null {
  if (typeof payload.retry_after_seconds === 'number' && payload.retry_after_seconds > 0) {
    return payload.retry_after_seconds;
  }
  if (typeof payload.retry_after_minutes === 'number' && payload.retry_after_minutes > 0) {
    return payload.retry_after_minutes * 60;
  }
  if (typeof payload.retry_after_hours === 'number' && payload.retry_after_hours > 0) {
    return payload.retry_after_hours * 60 * 60;
  }
  return null;
}

export function formatWaitTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} h`;
}

export function toUiErrorMessage(
  status: number,
  payload: SnapshotApiErrorPayload,
  fallback: string,
): string {
  const apiMessage = typeof payload.error === 'string' && payload.error.trim() ? payload.error.trim() : null;
  const retrySeconds = toRetrySeconds(payload);

  if (status === 401 || status === 403) {
    return 'Session expired or invalid. Refresh the page and sign in again.';
  }
  if (status === 429) {
    const wait = retrySeconds ? ` Please retry in about ${formatWaitTime(retrySeconds)}.` : '';
    if (apiMessage) return `${apiMessage}${wait}`;
    return `Too many requests.${wait}`;
  }
  if (status >= 500) {
    return 'Server error while starting analysis. Please try again in a minute.';
  }
  return apiMessage ?? fallback;
}
