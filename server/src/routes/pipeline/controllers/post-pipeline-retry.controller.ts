import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_PHASE_REQUIRED_MESSAGE,
  PIPELINE_RETRY_FAILED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { sendPipelineApiError } from '../mappers/pipeline-http.mapper.js';
import {
  runPipelineRetry,
  schedulePipelineExecution,
  sendPipelineRetryNotifications,
} from '../../../services/pipeline-routes/pipeline-route.service.js';
import { pipelineAuditIdParamsSchema, pipelineRetryBodySchema } from '../validators/pipeline-route-input.validator.js';

export async function postPipelineRetryController(req: AuthRequest, res: Response) {
  try {
    const idParse = pipelineAuditIdParamsSchema.safeParse(req.params);
    if (!idParse.success) {
      sendPipelineApiError(res, 404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE);
      return;
    }

    const bodyParse = pipelineRetryBodySchema.safeParse(req.body);
    if (!bodyParse.success) {
      sendPipelineApiError(res, 400, API_ERROR_CODES.PIPELINE_PHASE_REQUIRED, PIPELINE_PHASE_REQUIRED_MESSAGE);
      return;
    }

    const { phase, disable_auto_remediate: disableRaw } = bodyParse.data;
    const disableAutoRemediate = Boolean(disableRaw);

    const result = await runPipelineRetry({
      auditId: idParse.data.id,
      userId: req.userId!,
      phase,
      disableAutoRemediate,
    });

    if (!result.ok) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    res.json(result.response);

    await sendPipelineRetryNotifications({
      auditId: idParse.data.id,
      actorUserId: req.userId!,
      phase,
    });

    void schedulePipelineExecution({
      auditId: idParse.data.id,
      action: 'retry',
      phase,
      disableAutoRemediate: result.disableAutoRemediate,
    });
  } catch (err) {
    logger.error('Pipeline retry route failed', { error: (err as Error).message });
    sendPipelineApiError(res, 500, API_ERROR_CODES.PIPELINE_RETRY_FAILED, PIPELINE_RETRY_FAILED_MESSAGE);
  }
}
