import type { Response } from 'express';

import { API_ERROR_CODES } from '../../../config/api-error-codes.js';
import { isDirectorDeepDiveOnDemandEnabledForRequest } from '../../../config/orchestration-rollout-gates.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { getDirectorDeepDiveQuotaForDomain } from '../../../services/orchestration/director-deep-dive-quota.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getDirectorDeepDiveQuotaController(req: AuthRequest, res: Response) {
  if (!isDirectorDeepDiveOnDemandEnabledForRequest(req.userEmail)) {
    sendApiError(res, 503, API_ERROR_CODES.DIRECTOR_DEEP_DIVE_DISABLED, 'feature_disabled');
    return;
  }
  const auditId = req.params.id as string;
  const domainKey = req.params.domain as string;
  const state = await getDirectorDeepDiveQuotaForDomain({
    auditId,
    userId: req.userId!,
    domainKey,
  });
  if (!state) {
    sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, 'audit_or_plan_not_found');
    return;
  }
  res.status(200).json(state);
}
