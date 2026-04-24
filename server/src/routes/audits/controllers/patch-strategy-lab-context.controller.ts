import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_STRATEGY_LAB_CONTEXT_FAILED_MESSAGE,
  AUDITS_STRATEGY_LAB_CONTEXT_PAYLOAD_INVALID_MESSAGE,
} from '../../../config/api-error-codes.js';
import { StrategyLabContextPatchSchema } from '../../../config/strategy-lab-context-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { patchStrategyLabContext, StrategyLabContextError } from '../../../services/strategy/strategy-lab-context.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function patchStrategyLabContextController(req: AuthRequest, res: Response) {
  try {
    const parsed = StrategyLabContextPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_STRATEGY_LAB_CONTEXT_PAYLOAD_INVALID,
        AUDITS_STRATEGY_LAB_CONTEXT_PAYLOAD_INVALID_MESSAGE,
        { detail: parsed.error.message },
      );
      return;
    }
    const bodyKeys = Object.keys(parsed.data);
    if (bodyKeys.length === 0) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_STRATEGY_LAB_CONTEXT_PAYLOAD_INVALID,
        AUDITS_STRATEGY_LAB_CONTEXT_PAYLOAD_INVALID_MESSAGE,
        { detail: 'empty_patch' },
      );
      return;
    }

    const auditId = req.params.id as string;
    const result = await patchStrategyLabContext({
      auditId,
      userId: req.userId!,
      patch: parsed.data,
    });
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof StrategyLabContextError) {
      if (err.code === 'NOT_FOUND') {
        sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
        return;
      }
      if (err.code === 'STRATEGY_ROW_MISSING') {
        sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
        return;
      }
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_STRATEGY_LAB_CONTEXT_FAILED, AUDITS_STRATEGY_LAB_CONTEXT_FAILED_MESSAGE);
      return;
    }
    const e = err as Error;
    logger.error('route.strategy_lab_context_failed', { error: e.message, stack: e.stack });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_STRATEGY_LAB_CONTEXT_FAILED, AUDITS_STRATEGY_LAB_CONTEXT_FAILED_MESSAGE);
  }
}
