import type { Response } from 'express';

import {
  API_ERROR_CODES,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PLATFORM_STRATEGY_REPAIRED_JSON_APPLY_FAILED_MESSAGE,
  PLATFORM_STRATEGY_REPAIRED_JSON_BODY_INVALID_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import { PipelineOrchestrator } from '../../../services/pipeline/orchestrator/PipelineOrchestrator.js';
import { canManagePlatformSettings } from '../../../lib/platform-admin.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { pipelineAuditIdParamsSchema } from '../../pipeline/validators/pipeline-route-input.validator.js';
import { safeParseStrategyRepairedJsonApplyBody } from '../validators/platform.schemas.js';
import { writePlatformAdminOnly } from '../http/platform-errors.js';

export async function postPlatformStrategyRepairedJsonApplyController(req: AuthRequest, res: Response) {
  try {
    if (!(await canManagePlatformSettings(req.userId!))) {
      writePlatformAdminOnly(res);
      return;
    }

    const idParse = pipelineAuditIdParamsSchema.safeParse(req.params);
    if (!idParse.success) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    const bodyParse = safeParseStrategyRepairedJsonApplyBody(req.body);
    if (!bodyParse.success) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PLATFORM_PAYLOAD_INVALID, PLATFORM_STRATEGY_REPAIRED_JSON_BODY_INVALID_MESSAGE));
      return;
    }

    const orchestrator = new PipelineOrchestrator(idParse.data.id);
    const result = await orchestrator.applyRepairedStrategyToolJson(bodyParse.data.strategy_tool_input, {
      forceReplaceCompletedAudit: Boolean(bodyParse.data.force_replace_completed_audit),
    });

    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }

    res.status(200).json({
      ok: true,
      audit_id: idParse.data.id,
      overall_score: result.overall_score,
      normalization_mutation_codes: [...result.normalization_mutation_codes],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('route.platform_strategy_repaired_json_apply_failed', { component: 'platform', error: msg });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.PLATFORM_STRATEGY_REPAIRED_JSON_APPLY_FAILED, PLATFORM_STRATEGY_REPAIRED_JSON_APPLY_FAILED_MESSAGE));
  }
}
