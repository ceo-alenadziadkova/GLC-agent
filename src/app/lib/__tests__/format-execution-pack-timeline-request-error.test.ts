import { describe, expect, it } from 'vitest';

import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_EXECUTION_PACK_API_ERROR_CODES } from '../../config/strategy-execution-pack-api-error-codes';
import { ApiError } from '../../data/api-error';
import { formatExecutionPackTimelineRequestError } from '../format-execution-pack-timeline-request-error';

describe('formatExecutionPackTimelineRequestError', () => {
  it('maps disabled feature code to portal copy', () => {
    expect(
      formatExecutionPackTimelineRequestError(
        new ApiError('x', 403, STRATEGY_EXECUTION_PACK_API_ERROR_CODES.STRATEGY_EXECUTION_PACK_DISABLED),
      ),
    ).toBe(ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorDisabled);
  });

  it('maps not-ready code to portal copy', () => {
    expect(
      formatExecutionPackTimelineRequestError(
        new ApiError('x', 409, STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_NOT_READY),
      ),
    ).toBe(ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorNotReady);
  });

  it('appends validation detail for payload invalid', () => {
    expect(
      formatExecutionPackTimelineRequestError(
        new ApiError('x', 400, STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID, {
          detail: 'too_many_initiatives',
        }),
      ),
    ).toBe(`${ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorPayloadInvalid} (too_many_initiatives)`);
  });

  it('uses rate-limit copy for 429 on failed code', () => {
    expect(
      formatExecutionPackTimelineRequestError(
        new ApiError('x', 429, STRATEGY_EXECUTION_PACK_API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_FAILED),
      ),
    ).toBe(ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorRateLimited);
  });

  it('falls back to message for unknown codes', () => {
    expect(formatExecutionPackTimelineRequestError(new ApiError('Custom', 418, 'TEAPOT'))).toBe('Custom (TEAPOT)');
  });
});
