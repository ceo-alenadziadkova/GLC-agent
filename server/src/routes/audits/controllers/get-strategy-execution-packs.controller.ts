import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_STRATEGY_EXECUTION_PACK_LIST_FAILED_MESSAGE,
  STRATEGY_EXECUTION_PACK_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { isStrategyExecutionPackEnabled } from '../../../config/feature-flags.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  listStrategyExecutionPacks,
  StrategyExecutionPackError,
} from '../../../services/strategy/strategy-execution-pack.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getStrategyExecutionPacksController(req: AuthRequest, res: Response) {
  try {
    if (!isStrategyExecutionPackEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.STRATEGY_EXECUTION_PACK_DISABLED, STRATEGY_EXECUTION_PACK_DISABLED_MESSAGE);
      return;
    }
    const rows = await listStrategyExecutionPacks({ auditId: req.params.id as string, userId: req.userId! });
    res.json({ items: rows });
  } catch (err) {
    if (err instanceof StrategyExecutionPackError && err.code === 'NOT_FOUND') {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    const e = err as Error;
    logger.error('route.strategy_execution_packs_list_failed', { error: e.message, stack: e.stack });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_STRATEGY_EXECUTION_PACK_LIST_FAILED,
      AUDITS_STRATEGY_EXECUTION_PACK_LIST_FAILED_MESSAGE,
    );
  }
}
