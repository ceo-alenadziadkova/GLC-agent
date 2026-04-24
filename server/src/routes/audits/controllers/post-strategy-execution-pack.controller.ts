import type { Response } from 'express';
import { z } from 'zod';

import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_STRATEGY_EXECUTION_PACK_FAILED_MESSAGE,
  AUDITS_STRATEGY_EXECUTION_PACK_NOT_READY_MESSAGE,
  AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID_MESSAGE,
  STRATEGY_EXECUTION_PACK_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { isStrategyExecutionPackEnabled } from '../../../config/feature-flags.js';
import {
  STRATEGY_EXECUTION_PACK_LIMITS,
  STRATEGY_EXECUTION_PATH_TYPES,
} from '../../../config/strategy-initiative-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  createStrategyExecutionPack,
  StrategyExecutionPackError,
} from '../../../services/strategy/strategy-execution-pack.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

const EP = STRATEGY_EXECUTION_PACK_LIMITS;

const pathChoice = z.enum([...STRATEGY_EXECUTION_PATH_TYPES] as [string, ...string[]]);

const BodySchema = z.object({
  initiative_ids: z.array(z.string().min(1)).min(1).max(EP.maxInitiativesPerRequest),
  selected_path_type: pathChoice.optional(),
});

function mapError(res: Response, err: StrategyExecutionPackError): void {
  switch (err.code) {
    case 'NOT_FOUND':
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    case 'NOT_READY':
      sendApiError(res, 409, API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_NOT_READY, AUDITS_STRATEGY_EXECUTION_PACK_NOT_READY_MESSAGE);
      return;
    case 'PAYLOAD_INVALID':
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID,
        AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID_MESSAGE,
        { detail: err.message },
      );
      return;
    case 'TOKEN_BUDGET':
      sendApiError(res, 429, API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_FAILED, AUDITS_STRATEGY_EXECUTION_PACK_FAILED_MESSAGE);
      return;
    case 'PERSIST_FAILED':
    case 'UPSTREAM':
    default:
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_FAILED, AUDITS_STRATEGY_EXECUTION_PACK_FAILED_MESSAGE);
  }
}

export async function postStrategyExecutionPackController(req: AuthRequest, res: Response) {
  try {
    if (!isStrategyExecutionPackEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.STRATEGY_EXECUTION_PACK_DISABLED, STRATEGY_EXECUTION_PACK_DISABLED_MESSAGE);
      return;
    }
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID,
        AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID_MESSAGE,
        { detail: parsed.error.message },
      );
      return;
    }
    const auditId = req.params.id as string;
    const pathType = parsed.data.selected_path_type;
    const result = await createStrategyExecutionPack({
      auditId,
      userId: req.userId!,
      initiativeIds: parsed.data.initiative_ids,
      selectedPathType: pathType === 'fast' || pathType === 'balanced' || pathType === 'scalable' ? pathType : undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof StrategyExecutionPackError) {
      mapError(res, err);
      return;
    }
    const e = err as Error;
    logger.error('route.strategy_execution_pack_failed', { error: e.message, stack: e.stack });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_FAILED, AUDITS_STRATEGY_EXECUTION_PACK_FAILED_MESSAGE);
  }
}
