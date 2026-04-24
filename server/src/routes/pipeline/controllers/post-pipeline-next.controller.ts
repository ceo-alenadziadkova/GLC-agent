import type { Response } from 'express';
import type { AuthRequest, UserRole } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_NEXT_FAILED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { sendPipelineApiError } from '../mappers/pipeline-http.mapper.js';
import {
  runPipelineNext,
  schedulePipelineExecution,
} from '../../../services/pipeline-routes/pipeline-route.service.js';
import { pipelineAuditIdParamsSchema, pipelineStartNextBodySchema } from '../validators/pipeline-route-input.validator.js';

export async function postPipelineNextController(req: AuthRequest, res: Response) {
  try {
    const idParse = pipelineAuditIdParamsSchema.safeParse(req.params);
    if (!idParse.success) {
      sendPipelineApiError(res, 404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE);
      return;
    }
    const bodyParse = pipelineStartNextBodySchema.safeParse(req.body);
    const disableAutoRemediate = bodyParse.success ? bodyParse.data.disable_auto_remediate : false;

    const result = await runPipelineNext({
      auditId: idParse.data.id,
      userId: req.userId!,
      role: req.userRole as UserRole,
      disableAutoRemediate,
    });

    if (!result.ok) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    res.json(result.response);
    if (result.outcome === 'running') {
      void schedulePipelineExecution({
        auditId: idParse.data.id,
        action: 'next',
        phase: result.nextPhase,
        disableAutoRemediate: result.disableAutoRemediate,
      });
    }
  } catch (err) {
    logger.error('Pipeline next route failed', { error: (err as Error).message });
    sendPipelineApiError(res, 500, API_ERROR_CODES.PIPELINE_NEXT_FAILED, PIPELINE_NEXT_FAILED_MESSAGE);
  }
}
