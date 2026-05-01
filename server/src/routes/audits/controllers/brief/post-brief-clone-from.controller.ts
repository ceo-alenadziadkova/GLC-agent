import type { Response } from 'express';

import type { AuthRequest } from '../../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../../../config/api-error-codes.js';
import {
  AUDITS_BRIEF_CLONE_DISABLED_MESSAGE,
  AUDITS_BRIEF_CLONE_FAILED_MESSAGE,
  AUDITS_BRIEF_CLONE_FORBIDDEN_MESSAGE,
  AUDITS_BRIEF_CLONE_PAYLOAD_INVALID_MESSAGE,
  AUDITS_BRIEF_CLONE_SOURCE_EMPTY_MESSAGE,
} from '../../../../config/api-user-messages.en.js';
import { isBriefCloneFromAuditEnabled } from '../../../../config/feature-flags.js';
import { logger } from '../../../../services/logger.js';
import { sendApiError } from '../../mappers/audits-http.mapper.js';
import { briefCloneFromBodySchema } from '../../validators/audits-route-input.validator.js';
import {
  BriefCloneError,
  cloneBriefResponsesFromAuditService,
} from '../../../../services/audits/audits-brief-clone.service.js';

export async function postBriefCloneFromController(req: AuthRequest, res: Response) {
  try {
    if (!isBriefCloneFromAuditEnabled()) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_CLONE_DISABLED, AUDITS_BRIEF_CLONE_DISABLED_MESSAGE));
      return;
    }
    const targetId = req.params.id as string;
    const parsed = briefCloneFromBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_CLONE_PAYLOAD_INVALID, AUDITS_BRIEF_CLONE_PAYLOAD_INVALID_MESSAGE));
      return;
    }
    const sourceId = parsed.data.source_audit_id;
    if (sourceId === targetId) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_CLONE_PAYLOAD_INVALID, AUDITS_BRIEF_CLONE_PAYLOAD_INVALID_MESSAGE));
      return;
    }

    const out = await cloneBriefResponsesFromAuditService({
      targetAuditId: targetId,
      sourceAuditId: sourceId,
      actorUserId: req.userId!,
    });
    res.json(out);
  } catch (err) {
    if (err instanceof BriefCloneError) {
      if (err.code === 'AUDITS_NOT_FOUND') {
        sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
        return;
      }
      if (err.code === 'ACCESS_DENIED') {
        sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
        return;
      }
      if (err.code === 'CLIENT_MISMATCH') {
        res
          .status(403)
          .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_CLONE_FORBIDDEN, AUDITS_BRIEF_CLONE_FORBIDDEN_MESSAGE));
        return;
      }
      if (err.code === 'SOURCE_EMPTY') {
        res
          .status(400)
          .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_CLONE_SOURCE_EMPTY, AUDITS_BRIEF_CLONE_SOURCE_EMPTY_MESSAGE));
        return;
      }
    }
    logger.error('route.brief_clone_from_failed', { component: 'audits', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_CLONE_FAILED, AUDITS_BRIEF_CLONE_FAILED_MESSAGE));
  }
}
