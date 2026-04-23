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
import {
  getNlIngressLlmAllowlistTokens,
  getNlIngressLlmGeoGroups,
  getNlIngressLlmRolloutMode,
  getNlIngressLlmRolloutPercent,
  isDiagnosticIntakePilotEnabled,
  isNlIngressLlmEnabled,
} from '../../../config/feature-flags.js';
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
import { mapNlDescribeTextToGraphDraftLlm } from '../../../services/intake/nl-describe-llm-mapper.js';
import {
  fetchIntakeTokenRowForRespond,
  updateIntakeTokenResponsesDraft,
} from '../../../services/intake/intake-token.service.js';
import { DEFAULT_AUDIT_PRODUCT_MODE, type IntakeBriefCollectionMode, type ProductMode } from '../../../types/audit.js';
import type { IntakeSurface } from '@glc/intake-core';

const MAX_TEXT_LEN = 8000;
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const nlDescribeIdempotencyCache = new Map<string, { at: number; response: unknown }>();

function readHeader(req: Request, headerName: string): string | undefined {
  if (typeof req.header === 'function') return req.header(headerName) ?? undefined;
  const raw = req.headers?.[headerName.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === 'string' ? raw : undefined;
}

function scrubNlTextPii(text: string): { scrubbed: string; emailCount: number; phoneCount: number } {
  let emailCount = 0;
  let phoneCount = 0;
  const scrubbedEmails = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, () => {
    emailCount += 1;
    return '[redacted_email]';
  });
  const scrubbed = scrubbedEmails.replace(/(?:\+?\d[\d\s\-().]{7,}\d)/g, () => {
    phoneCount += 1;
    return '[redacted_phone]';
  });
  return { scrubbed, emailCount, phoneCount };
}

function cleanupIdempotencyCache(now = Date.now()): void {
  for (const [key, value] of nlDescribeIdempotencyCache.entries()) {
    if (now - value.at > IDEMPOTENCY_TTL_MS) {
      nlDescribeIdempotencyCache.delete(key);
    }
  }
}

function hashToPercent(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100;
}

function isTokenAllowlisted(token: string, allowlist: string[]): boolean {
  return allowlist.some(item => token === item || token.startsWith(item));
}

function shouldUseLlmAsPrimary(token: string): boolean {
  if (!isNlIngressLlmEnabled()) return false;
  const mode = getNlIngressLlmRolloutMode();
  const allowlist = getNlIngressLlmAllowlistTokens();
  if (mode === 'shadow') return false;
  if (mode === 'internal') return isTokenAllowlisted(token, allowlist);
  if (mode === 'ga') return true;
  const rolloutPercent = getNlIngressLlmRolloutPercent();
  return hashToPercent(token) < rolloutPercent;
}

function isGeoGroupAllowed(geoGroup: string | null): boolean {
  const groups = getNlIngressLlmGeoGroups();
  if (groups.length === 0) return true;
  if (!geoGroup) return false;
  return groups.includes(geoGroup.toLowerCase());
}

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
    const idempotencyKeyRaw = readHeader(req, 'x-idempotency-key')?.trim();
    const idempotencyKey = idempotencyKeyRaw && idempotencyKeyRaw.length > 0 ? `${token}:${idempotencyKeyRaw}` : null;
    cleanupIdempotencyCache();
    if (idempotencyKey && nlDescribeIdempotencyCache.has(idempotencyKey)) {
      res.status(200).json(nlDescribeIdempotencyCache.get(idempotencyKey)?.response);
      return;
    }
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

    const rolloutMode = getNlIngressLlmRolloutMode();
    const geoGroupRaw = readHeader(req, 'x-geo-group')?.trim() ?? null;
    const geoEligible = isGeoGroupAllowed(geoGroupRaw);
    const llmPrimary = geoEligible && shouldUseLlmAsPrimary(token);
    const pii = scrubNlTextPii(raw);
    let regexDraft = mapNlDescribeTextToGraphDraft(raw);
    let graphDraft = regexDraft;
    let llmDraft: Awaited<ReturnType<typeof mapNlDescribeTextToGraphDraftLlm>> | null = null;
    let llmFailure: string | null = null;
    if (isNlIngressLlmEnabled()) {
      try {
        llmDraft = await mapNlDescribeTextToGraphDraftLlm(pii.scrubbed);
        if (llmPrimary) {
          graphDraft = llmDraft;
        }
      } catch (err) {
        llmFailure = err instanceof Error ? err.message : 'unknown_llm_error';
      }
    }
    if (rolloutMode === 'shadow' && llmDraft) {
      logger.info('nl_ingress_shadow_comparison', {
        tokenPrefix: token.slice(0, 6),
        regexInferredCount: regexDraft.inferred.length,
        llmInferredCount: llmDraft.inferred.length,
        piiRedaction: {
          emailCount: pii.emailCount,
          phoneCount: pii.phoneCount,
        },
      });
    }
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

    const responsePayload = {
      ok: true,
      prefer_explicit_over_inferred: true,
      llm_rollout: {
        enabled: isNlIngressLlmEnabled(),
        mode: rolloutMode,
        geo_group: geoGroupRaw,
        geo_eligible: geoEligible,
        llm_primary: llmPrimary,
        llm_failed: llmFailure != null,
        fallback_used: llmPrimary && llmFailure != null,
      },
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
    };
    if (idempotencyKey) {
      nlDescribeIdempotencyCache.set(idempotencyKey, { at: Date.now(), response: responsePayload });
    }
    res.status(200).json(responsePayload);
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
