import type { Response } from 'express';
import {
  API_ERROR_CODES,
  INTAKE_TRACE_WORDING_PAYLOAD_INVALID_MESSAGE,
  INTAKE_TRACE_WORDING_SAVE_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { intakeTraceToolWordingDraftsPutSchema } from '../../../schemas/intake-trace-tool.js';
import { handleIntakeTraceControllerError } from '../lib/with-intake-trace-error.js';
import { saveWordingDrafts } from '../services/intake-trace-wording.service.js';

export async function putWordingDraftsController(req: AuthRequest, res: Response) {
  try {
    const parsed = intakeTraceToolWordingDraftsPutSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_TRACE_WORDING_PAYLOAD_INVALID,
          INTAKE_TRACE_WORDING_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }

    const { drafts, published } = await saveWordingDrafts({
      userId: req.userId!,
      drafts: parsed.data.drafts,
      replaceAll: parsed.data.replace_all,
    });
    res.json({ ok: true as const, drafts, published });
  } catch (err) {
    handleIntakeTraceControllerError(res, err, 'intake_trace_tool.wording_drafts_put_exception', {
      status: 500,
      code: API_ERROR_CODES.INTAKE_TRACE_WORDING_SAVE_FAILED,
      message: INTAKE_TRACE_WORDING_SAVE_FAILED_MESSAGE,
    });
  }
}
