import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_SAVE_RESPONSES_FAILED_MESSAGE,
  apiErrorJson,
  intakeResponsesSchemaInvalidMessage,
} from '../../../config/api-error-codes.js';
import { isDiagnosticIntakePilotEnabled } from '../../../config/feature-flags.js';
import { logger } from '../../../services/logger.js';
import { recordIntakeIntelligenceKpiEvent } from '../../../services/intake/intake-intelligence-kpi.service.js';
import {
  intakeLinkExpired,
  isIntakeTokenFormatValid,
  normalizePublicIntakeRouteTokenParam,
} from '../../../services/intake/intake-token-guards.js';
import { fetchIntakeTokenRowForRespond } from '../../../services/intake/intake-token.service.js';

const KPI_KINDS = ['question_shown', 'drop_off'] as const;

type KpiKind = (typeof KPI_KINDS)[number];

function parseKpiBody(body: unknown): { kind: KpiKind; questionId?: string; clientSessionId?: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const rec = body as Record<string, unknown>;
  const kind = rec.event ?? rec.kind;
  if (typeof kind !== 'string' || !KPI_KINDS.includes(kind as KpiKind)) return null;
  const questionId = typeof rec.question_id === 'string' ? rec.question_id.trim() : undefined;
  const clientSessionId =
    typeof rec.client_session_id === 'string' ? rec.client_session_id.trim().slice(0, 128) : undefined;
  if (kind === 'question_shown' && (!questionId || questionId.length === 0)) {
    return null;
  }
  return { kind: kind as KpiKind, questionId, clientSessionId };
}

export async function postIntakeIntelligenceKpiController(req: Request, res: Response) {
  try {
    if (!isDiagnosticIntakePilotEnabled()) {
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

    const parsed = parseKpiBody(req.body);
    if (!parsed) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_RESPONSES_SCHEMA_INVALID,
            intakeResponsesSchemaInvalidMessage('invalid intelligence KPI payload'),
          ),
        );
      return;
    }

    const result = await recordIntakeIntelligenceKpiEvent({
      auditId: row.audit_id,
      intakeTokenId: row.id,
      consultantId: row.consultant_id,
      kind: parsed.kind,
      questionId: parsed.questionId,
      clientSessionId: parsed.clientSessionId,
    });

    res.status(200).json({ ok: true, persisted: result.persisted });
  } catch (err) {
    const error = err as Error;
    logger.error('route.intake_intelligence_kpi_failed', { component: 'intake', error: error.message });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
  }
}
