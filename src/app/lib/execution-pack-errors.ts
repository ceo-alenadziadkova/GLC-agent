import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_EXECUTION_PACK_API_ERROR_CODES } from '../config/strategy-execution-pack-api-error-codes';
import { ApiError } from '../data/api-error';

/** User-facing messages keyed by stable server error codes (DoD: no ad-hoc strings in formatters). */
export const EXECUTION_PACK_TIMELINE_ERROR_MESSAGE_BY_CODE: Partial<Record<string, string>> = {
  [STRATEGY_EXECUTION_PACK_API_ERROR_CODES.STRATEGY_EXECUTION_PACK_DISABLED]:
    ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorDisabled,
  [STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_NOT_READY]:
    ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorNotReady,
  [STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID]:
    ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorPayloadInvalid,
  [STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_NOT_FOUND]:
    ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorNotFound,
  [STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_FAILED]:
    ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorFailedGeneric,
};

function extractDetail(details: unknown): string {
  if (details && typeof details === 'object' && details !== null && 'detail' in details) {
    return String((details as { detail?: unknown }).detail ?? '');
  }
  return '';
}

/** User-facing toast line for failed timeline “Detail pack” requests. */
export function formatExecutionPackTimelineRequestError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    if (err instanceof Error) return err.message;
    return ORCHESTRATION_UI_COPY.executionPackFromTimelineFailed;
  }

  const detail = extractDetail(err.details);
  const detailSuffix = detail ? ` (${detail})` : '';

  const mapped = err.code ? EXECUTION_PACK_TIMELINE_ERROR_MESSAGE_BY_CODE[err.code] : undefined;
  if (mapped) {
    if (err.code === STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID) {
      return `${mapped}${detailSuffix}`;
    }
    if (err.code === STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_FAILED) {
      if (err.status === 429) {
        return ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorRateLimited;
      }
      return `${mapped}${detailSuffix}`;
    }
    return mapped;
  }

  if (err.status === 429) {
    return ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorRateLimited;
  }

  return `${err.message}${err.code ? ` (${err.code})` : ''}${detailSuffix}`.trim();
}
