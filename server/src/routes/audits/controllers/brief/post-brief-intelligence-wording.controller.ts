import type { Response } from 'express';
import type { AuthRequest } from '../../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../../../config/api-error-codes.js';
import {
  INTAKE_INTELLIGENCE_SNAPSHOT_FAILED_MESSAGE,
  INTAKE_PREBRIEF_INCOMPLETE_MESSAGE,
} from '../../../../config/api-user-messages.en.js';
import { arePreBriefSlotsSatisfied } from '../../../../services/brief-validator.js';
import { logger } from '../../../../services/logger.js';
import { sendApiError } from '../../mappers/audits-http.mapper.js';
import { fetchAuditForBriefById } from '../../../../repositories/audits/audits.repository.js';
import { fetchBriefByAuditId } from '../../../../repositories/audits/audit-brief.repository.js';
import { canAccessAudit } from '../../../../services/audits/audits-access.service.js';
import { applyReconSuggestedAnswersToResponses } from '../../../../services/audits/audits-brief.service.js';
import { runIntakeIntelligenceWordingForAuditId } from '../../../../services/intake/intake-intelligence-wording.service.js';

/**
 * POST /api/audits/:id/brief/intelligence-wording
 * Second LLM pass: B1 display label overrides for unanswered follow-up bank ids. Call after confirm + `PUT /brief`.
 */
export async function postBriefIntelligenceWordingController(req: AuthRequest, res: Response) {
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
    if (!brief) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    const recon = brief.recon_prefills as Record<string, unknown> | undefined;
    const responses = applyReconSuggestedAnswersToResponses(
      (brief.responses as Record<string, unknown>) ?? {},
      recon,
    );
    if (!arePreBriefSlotsSatisfied(responses)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_PREBRIEF_INCOMPLETE, INTAKE_PREBRIEF_INCOMPLETE_MESSAGE));
      return;
    }

    const out = await runIntakeIntelligenceWordingForAuditId(id);
    if (out == null) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    res.json({
      label_overrides: out.label_overrides,
      hint_overrides: out.hint_overrides,
      option_display_overrides: out.option_display_overrides,
      kpi: out.kpi,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('brief.intelligence_wording_exception', {
      component: 'audits',
      error: e.message,
      stack: e.stack,
    });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.INTAKE_INTELLIGENCE_SNAPSHOT_FAILED,
          INTAKE_INTELLIGENCE_SNAPSHOT_FAILED_MESSAGE,
        ),
      );
  }
}
