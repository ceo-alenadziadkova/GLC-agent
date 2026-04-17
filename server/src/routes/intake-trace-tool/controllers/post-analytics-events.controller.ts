import type { Response } from 'express';
import {
  API_ERROR_CODES,
  INTAKE_TRACE_ANALYTICS_ACCEPT_FAILED_MESSAGE,
  INTAKE_TRACE_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
  INTAKE_TRACE_ANALYTICS_STORE_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { intakeTraceToolAnalyticsBatchSchema } from '../../../schemas/intake-trace-tool.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { handleIntakeTraceControllerError } from '../lib/with-intake-trace-error.js';
import { storeIntakeTraceAnalytics } from '../services/intake-trace-analytics.service.js';

export async function postAnalyticsEventsController(req: AuthRequest, res: Response) {
  try {
    const parsed = intakeTraceToolAnalyticsBatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_ANALYTICS_PAYLOAD_INVALID,
          INTAKE_TRACE_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }

    let received = 0;
    try {
      const result = await storeIntakeTraceAnalytics(parsed.data, req.userId!);
      received = result.received;
    } catch (storeError) {
      const error = storeError as Error;
      logger.error('intake_trace_tool.analytics_insert_failed', { error: error.message });
      res.status(500).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_ANALYTICS_STORE_FAILED,
          INTAKE_TRACE_ANALYTICS_STORE_FAILED_MESSAGE,
        ),
      );
      return;
    }

    res.status(200).json({ ok: true as const, received });
  } catch (err) {
    handleIntakeTraceControllerError(res, err, 'intake_trace_tool.analytics_failed', {
      status: 500,
      code: API_ERROR_CODES.INTAKE_TRACE_ANALYTICS_ACCEPT_FAILED,
      message: INTAKE_TRACE_ANALYTICS_ACCEPT_FAILED_MESSAGE,
    });
  }
}
