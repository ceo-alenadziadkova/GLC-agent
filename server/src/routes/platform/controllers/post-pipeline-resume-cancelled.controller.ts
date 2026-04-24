import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_RESUME_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { runPipelineResumeFromCancelled } from '../../../services/pipeline-routes/use-cases/resume-pipeline-from-cancelled.use-case.js';
import { pipelineAuditIdParamsSchema } from '../../pipeline/validators/pipeline-route-input.validator.js';

export async function postPlatformPipelineResumeCancelledController(req: AuthRequest, res: Response) {
  try {
    const idParse = pipelineAuditIdParamsSchema.safeParse(req.params);
    if (!idParse.success) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    const result = await runPipelineResumeFromCancelled({
      auditId: idParse.data.id,
      actorUserId: req.userId!,
    });

    if (!result.ok) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    res.json(result.response);
  } catch (err) {
    const e = err as Error;
    logger.error('route.platform_pipeline_resume_cancelled_failed', { component: 'platform', error: e.message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.PIPELINE_RESUME_FAILED, PIPELINE_RESUME_FAILED_MESSAGE));
  }
}
