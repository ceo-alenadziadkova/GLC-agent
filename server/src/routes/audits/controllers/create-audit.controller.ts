import type { Response } from 'express';
import type { AuthRequest, UserRole } from '../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDIT_INITIALIZATION_FAILED_MESSAGE,
  AUDITS_COMPANY_URL_INVALID_MESSAGE,
  AUDITS_COMPANY_URL_REQUIRED_MESSAGE,
  AUDITS_CREATE_FAILED_MESSAGE,
  AUDITS_DPA_REQUIRED_MESSAGE,
  AUDITS_FORBIDDEN_MESSAGE,
  AUDITS_OMIT_COMPANY_URL_WHEN_NO_PUBLIC_WEBSITE_MESSAGE,
  IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  getStoredIdempotentResponse,
  isIdempotencyPayloadConflictError,
  storeIdempotentResponse,
} from '../../../lib/idempotency.js';
import { idempotencyPostAuditsCreateKey } from '../../../config/api-http-paths.js';
import { isAuditChildRowsInitRollbackError } from '../../../lib/audit-init-error.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';
import {
  createAuditEntity,
  resolveCreateAuditCompanyUrl,
  resolveCreateAuditMode,
  resolveCreateAuditOwnership,
} from '../../../services/audits/audits-create.service.js';
import { isDpaAcceptanceEffectivelyTrue } from '../../../services/legal-consent.service.js';

export async function createAuditController(req: AuthRequest, res: Response) {
  try {
    const role = req.userRole as UserRole | undefined;
    if (role !== 'consultant' && role !== 'client') {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_FORBIDDEN, AUDITS_FORBIDDEN_MESSAGE);
      return;
    }

    if (role === 'consultant') {
      const dpaOk = await isDpaAcceptanceEffectivelyTrue(req.userId!);
      if (!dpaOk) {
        sendApiError(res, 403, API_ERROR_CODES.AUDITS_DPA_REQUIRED, AUDITS_DPA_REQUIRED_MESSAGE);
        return;
      }
    }

    const { company_url, company_name, industry, execution_plan, no_public_website } = req.body;
    const modeResolution = resolveCreateAuditMode(execution_plan);
    const idempotent = await getStoredIdempotentResponse(req, idempotencyPostAuditsCreateKey(), req.body);
    if (idempotent.replay) {
      res.status(idempotent.replay.statusCode).json(idempotent.replay.payload);
      return;
    }

    const urlResolution = await resolveCreateAuditCompanyUrl({
      noPublicWebsite: no_public_website === true,
      companyUrl: company_url,
    });
    if (!urlResolution.ok) {
      if (urlResolution.kind === 'omit_company_url') {
        sendApiError(
          res,
          400,
          API_ERROR_CODES.AUDITS_OMIT_COMPANY_URL_WHEN_NO_PUBLIC_WEBSITE,
          AUDITS_OMIT_COMPANY_URL_WHEN_NO_PUBLIC_WEBSITE_MESSAGE,
        );
        return;
      }
      if (urlResolution.kind === 'company_url_required') {
        sendApiError(res, 400, API_ERROR_CODES.AUDITS_COMPANY_URL_REQUIRED, AUDITS_COMPANY_URL_REQUIRED_MESSAGE);
        return;
      }
      if (urlResolution.kind === 'company_url_invalid') {
        sendApiError(res, 400, API_ERROR_CODES.AUDITS_COMPANY_URL_INVALID, AUDITS_COMPANY_URL_INVALID_MESSAGE);
        return;
      }
      sendApiError(res, 400, urlResolution.code, urlResolution.message);
      return;
    }

    const ownership = await resolveCreateAuditOwnership(role, req.userId!);
    if (!ownership.ok) {
      sendApiError(res, ownership.statusCode, ownership.code, ownership.error);
      return;
    }

    const audit = await createAuditEntity({
      ownerUserId: ownership.ownerUserId,
      clientId: ownership.clientId,
      companyUrl: urlResolution.url,
      companyName: company_name,
      industry,
      mode: modeResolution.mode,
      executionPlan: modeResolution.executionPlan,
      noPublicWebsite: no_public_website === true,
    });

    const payload = { id: audit.id, status: audit.status };
    await storeIdempotentResponse(
      req,
      idempotencyPostAuditsCreateKey(),
      idempotent.key,
      idempotent.hash,
      { statusCode: 201, payload },
      audit.id,
    );
    res.status(201).json(payload);
  } catch (err) {
    if (isIdempotencyPayloadConflictError(err)) {
      sendApiError(
        res,
        409,
        API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH,
        IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
      );
      return;
    }
    if (isAuditChildRowsInitRollbackError(err)) {
      logger.error('Create audit: child row initialization failed', { error: (err as Error).message });
      sendApiError(
        res,
        500,
        API_ERROR_CODES.AUDIT_INITIALIZATION_FAILED,
        AUDIT_INITIALIZATION_FAILED_MESSAGE,
      );
      return;
    }
    logger.error('Create audit route failed', { error: (err as Error).message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_CREATE_FAILED, AUDITS_CREATE_FAILED_MESSAGE);
  }
}
