import type { Response } from 'express';
import {
  API_ERROR_CODES,
  INTAKE_TRACE_PUBLICATION_LOG_FAILED_MESSAGE,
  INTAKE_TRACE_PUBLICATION_LOG_QUERY_INVALID_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { intakeTraceToolPublicationLogQuerySchema } from '../../../schemas/intake-trace-tool.js';
import { handleIntakeTraceControllerError } from '../lib/with-intake-trace-error.js';
import { loadPublicationLog } from '../services/intake-trace-publication-log.service.js';

export async function getWordingPublicationLogController(req: AuthRequest, res: Response) {
  try {
    const parsed = intakeTraceToolPublicationLogQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_PUBLICATION_LOG_QUERY_INVALID,
          INTAKE_TRACE_PUBLICATION_LOG_QUERY_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }

    const { entries } = await loadPublicationLog(req.userId!, parsed.data.limit);
    res.json({ ok: true as const, entries });
  } catch (err) {
    handleIntakeTraceControllerError(res, err, 'intake_trace_tool.wording_publication_log_exception', {
      status: 500,
      code: API_ERROR_CODES.INTAKE_TRACE_PUBLICATION_LOG_FAILED,
      message: INTAKE_TRACE_PUBLICATION_LOG_FAILED_MESSAGE,
    });
  }
}
