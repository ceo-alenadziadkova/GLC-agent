import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_PLAN_TRACE_FAILED_MESSAGE,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_RESPONSES_REQUIRED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import {
  INTERNAL_SERVER_ERROR_MESSAGE,
  intakeResponsesSchemaInvalidMessage,
} from '../../../config/api-user-messages.en.js';
import { isDiagnosticIntakePilotEnabled } from '../../../config/feature-flags.js';
import { logger } from '../../../services/logger.js';
import {
  buildAuthoritativePlanTrace,
  mergeNlDraftIntoAuthoritativeResponses,
} from '../../../services/intake/intake-nl-authoritative.service.js';
import {
  intakeLinkExpired,
  isIntakeTokenFormatValid,
  normalizePublicIntakeRouteTokenParam,
} from '../../../services/intake/intake-token-guards.js';
import { mapNlDescribeTextToGraphDraft } from '../../../services/intake/nl-describe-graph-mapper.js';
import {
  fetchIntakeTokenRowForRespond,
  updateIntakeTokenResponsesDraft,
} from '../../../services/intake/intake-token.service.js';
import { DEFAULT_AUDIT_PRODUCT_MODE, type IntakeBriefCollectionMode, type ProductMode } from '../../../types/audit.js';
import type { IntakeSurface } from '@glc/intake-core';

const MAX_TEXT_LEN = 8000;

/**
 * Sprint 5 NL ingress stub: records intent only; graph draft is produced by a future orchestrator.
 * Privacy: free text is not persisted here — clients should not send secrets.
 */
export async function postIntakeNlDescribeController(req: Request, res: Response) {
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

    const raw = req.body?.text;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_RESPONSES_REQUIRED, INTAKE_RESPONSES_REQUIRED_MESSAGE));
      return;
    }
    if (raw.length > MAX_TEXT_LEN) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_RESPONSES_SCHEMA_INVALID,
            intakeResponsesSchemaInvalidMessage(`text exceeds ${MAX_TEXT_LEN} characters`),
          ),
        );
      return;
    }

    const minConfidence = req.body?.min_confidence === 'low' ? 'low' : 'medium';
    const persistDraft = req.body?.persist_draft !== false;
    const collectionMode =
      typeof req.body?.collectionMode === 'string' ? (req.body.collectionMode as IntakeBriefCollectionMode) : undefined;
    const surface = typeof req.body?.surface === 'string' ? (req.body.surface as IntakeSurface) : undefined;
    const productMode =
      typeof req.body?.productMode === 'string' ? (req.body.productMode as ProductMode) : DEFAULT_AUDIT_PRODUCT_MODE;

    logger.info('intake_nl_describe_received', {
      tokenPrefix: token.slice(0, 6),
      charCount: raw.length,
      preferExplicitOverInferred: true,
      minConfidence,
    });

    const graphDraft = mapNlDescribeTextToGraphDraft(raw);
    const authoritative = mergeNlDraftIntoAuthoritativeResponses({
      graphDraft,
      existingResponses: row.responses,
      minConfidence,
    });

    if (persistDraft) {
      await updateIntakeTokenResponsesDraft(row.id, authoritative.mergedResponses);
    }

    const planTrace = buildAuthoritativePlanTrace({
      responses: authoritative.mergedResponses,
      productMode,
      collectionMode,
      surface,
    });

    res.status(200).json({
      ok: true,
      prefer_explicit_over_inferred: true,
      graphDraft,
      authoritative: {
        merged_responses: authoritative.mergedResponses,
        applied_hints: authoritative.appliedHints,
        skipped_hints: authoritative.skippedHints,
        persisted: persistDraft,
      },
      plan_trace: {
        plan: planTrace.plan,
        text: planTrace.text,
      },
      message: 'NL ingress produced authoritative merged responses and plan trace with confidence/evidence gating.',
    });
  } catch (err) {
    logger.error('post_intake_nl_describe_failed', { err });
    const isPlanFailure = err instanceof Error && err.message.includes('buildIntakePlan');
    res
      .status(500)
      .json(
        apiErrorJson(
          isPlanFailure ? API_ERROR_CODES.INTAKE_PLAN_TRACE_FAILED : API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          isPlanFailure ? INTAKE_PLAN_TRACE_FAILED_MESSAGE : INTERNAL_SERVER_ERROR_MESSAGE,
        ),
      );
  }
}
