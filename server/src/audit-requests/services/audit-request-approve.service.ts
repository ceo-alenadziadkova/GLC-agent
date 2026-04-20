import type { AuthRequest } from '../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDIT_INITIALIZATION_FAILED_MESSAGE,
  AUDIT_REQUEST_APPROVE_CLAIM_CONFLICT_MESSAGE,
  AUDIT_REQUEST_APPROVE_IN_PROGRESS_MESSAGE,
  AUDIT_REQUEST_APPROVE_SEED_FAILED_MESSAGE,
  AUDIT_REQUEST_NOT_FOUND_MESSAGE,
  AUDIT_REQUEST_SUBMIT_WRONG_STATUS_MESSAGE,
  AUDITS_DPA_REQUIRED_MESSAGE,
} from '../../config/api-error-codes.js';
import {
  getStoredIdempotentResponse,
  storeIdempotentResponse,
} from '../../lib/idempotency.js';
import { idempotencyPostAuditRequestApproveKey } from '../../config/api-http-paths.js';
import {
  claimAuditRequestForApprove,
  deleteAuditById,
  getAuditRequestById,
  updateAuditRequestById,
} from '../repositories/audit-request.repository.js';
import { AuditRequestHttpError } from '../mappers/audit-request-error.mapper.js';
import { isApprovableAuditRequestStatus } from '../domain/audit-request-status-policy.js';
import { coveragePackageFromAuditRequestProductMode, persistedProductModeForExecutionPlan } from '../../lib/audit-coverage-bridge.js';
import { defaultExecutionPlanForPackage } from '../../services/execution-plan.js';
import { createAuditWithChildren } from '../../services/audit-initialization.js';
import { isDpaAcceptanceEffectivelyTrue } from '../../services/legal-consent.service.js';
import { isNoPublicWebsiteUrl } from '../../config/no-public-website.js';
import { isAuditChildRowsInitRollbackError } from '../../lib/audit-init-error.js';
import { logger } from '../../services/logger.js';
import { initialIntakeResponsesFromAuditRequest } from '../domain/intake-brief.mapper.js';
import { saveBriefResponses } from '../../services/brief-validator.js';
import { REQUEST_FIELD_LIMITS } from '../../config/request-field-limits.js';
import { emitStructuredNotification } from '../../services/notifications.js';
import {
  AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_MESSAGE,
  AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_TITLE,
} from '../../config/route-notification-messages.js';
import { buildPortalAuditRoute } from '../../config/route-notification-paths.js';

export async function approveAuditRequestCommand(req: AuthRequest, id: string, consultantNote?: string) {
  const idempotent = await getStoredIdempotentResponse(req, idempotencyPostAuditRequestApproveKey(id), req.body);
  if (idempotent.replay) {
    return { replay: idempotent.replay };
  }

  const dpaOk = await isDpaAcceptanceEffectivelyTrue(req.userId!);
  if (!dpaOk) {
    throw new AuditRequestHttpError(403, API_ERROR_CODES.AUDITS_DPA_REQUIRED, AUDITS_DPA_REQUIRED_MESSAGE);
  }

  const { data: requestRow, error: fetchError } = await getAuditRequestById(id);
  if (fetchError || !requestRow) {
    throw new AuditRequestHttpError(404, API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE);
  }
  if (!isApprovableAuditRequestStatus(requestRow.status as string)) {
    throw new AuditRequestHttpError(
      400,
      API_ERROR_CODES.AUDIT_REQUEST_SUBMIT_WRONG_STATUS,
      AUDIT_REQUEST_SUBMIT_WRONG_STATUS_MESSAGE,
      { current_status: requestRow.status as string },
    );
  }

  const { data: claimedRows, error: claimError } = await claimAuditRequestForApprove(id);
  if (claimError) throw claimError;

  if ((!claimedRows || claimedRows.length === 0) && requestRow.status === 'submitted') {
    throw new AuditRequestHttpError(
      409,
      API_ERROR_CODES.AUDIT_REQUEST_APPROVE_CLAIM_CONFLICT,
      AUDIT_REQUEST_APPROVE_CLAIM_CONFLICT_MESSAGE,
    );
  }
  if (requestRow.status === 'under_review') {
    throw new AuditRequestHttpError(
      409,
      API_ERROR_CODES.AUDIT_REQUEST_APPROVE_IN_PROGRESS,
      AUDIT_REQUEST_APPROVE_IN_PROGRESS_MESSAGE,
    );
  }

  const coveragePackage = coveragePackageFromAuditRequestProductMode(requestRow.product_mode as string);
  const executionPlan = defaultExecutionPlanForPackage(coveragePackage);
  const persistedMode = persistedProductModeForExecutionPlan(executionPlan);

  let audit: { id: string; status: string };
  try {
    audit = await createAuditWithChildren({
      ownerUserId: req.userId!,
      clientId: requestRow.client_id as string,
      company_url: requestRow.url as string,
      company_name: null,
      industry: requestRow.industry ?? null,
      mode: persistedMode,
      origin: 'request_queue',
      execution_plan: executionPlan,
      no_public_website: isNoPublicWebsiteUrl(String(requestRow.url ?? '')),
    });
  } catch (error) {
    if (isAuditChildRowsInitRollbackError(error)) {
      throw new AuditRequestHttpError(500, API_ERROR_CODES.AUDIT_INITIALIZATION_FAILED, AUDIT_INITIALIZATION_FAILED_MESSAGE);
    }
    throw error;
  }

  try {
    await saveBriefResponses(
      audit.id,
      initialIntakeResponsesFromAuditRequest({
        url: requestRow.url as string,
        industry: (requestRow.industry as string | null) ?? null,
        brief_snapshot: requestRow.brief_snapshot,
      }),
    );
  } catch (seedError) {
    await deleteAuditById(audit.id);
    logger.error('Approve request failed intake brief seed', {
      audit_id: audit.id,
      request_id: id,
      error: (seedError as Error).message,
    });
    throw new AuditRequestHttpError(
      500,
      API_ERROR_CODES.AUDIT_REQUEST_APPROVE_SEED_FAILED,
      AUDIT_REQUEST_APPROVE_SEED_FAILED_MESSAGE,
    );
  }

  const { data: updatedRequest, error: updateError } = await updateAuditRequestById(id, {
    audit_id: audit.id,
    status: 'approved',
    consultant_note: consultantNote ? String(consultantNote).slice(0, REQUEST_FIELD_LIMITS.consultantNoteMax) : null,
  });
  if (updateError || !updatedRequest) {
    await deleteAuditById(audit.id);
    throw updateError ?? new Error('Failed to update approved request');
  }

  const payload = { audit_request: updatedRequest, audit: { id: audit.id, status: audit.status } };
  await storeIdempotentResponse(
    req,
    idempotencyPostAuditRequestApproveKey(id),
    idempotent.key,
    idempotent.hash,
    { statusCode: 201, payload },
    audit.id,
  );

  await emitStructuredNotification({
    category: 'request',
    event: 'audit_request_approved',
    priority: 'low',
    audience: 'user',
    userId: requestRow.client_id as string,
    auditId: audit.id,
    title: AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_TITLE,
    message: AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_MESSAGE,
    route: buildPortalAuditRoute(audit.id),
    payload: {
      request_id: id,
      audit_id: audit.id,
      status: 'approved',
      actor_role: 'consultant',
    },
  });

  return { payload };
}
