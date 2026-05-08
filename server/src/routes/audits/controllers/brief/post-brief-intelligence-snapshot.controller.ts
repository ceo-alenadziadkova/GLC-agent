import type { Response } from 'express';
import type { AuthRequest } from '../../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../../../config/api-error-codes.js';
import {
  INTAKE_EARLY_CAPTURE_DISABLED_MESSAGE,
  INTAKE_EARLY_CAPTURE_FORBIDDEN_MESSAGE,
  INTAKE_EARLY_CAPTURE_INCOMPLETE_MESSAGE,
  INTAKE_INTELLIGENCE_SNAPSHOT_FAILED_MESSAGE,
  INTAKE_PREBRIEF_INCOMPLETE_MESSAGE,
} from '../../../../config/api-user-messages.en.js';
import { arePreBriefSlotsSatisfied } from '../../../../services/brief-validator.js';
import { areEarlyBriefCaptureSlotsSatisfied } from '@glc/intake-core';
import { isBriefEarlyIntelligenceSnapshotEnabled } from '../../../../config/feature-flags.js';
import { logger } from '../../../../services/logger.js';
import { sendApiError } from '../../mappers/audits-http.mapper.js';
import { fetchAuditForBriefById } from '../../../../repositories/audits/audits.repository.js';
import { fetchBriefByAuditId } from '../../../../repositories/audits/audit-brief.repository.js';
import { canAccessAudit } from '../../../../services/audits/audits-access.service.js';
import { applyReconSuggestedAnswersToResponses } from '../../../../services/audits/audits-brief.service.js';
import { runIntakeIntelligenceSnapshot } from '../../../../services/intake/intake-intelligence-snapshot.service.js';
import { fetchCollectedDataRowsForAudit } from '../../../../repositories/audits/collected-data-for-audit.repository.js';
import { getLighthouseSummaryForIntelligenceSnapshot } from '../../../../services/client-project/client-project-collected-enrichment.js';

/**
 * POST /api/audits/:id/brief/intelligence-snapshot
 * Auth consultant/client with access; same response shape as `POST /api/intake/:token/intelligence-snapshot`.
 * Reads **persisted** `intake_brief` responses (call `PUT /brief` first so local wizard state is saved).
 */
export async function postBriefIntelligenceSnapshotController(req: AuthRequest, res: Response) {
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
    const responses = applyReconSuggestedAnswersToResponses(
      (brief?.responses as Record<string, unknown>) ?? {},
      recon,
    );

    const body = req.body;
    const bodyObj = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
    const earlyCapture = bodyObj?.early_capture === true;
    const skipLlm = Boolean(bodyObj?.skip_llm === true);

    if (earlyCapture) {
      if (!isBriefEarlyIntelligenceSnapshotEnabled()) {
        res
          .status(403)
          .json(apiErrorJson(API_ERROR_CODES.INTAKE_EARLY_CAPTURE_DISABLED, INTAKE_EARLY_CAPTURE_DISABLED_MESSAGE));
        return;
      }
      if (audit.client_id != null) {
        res
          .status(403)
          .json(apiErrorJson(API_ERROR_CODES.INTAKE_EARLY_CAPTURE_FORBIDDEN, INTAKE_EARLY_CAPTURE_FORBIDDEN_MESSAGE));
        return;
      }
      if (!areEarlyBriefCaptureSlotsSatisfied(responses)) {
        res
          .status(400)
          .json(apiErrorJson(API_ERROR_CODES.INTAKE_EARLY_CAPTURE_INCOMPLETE, INTAKE_EARLY_CAPTURE_INCOMPLETE_MESSAGE));
        return;
      }
    } else if (!arePreBriefSlotsSatisfied(responses)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_PREBRIEF_INCOMPLETE, INTAKE_PREBRIEF_INCOMPLETE_MESSAGE));
      return;
    }

    const { rows: collectedRows, error: collectedErr } = await fetchCollectedDataRowsForAudit(id);
    if (collectedErr) {
      logger.warn('brief.intelligence_snapshot_collected_data_read_failed', {
        component: 'audits',
        auditId: id,
        message: collectedErr.message,
      });
    }
    const lighthouseSummary = getLighthouseSummaryForIntelligenceSnapshot(collectedRows);

    const out = await runIntakeIntelligenceSnapshot({
      responses,
      auditId: id,
      skipLlm,
      intelligenceLlmMode: 'understanding',
      lighthouseSummary: lighthouseSummary && Object.keys(lighthouseSummary).length > 0 ? lighthouseSummary : null,
    });

    res.json({
      questions: out.questions,
      question_ids: out.question_ids,
      case_keys: out.case_keys,
      next_recommended: out.next_recommended,
      deterministic_question_ids: out.deterministic_question_ids,
      narrative: out.narrative,
      inferred_preview: out.inferred_preview,
      merge_would_apply_count: out.merge_would_apply_count,
      snapshot_no_new_inferred: out.snapshot_no_new_inferred,
      label_overrides: out.label_overrides,
      f2_source: out.f2_source,
      kpi: out.kpi,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('brief.intelligence_snapshot_exception', {
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
