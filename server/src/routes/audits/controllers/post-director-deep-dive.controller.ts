import type { Response } from 'express';
import { API_ERROR_CODES } from '../../../config/api-error-codes.js';
import { DIRECTOR_DEEP_DIVE_QUEUE } from '../../../config/director-deep-dive-queue.js';
import { isDirectorDeepDiveOnDemandEnabled } from '../../../config/feature-flags.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { DirectorDeepDiveRequestSchema } from '../../../schemas/director-deep-dive-request.js';
import { enqueueDirectorDeepDive } from '../../../services/orchestration/run-director-deep-dive.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postDirectorDeepDiveController(req: AuthRequest, res: Response) {
  if (!isDirectorDeepDiveOnDemandEnabled()) {
    sendApiError(res, 503, API_ERROR_CODES.DIRECTOR_DEEP_DIVE_DISABLED, 'feature_disabled');
    return;
  }
  const parsed = DirectorDeepDiveRequestSchema.safeParse({
    ...req.body,
    audit_id: req.params.id,
    domain_key: req.params.domain,
  });
  if (!parsed.success) {
    sendApiError(res, 400, API_ERROR_CODES.DIRECTOR_DEEP_DIVE_PAYLOAD_INVALID, 'Invalid deep-dive payload', {
      detail: parsed.error.message,
    });
    return;
  }
  const queued = await enqueueDirectorDeepDive({
    auditId: req.params.id as string,
    userId: req.userId!,
    domainKey: req.params.domain as string,
    idempotencyKey: parsed.data.idempotency_key,
    goals: parsed.data.client_context.goals,
    constraints: parsed.data.client_context.constraints,
    requestedMode: parsed.data.operating_mode,
    requestedSubAgentIds: parsed.data.sub_agent_ids,
  });
  if (queued.status === 'quota_exceeded') {
    sendApiError(res, 409, API_ERROR_CODES.DIRECTOR_DEEP_DIVE_QUOTA_EXCEEDED, 'quota_exceeded');
    return;
  }
  if (queued.status === 'idempotency_mismatch') {
    sendApiError(res, 409, API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH, 'idempotency_payload_mismatch');
    return;
  }
  if (queued.status === 'token_budget_exceeded') {
    sendApiError(
      res,
      409,
      API_ERROR_CODES.DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_EXCEEDED,
      'token_budget_exceeded',
    );
    return;
  }
  res.status(202).json({
    job_id: queued.job_id,
    status: 'queued' as const,
    estimated_duration_minutes: DIRECTOR_DEEP_DIVE_QUEUE.estimatedDurationMinutes,
  });
}
