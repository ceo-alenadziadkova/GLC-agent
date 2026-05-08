import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { PlanBoardViewOpenedTelemetrySchema } from '../../../schemas/plan-board.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { emitPlanBoardViewOpened } from '../../../services/plan-board/plan-board-pipeline-events.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postPlanBoardViewOpenedController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const parsed = PlanBoardViewOpenedTelemetrySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_body');
      return;
    }

    const auditId = req.params.id as string;
    const access = await resolveAuditPlanBoardAccess({ auditId, userId: req.userId!, userRole: req.userRole });
    if (!access.ok) {
      sendApiError(
        res,
        access.reason === 'denied' ? 403 : 404,
        API_ERROR_CODES.AUDITS_NOT_FOUND,
        AUDITS_NOT_FOUND_MESSAGE,
      );
      return;
    }

    const role = req.userRole === 'client' ? ('client' as const) : ('consultant' as const);

    await emitPlanBoardViewOpened({
      auditId,
      payload: {
        role,
        pack_version: parsed.data.pack_version,
        has_pack: parsed.data.has_pack,
      },
    });

    res.status(204).end();
  } catch (err) {
    const error = err as Error;
    logger.error('route.plan_board_view_open_unhandled', { error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
