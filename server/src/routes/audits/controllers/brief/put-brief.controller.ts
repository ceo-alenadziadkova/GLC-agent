import type { Response } from 'express';
import type { AuthRequest } from '../../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_BRIEF_RESPONSES_NOT_OBJECT_MESSAGE,
  AUDITS_BRIEF_SAVE_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../../config/api-error-codes.js';
import { logger } from '../../../../services/logger.js';
import { sendApiError } from '../../mappers/audits-http.mapper.js';
import { briefPutBodySchema } from '../../validators/audits-route-input.validator.js';
import { fetchAuditForBriefById } from '../../../../repositories/audits/audits.repository.js';
import { canAccessAudit } from '../../../../services/audits/audits-access.service.js';
import { fetchBriefVersionByAuditId } from '../../../../repositories/audits/audit-brief.repository.js';
import type { IntakeVersionTuple } from '../../../../types/audit.js';
import { saveBriefWithValidation } from '../../../../services/audits/audits-brief.service.js';
import { tryHandleBriefValidationError } from '../../mappers/brief-validation-error.mapper.js';

export async function putBriefController(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const parsedBody = briefPutBodySchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_BRIEF_RESPONSES_NOT_OBJECT,
        AUDITS_BRIEF_RESPONSES_NOT_OBJECT_MESSAGE,
      );
      return;
    }
    const { responses, collection_mode, intake_versions } = parsedBody.data;

    const { data: audit } = await fetchAuditForBriefById(id);
    if (!audit) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (!canAccessAudit(audit, req.userId!)) {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
      return;
    }

    const { data: versionRow } = await fetchBriefVersionByAuditId(id);
    const result = await saveBriefWithValidation({
      auditId: id,
      actorUserId: req.userId!,
      audit,
      responses,
      collectionModeRaw: collection_mode,
      intakeVersionsRaw: intake_versions,
      storedVersions: (versionRow?.intake_versions as IntakeVersionTuple | null) ?? null,
    });

    res.json({
      brief: result.brief,
      validation: result.validation,
      gates: result.gates,
      intakeProgress: result.gates.intakeProgress,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.brief_put_failed', { component: 'audits', error: error.message, stack: error.stack });
    if (tryHandleBriefValidationError(res, err)) return;
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_BRIEF_SAVE_FAILED, AUDITS_BRIEF_SAVE_FAILED_MESSAGE);
  }
}
