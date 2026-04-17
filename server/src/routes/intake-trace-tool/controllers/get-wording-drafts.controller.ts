import type { Response } from 'express';
import {
  API_ERROR_CODES,
  INTAKE_TRACE_WORDING_LOAD_FAILED_MESSAGE,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { handleIntakeTraceControllerError } from '../lib/with-intake-trace-error.js';
import { loadWordingDraftMaps } from '../services/intake-trace-wording.service.js';

export async function getWordingDraftsController(req: AuthRequest, res: Response) {
  try {
    const { drafts, published } = await loadWordingDraftMaps(req.userId!);
    res.json({ ok: true as const, drafts, published });
  } catch (err) {
    handleIntakeTraceControllerError(res, err, 'intake_trace_tool.wording_drafts_get_failed', {
      status: 500,
      code: API_ERROR_CODES.INTAKE_TRACE_WORDING_LOAD_FAILED,
      message: INTAKE_TRACE_WORDING_LOAD_FAILED_MESSAGE,
    });
  }
}
