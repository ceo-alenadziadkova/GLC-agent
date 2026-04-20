import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_EXECUTION_PACK_API_ERROR_CODES } from '../config/strategy-execution-pack-api-error-codes';
import { ApiError } from '../data/api-error';

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

  switch (err.code) {
    case STRATEGY_EXECUTION_PACK_API_ERROR_CODES.STRATEGY_EXECUTION_PACK_DISABLED:
      return ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorDisabled;
    case STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_NOT_READY:
      return ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorNotReady;
    case STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID:
      return `${ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorPayloadInvalid}${detailSuffix}`;
    case STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_NOT_FOUND:
      return ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorNotFound;
    case STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_FAILED:
      if (err.status === 429) {
        return ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorRateLimited;
      }
      return `${ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorFailedGeneric}${detailSuffix}`;
    default:
      break;
  }

  if (err.status === 429) {
    return ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorRateLimited;
  }

  return `${err.message}${err.code ? ` (${err.code})` : ''}${detailSuffix}`.trim();
}
