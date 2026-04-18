import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_REVIEW_APPROVE_FAILED_MESSAGE,
  apiErrorJson,
  pipelinePhaseOutOfRangeMessage,
} from '../../../config/api-error-codes.js';
import { REQUEST_FIELD_LIMITS } from '../../../config/request-field-limits.js';
import { PIPELINE_MAX_PHASE_INDEX, PIPELINE_MIN_PHASE } from '../../../config/pipeline-phases.js';
import { runReviewApprove } from '../../../services/pipeline-routes/pipeline-route.service.js';
import { pipelineAuditIdParamsSchema, pipelinePhasePathParamSchema, pipelineReviewApproveBodySchema } from '../validators/pipeline-route-input.validator.js';

export async function postReviewApproveController(req: AuthRequest, res: Response) {
  try {
    const idParse = pipelineAuditIdParamsSchema.safeParse(req.params);
    if (!idParse.success) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    const phaseParse = pipelinePhasePathParamSchema.safeParse(req.params.phase);
    if (!phaseParse.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.PIPELINE_PHASE_OUT_OF_RANGE,
          pipelinePhaseOutOfRangeMessage(PIPELINE_MIN_PHASE, PIPELINE_MAX_PHASE_INDEX),
        ),
      );
      return;
    }

    const bodyParse = pipelineReviewApproveBodySchema.safeParse(req.body ?? {});
    const body = bodyParse.success ? bodyParse.data : {};

    const maxNotes = REQUEST_FIELD_LIMITS.reviewGateNotesMax;
    const consultant_notes = body.consultant_notes;
    const interview_notes = body.interview_notes;
    const sanitizedConsultantNotes = consultant_notes
      ? String(consultant_notes).trim().slice(0, maxNotes) || null
      : null;
    const sanitizedInterviewNotes = interview_notes
      ? String(interview_notes).trim().slice(0, maxNotes) || null
      : null;

    const result = await runReviewApprove({
      auditId: idParse.data.id,
      userId: req.userId!,
      afterPhase: phaseParse.data,
      consultantNotes: sanitizedConsultantNotes,
      interviewNotes: sanitizedInterviewNotes,
    });

    if (!result.ok) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    res.json(result.response);
  } catch (err) {
    const e = err as Error;
    logger.error('route.review_approve_failed', { component: 'pipeline', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PIPELINE_REVIEW_APPROVE_FAILED,
          PIPELINE_REVIEW_APPROVE_FAILED_MESSAGE,
        ),
      );
  }
}
