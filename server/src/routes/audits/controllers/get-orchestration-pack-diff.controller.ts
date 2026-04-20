import type { Response } from 'express';
import { z } from 'zod';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { ORCHESTRATION_CONTRACT_POLICY } from '../../../config/orchestration-contract-policy.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

const QuerySchema = z.object({
  from_version: z.coerce.number().int().nonnegative(),
  to_version: z.coerce.number().int().positive(),
});

export async function getOrchestrationPackDiffController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE, {
        detail: parsed.error.flatten(),
      });
      return;
    }
    const { from_version, to_version } = parsed.data;
    if (to_version !== from_version + ORCHESTRATION_CONTRACT_POLICY.maxPackDiffVersionStep) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE, {
        detail: `Only adjacent version diff is supported (to_version must equal from_version + ${ORCHESTRATION_CONTRACT_POLICY.maxPackDiffVersionStep}).`,
      });
      return;
    }

    const auditId = req.params.id as string;
    const persisted = await fetchPersistedGlcOrchestrationPackForUser({
      auditId,
      userId: req.userId!,
    });
    if (persisted.status === 'not_found') {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (persisted.status === 'error') {
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    const matched = persisted.revision_history.find(
      item => item.from_version === from_version && item.to_version === to_version,
    );
    if (!matched) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    logger.info('route.orchestration_pack_diff_success', {
      component: 'audits',
      metric: 'orchestration_pack_diff.success',
      from_version,
      to_version,
    });
    res.json({ item: matched });
  } catch (err) {
    const error = err as Error;
    logger.error('route.orchestration_pack_diff_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
