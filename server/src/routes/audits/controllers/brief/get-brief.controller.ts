import type { Response } from 'express';
import type { AuthRequest } from '../../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_BRIEF_GET_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../../config/api-error-codes.js';
import { DEFAULT_AUDIT_COVERAGE_PACKAGE, type AuditExecutionPlan } from '../../../../types/audit.js';
import { logger } from '../../../../services/logger.js';
import { sendApiError } from '../../mappers/audits-http.mapper.js';
import { fetchAuditForBriefById } from '../../../../repositories/audits/audits.repository.js';
import { fetchBriefByAuditId } from '../../../../repositories/audits/audit-brief.repository.js';
import { canAccessAudit } from '../../../../services/audits/audits-access.service.js';
import {
  applyReconSuggestedAnswersToResponses,
  buildBriefReadPayload,
} from '../../../../services/audits/audits-brief.service.js';
import { normalizeExecutionPlan } from '../../../../services/execution-plan.js';

export async function getBriefController(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const { data: audit } = await fetchAuditForBriefById(id);
    if (!audit) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (!canAccessAudit(audit, req.userId!)) {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
      return;
    }
    const { data: brief } = await fetchBriefByAuditId(id);
    const recon = brief?.recon_prefills as Record<string, unknown> | undefined;
    const mergedResponses = applyReconSuggestedAnswersToResponses(
      (brief?.responses as Record<string, unknown>) ?? {},
      recon,
    );
    const briefForRead = brief ? { ...brief, responses: mergedResponses } : null;
    const payload = buildBriefReadPayload({ audit, brief: briefForRead, actorUserId: req.userId! });
    res.json({
      product_mode: audit.product_mode,
      coverage_package: normalizeExecutionPlan(
        (audit.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
        DEFAULT_AUDIT_COVERAGE_PACKAGE,
      ).coverage_package,
      brief: brief ?? null,
      ...payload,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.brief_get_failed', { component: 'audits', error: error.message, stack: error.stack });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_BRIEF_GET_FAILED, AUDITS_BRIEF_GET_FAILED_MESSAGE);
  }
}
