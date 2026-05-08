import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_INTELLIGENCE_SNAPSHOT_FAILED_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_PREBRIEF_INCOMPLETE_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { arePreBriefSlotsSatisfied } from '../../../services/brief-validator.js';
import { logger } from '../../../services/logger.js';
import { runIntakeIntelligenceSnapshot } from '../../../services/intake/intake-intelligence-snapshot.service.js';
import { runIntakeIntelligenceWordingForResponses } from '../../../services/intake/intake-intelligence-wording.service.js';
import {
  intakeLinkExpired,
  isIntakeTokenFormatValid,
  normalizePublicIntakeRouteTokenParam,
} from '../../../services/intake/intake-token-guards.js';
import { fetchIntakeTokenRowForPublicLoad } from '../../../services/intake/intake-token.service.js';

export async function postIntakeIntelligenceSnapshotController(req: Request, res: Response) {
  try {
    const token = normalizePublicIntakeRouteTokenParam(req.params.token);
    if (!isIntakeTokenFormatValid(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }

    const row = await fetchIntakeTokenRowForPublicLoad(token);
    if (!row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }

    if (intakeLinkExpired(row.expires_at as string)) {
      res.status(410).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_EXPIRED, INTAKE_LINK_EXPIRED_MESSAGE));
      return;
    }

    const responses = (row.responses as Record<string, unknown>) ?? {};
    if (!arePreBriefSlotsSatisfied(responses)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_PREBRIEF_INCOMPLETE, INTAKE_PREBRIEF_INCOMPLETE_MESSAGE));
      return;
    }

    const body = req.body;
    const skipLlm = Boolean(
      body && typeof body === 'object' && !Array.isArray(body) && body.skip_llm === true,
    );

    const out = await runIntakeIntelligenceSnapshot({
      responses,
      auditId: (row.audit_id as string | null) ?? null,
      intakeTokenId: row.id as string,
      skipLlm,
    });
    const wording = await runIntakeIntelligenceWordingForResponses({
      responses,
      productMode: 'full',
      collectionMode: 'pre_brief',
      surface: 'client_form',
      auditId: (row.audit_id as string | null) ?? null,
      intakeTokenId: row.id as string,
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
      label_overrides: {
        ...out.label_overrides,
        ...wording.label_overrides,
      },
      f2_source: out.f2_source,
      kpi: out.kpi,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.intelligence_snapshot_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.INTAKE_INTELLIGENCE_SNAPSHOT_FAILED, INTAKE_INTELLIGENCE_SNAPSHOT_FAILED_MESSAGE),
      );
  }
}
