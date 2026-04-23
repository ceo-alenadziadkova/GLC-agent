import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_RESPONSES_REQUIRED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { intakeResponsesSchemaInvalidMessage } from '../../../config/api-user-messages.en.js';
import { isDiagnosticIntakePilotEnabled, isIntakeNextQuestionEndpointEnabled } from '../../../config/feature-flags.js';
import { BriefResponsesSchema } from '../../../schemas/intake-brief.js';
import {
  defaultProductModeFromBody,
  runDeterministicIntakeNextQuestion,
} from '../../../services/intake/intake-next-question.service.js';
import { intakeLinkExpired, isIntakeTokenFormatValid, normalizePublicIntakeRouteTokenParam } from '../../../services/intake/intake-token-guards.js';
import { logger } from '../../../services/logger.js';
import { fetchIntakeTokenRowForRespond } from '../../../services/intake/intake-token.service.js';
import type { IntakeBriefCollectionMode, IntakeVersionTuple, ProductMode } from '../../../types/audit.js';
import type { IntakeSurface } from '@glc/intake-core';
import { INTERNAL_SERVER_ERROR_MESSAGE } from '../../../config/api-user-messages.en.js';

/**
 * F1: deterministic next-question / stop (no LLM). F2: LLM validation + shadow mode — future work (see ADR-INTAKE-NEXT-QUESTION-V1).
 */
export async function postIntakeNextQuestionController(req: Request, res: Response) {
  try {
    if (!isIntakeNextQuestionEndpointEnabled() || !isDiagnosticIntakePilotEnabled()) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, 'Not found'));
      return;
    }

    const token = normalizePublicIntakeRouteTokenParam(req.params.token);
    if (!isIntakeTokenFormatValid(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }

    const row = await fetchIntakeTokenRowForRespond(token);
    if (!row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }

    if (intakeLinkExpired(row.expires_at)) {
      res.status(410).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_EXPIRED, INTAKE_LINK_EXPIRED_MESSAGE));
      return;
    }

    const body = req.body?.responses;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_RESPONSES_REQUIRED, INTAKE_RESPONSES_REQUIRED_MESSAGE));
      return;
    }

    const parsed = BriefResponsesSchema.safeParse(body);
    if (!parsed.success) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_RESPONSES_SCHEMA_INVALID,
            intakeResponsesSchemaInvalidMessage(parsed.error.message),
          ),
        );
      return;
    }

    const productMode: ProductMode = defaultProductModeFromBody(req.body?.productMode);
    const collectionMode =
      typeof req.body?.collectionMode === 'string'
        ? (req.body.collectionMode as IntakeBriefCollectionMode)
        : 'pre_brief';
    const surface =
      typeof req.body?.surface === 'string' ? (req.body.surface as IntakeSurface) : 'client_form';
    const tupleRaw = req.body?.intakeVersionTuple;
    const intakeVersionTuple: IntakeVersionTuple | null =
      tupleRaw && typeof tupleRaw === 'object' && !Array.isArray(tupleRaw)
        ? (tupleRaw as IntakeVersionTuple)
        : null;

    const result = await runDeterministicIntakeNextQuestion({
      responses: parsed.data as Record<string, unknown>,
      productMode,
      collectionMode,
      surface,
      intakeVersionTuple,
      auditId: row.audit_id,
    });

    res.status(200).json({
      ok: true,
      action: result.decision.action,
      questionId: result.decision.questionId,
      reason: result.decision.reason,
      source: result.decision.source,
      caseKeys: result.caseKeys,
    });
  } catch (err) {
    logger.error('intake.next_question_failed', { err: err instanceof Error ? err.message : String(err) });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR_MESSAGE));
  }
}
