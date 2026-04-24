import type { Response } from 'express';
import { API_ERROR_CODES } from '../../../config/api-error-codes.js';
import { isDirectorDeepDiveOnDemandEnabledForRequest } from '../../../config/orchestration-rollout-gates.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { getDirectorDeepDiveJobStatus } from '../../../services/orchestration/run-director-deep-dive.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getDirectorDeepDiveStatusController(req: AuthRequest, res: Response) {
  if (!isDirectorDeepDiveOnDemandEnabledForRequest(req.userEmail)) {
    sendApiError(res, 503, API_ERROR_CODES.DIRECTOR_DEEP_DIVE_DISABLED, 'feature_disabled');
    return;
  }
  const status = await getDirectorDeepDiveJobStatus({
    auditId: req.params.id as string,
    jobId: req.params.jobId as string,
    userId: req.userId!,
  });
  if (!status) {
    sendApiError(res, 404, API_ERROR_CODES.DIRECTOR_DEEP_DIVE_JOB_NOT_FOUND, 'deep_dive_job_not_found');
    return;
  }
  res.status(200).json(status);
}
