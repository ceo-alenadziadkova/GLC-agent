import type { Response } from 'express';
import type { AuthRequest, UserRole } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_STOP_FAILED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { sendPipelineApiError } from '../mappers/pipeline-http.mapper.js';
import { runPipelineStop } from '../../../services/pipeline-routes/pipeline-route.service.js';
import { pipelineAuditIdParamsSchema } from '../validators/pipeline-route-input.validator.js';

export async function postPipelineStopController(req: AuthRequest, res: Response) {
  try {
    const idParse = pipelineAuditIdParamsSchema.safeParse(req.params);
    if (!idParse.success) {
      sendPipelineApiError(res, 404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE);
      return;
    }

    const result = await runPipelineStop({
      auditId: idParse.data.id,
      userId: req.userId!,
      role: req.userRole as UserRole,
    });

    if (!result.ok) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    res.json(result.response);
  } catch (err) {
    logger.error('Pipeline stop route failed', { error: (err as Error).message });
    sendPipelineApiError(res, 500, API_ERROR_CODES.PIPELINE_STOP_FAILED, PIPELINE_STOP_FAILED_MESSAGE);
  }
}
