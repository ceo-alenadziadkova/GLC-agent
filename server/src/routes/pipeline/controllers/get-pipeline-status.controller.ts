import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_STATUS_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { loadPipelineStatus } from '../../../services/pipeline-routes/pipeline-route.service.js';
import { pipelineAuditIdParamsSchema } from '../validators/pipeline-route-input.validator.js';

export async function getPipelineStatusController(req: AuthRequest, res: Response) {
  try {
    const idParse = pipelineAuditIdParamsSchema.safeParse(req.params);
    if (!idParse.success) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    const result = await loadPipelineStatus({
      auditId: idParse.data.id,
      userId: req.userId!,
      viewerRole: req.userRole,
    });
    if (!result.ok) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    res.json(result.payload);
  } catch (err) {
    const e = err as Error;
    logger.error('route.pipeline_status_failed', { component: 'pipeline', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.PIPELINE_STATUS_FAILED, PIPELINE_STATUS_FAILED_MESSAGE));
  }
}
