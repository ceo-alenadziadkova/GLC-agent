import type { Response } from 'express';
import {
  API_ERROR_CODES,
  INTAKE_TRACE_PUBLISH_FAILED_MESSAGE,
  INTAKE_TRACE_PUBLISH_PAYLOAD_INVALID_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { intakeTraceToolWordingPublishSchema } from '../../../schemas/intake-trace-tool.js';
import { handleIntakeTraceControllerError } from '../lib/with-intake-trace-error.js';
import { publishWordingDrafts } from '../services/intake-trace-wording.service.js';

export async function postWordingPublishController(req: AuthRequest, res: Response) {
  try {
    const parsed = intakeTraceToolWordingPublishSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_PUBLISH_PAYLOAD_INVALID,
          INTAKE_TRACE_PUBLISH_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }

    const result = await publishWordingDrafts({
      userId: req.userId!,
      questionIds: parsed.data.question_ids,
    });
    res.json({ ok: true as const, ...result });
  } catch (err) {
    handleIntakeTraceControllerError(res, err, 'intake_trace_tool.wording_publish_exception', {
      status: 500,
      code: API_ERROR_CODES.INTAKE_TRACE_PUBLISH_FAILED,
      message: INTAKE_TRACE_PUBLISH_FAILED_MESSAGE,
    });
  }
}
