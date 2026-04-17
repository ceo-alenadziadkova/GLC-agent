import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_QUALITY_GATE_FETCH_FAILED_MESSAGE,
  apiErrorJson,
  pipelinePhaseOutOfRangeMessage,
} from '../../../config/api-error-codes.js';
import { PIPELINE_MAX_PHASE_INDEX, PIPELINE_MIN_PHASE } from '../../../config/pipeline-phases.js';
import { loadQualityGateData } from '../../../services/pipeline-routes/pipeline-route.service.js';
import { pipelineAuditIdParamsSchema, pipelinePhasePathParamSchema } from '../validators/pipeline-route-input.validator.js';

export async function getQualityGateController(req: AuthRequest, res: Response) {
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

    const result = await loadQualityGateData({
      auditId: idParse.data.id,
      userId: req.userId!,
      phase: phaseParse.data,
    });
    if (!result.ok) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    res.json(result.data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.quality_gate_failed', { component: 'pipeline', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PIPELINE_QUALITY_GATE_FETCH_FAILED,
          PIPELINE_QUALITY_GATE_FETCH_FAILED_MESSAGE,
        ),
      );
  }
}
