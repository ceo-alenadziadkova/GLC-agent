import type { Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_AUDIT_ID_FORMAT_INVALID_MESSAGE,
  INTAKE_CREATE_LINK_FAILED_MESSAGE,
  INTAKE_AUDIT_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  createConsultantIntakeToken,
  fetchAuditOwnedByConsultant,
} from '../../../services/intake/intake-token.service.js';
import { buildIntakePublicClientUrl } from '../mappers/intake-http.mapper.js';

export async function postIntakeTokenController(req: AuthRequest, res: Response) {
  try {
    const audit_id = req.body.audit_id;
    const metadata =
      req.body.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
        ? (req.body.metadata as Record<string, unknown>)
        : {};

    if (audit_id != null && typeof audit_id !== 'string') {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_ID_FORMAT_INVALID, INTAKE_AUDIT_ID_FORMAT_INVALID_MESSAGE),
        );
      return;
    }

    if (audit_id) {
      const audit = await fetchAuditOwnedByConsultant(audit_id, req.userId!);
      if (!audit) {
        res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_NOT_FOUND, INTAKE_AUDIT_NOT_FOUND_MESSAGE));
        return;
      }
    }

    const row = await createConsultantIntakeToken({
      consultantUserId: req.userId!,
      auditId: audit_id ?? null,
      metadata,
    });

    if (!row) {
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_CREATE_LINK_FAILED, INTAKE_CREATE_LINK_FAILED_MESSAGE));
      return;
    }

    res.status(201).json({
      token: row.token,
      url: buildIntakePublicClientUrl(row.token),
      expires_at: row.expires_at,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.create_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.INTAKE_CREATE_LINK_FAILED, INTAKE_CREATE_LINK_FAILED_MESSAGE));
  }
}
