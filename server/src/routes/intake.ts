/**
 * Pre-brief public intake: consultant creates token; client loads and submits without auth.
 * Payload shape matches `buildPreBriefQuestionsForResponses` + `BriefResponsesSchema` (bank id cells; see API.md).
 */
import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { intakePublicReadLimiter, intakePublicWriteLimiter } from '../middleware/rate-limit.js';
import {
  getBriefQuestionsByIds,
  INTAKE_IDENTITY_BRIEF_QUESTIONS,
  INTAKE_IDENTITY_FIELD_IDS,
  BriefResponsesSchema,
} from '../schemas/intake-brief.js';
import { arePreBriefSlotsSatisfied, saveBriefResponses } from '../services/brief-validator.js';
import { resolveFrontendBaseUrl } from '../config/frontend-url.js';
import { logger } from '../services/logger.js';
import { emitStructuredNotification } from '../services/notifications.js';
import { buildIntakePlan } from '@glc/intake-core';
import { choiceSpecifyResponseKey } from '@glc/intake-core';
import { INTAKE_REVENUE_BANK_ID } from '@glc/intake-core';
import { formatPlanTrace } from '@glc/intake-core';
import { parseIntakeVersionTuple } from '@glc/intake-core';
import { isSupportedIntakeArtifactTuple } from '@glc/intake-core';
import type { IntakeSurface } from '@glc/intake-core';
import type { IntakeBriefCollectionMode, ProductMode } from '../types/audit.js';
import {
  API_ERROR_CODES,
  INTAKE_AUDIT_ID_FORMAT_INVALID_MESSAGE,
  INTAKE_AUDIT_ID_REQUIRED_MESSAGE,
  INTAKE_AUDIT_NOT_FOUND_MESSAGE,
  INTAKE_CREATE_LINK_FAILED_MESSAGE,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_AUDIT_FAILED_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_LINK_TOKEN_FAILED_MESSAGE,
  INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE,
  INTAKE_LOAD_FAILED_MESSAGE,
  INTAKE_NOT_ALLOWED_MESSAGE,
  INTAKE_PLAN_TRACE_FAILED_MESSAGE,
  INTAKE_PREFILL_LOAD_FAILED_MESSAGE,
  INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH_MESSAGE,
  INTAKE_PREBRIEF_INCOMPLETE_MESSAGE,
  INTAKE_RESPONSES_REQUIRED_MESSAGE,
  INTAKE_SAVE_RESPONSES_FAILED_MESSAGE,
  INTAKE_TOKEN_LINKED_CONFLICT_MESSAGE,
  INTAKE_TOKEN_NOT_FOUND_MESSAGE,
  INTAKE_VERSION_TUPLE_UNSUPPORTED_MESSAGE,
  apiErrorJson,
  intakeProductModeInvalidMessage,
  intakeResponsesSchemaInvalidMessage,
} from '../config/api-error-codes.js';

export const intakeRouter = Router();

const TOKEN_HEX = /^[a-f0-9]{40}$/i;

type MergePreBriefOutcome = 'merged' | 'nothing_to_merge' | 'consultant_not_audit_owner';

function toClientEntries(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      out[k] = { ...(v as Record<string, unknown>), source: 'client' };
    } else {
      out[k] = { value: v, source: 'client' };
    }
  }
  return out;
}

/** Question rows for public/prefill GET: policy identity block, then classic-catalog rows for `plan.visible` (pre_brief slice). */
function buildPreBriefQuestionsForResponses(raw: Record<string, unknown>) {
  const preBriefPlan = buildIntakePlan({
    responses: raw,
    productMode: 'full',
    collectionMode: 'pre_brief',
    surface: 'client_form',
  });
  const coreQuestions = getBriefQuestionsByIds(preBriefPlan.visible);
  return [...INTAKE_IDENTITY_BRIEF_QUESTIONS, ...coreQuestions];
}

/**
 * Merges token submit cells into `intake_brief.responses` (whitelist only).
 * Includes `pre_brief` `plan.visible` ids, `INTAKE_IDENTITY_FIELD_IDS`, `INTAKE_REVENUE_BANK_ID` and its specify key,
 * and every `choiceSpecifyResponseKey` for visible + identity ids (e.g. `f1__other`, `c3__other`, `intake_industry_specify` for `a2`).
 */
async function mergePreBriefFromParsedResponses(
  auditId: string,
  consultantUserId: string,
  parsed: Record<string, unknown>,
): Promise<MergePreBriefOutcome> {
  const { data: auditRow, error: auditErr } = await supabase
    .from('audits')
    .select('user_id')
    .eq('id', auditId)
    .single();
  if (auditErr || !auditRow || auditRow.user_id !== consultantUserId) {
    return 'consultant_not_audit_owner';
  }

  const { data: brief } = await supabase
    .from('intake_brief')
    .select('responses')
    .eq('audit_id', auditId)
    .maybeSingle();
  const existing = (brief?.responses as Record<string, unknown>) ?? {};
  const preBriefPatch: Record<string, unknown> = {};
  const entries = toClientEntries(parsed);
  const mergedForPlan = { ...existing, ...entries };
  const preBriefPlan = buildIntakePlan({
    responses: mergedForPlan,
    productMode: 'full',
    collectionMode: 'pre_brief',
    surface: 'client_form',
  });
  const mergeIds = new Set<string>([
    ...preBriefPlan.visible,
    ...INTAKE_IDENTITY_FIELD_IDS,
    INTAKE_REVENUE_BANK_ID,
    choiceSpecifyResponseKey(INTAKE_REVENUE_BANK_ID),
  ]);
  const specifyScopeIds = [...preBriefPlan.visible, ...INTAKE_IDENTITY_FIELD_IDS];
  for (const id of specifyScopeIds) {
    mergeIds.add(choiceSpecifyResponseKey(id));
  }
  for (const id of mergeIds) {
    if (entries[id] !== undefined) preBriefPatch[id] = entries[id];
  }
  if (Object.keys(preBriefPatch).length === 0) return 'nothing_to_merge';
  await saveBriefResponses(auditId, { ...existing, ...preBriefPatch }, { validation_perspective: 'client' });
  return 'merged';
}

/** POST /api/intake — consultant creates token */
intakeRouter.post('/', requireAuth, attachProfile, requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const audit_id = req.body.audit_id;
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
      ? req.body.metadata as Record<string, unknown>
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
      const { data: audit, error: aErr } = await supabase
        .from('audits')
        .select('id, user_id')
        .eq('id', audit_id)
        .single();
      if (aErr || !audit || audit.user_id !== req.userId) {
        res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_NOT_FOUND, INTAKE_AUDIT_NOT_FOUND_MESSAGE));
        return;
      }
    }

    const { data: row, error } = await supabase
      .from('intake_tokens')
      .insert({
        consultant_id: req.userId!,
        audit_id: audit_id ?? null,
        metadata,
      })
      .select('token, expires_at')
      .single();

    if (error || !row) {
      logger.error('intake.create_failed', { component: 'intake', error: error?.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_CREATE_LINK_FAILED, INTAKE_CREATE_LINK_FAILED_MESSAGE));
      return;
    }

    const base = resolveFrontendBaseUrl();
    res.status(201).json({
      token: row.token as string,
      url: `${base}/intake/${row.token}`,
      expires_at: row.expires_at as string,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.create_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.INTAKE_CREATE_LINK_FAILED, INTAKE_CREATE_LINK_FAILED_MESSAGE));
  }
});

/**
 * POST /api/intake/link-audit — consultant ties a pre-brief token to an audit and merges any
 * already-submitted client answers into intake_brief (fixes tokens created without audit_id).
 */
intakeRouter.post('/link-audit', requireAuth, attachProfile, requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const audit_id = typeof req.body?.audit_id === 'string' ? req.body.audit_id.trim() : '';
    if (!token || !TOKEN_HEX.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }
    if (!audit_id) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_ID_REQUIRED, INTAKE_AUDIT_ID_REQUIRED_MESSAGE));
      return;
    }

    const { data: tokRow, error: tErr } = await supabase
      .from('intake_tokens')
      .select('id, audit_id, consultant_id, responses')
      .eq('token', token)
      .single();

    if (tErr || !tokRow) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_TOKEN_NOT_FOUND, INTAKE_TOKEN_NOT_FOUND_MESSAGE));
      return;
    }
    if (tokRow.consultant_id !== req.userId) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.INTAKE_NOT_ALLOWED, INTAKE_NOT_ALLOWED_MESSAGE));
      return;
    }
    const existingAudit = tokRow.audit_id as string | null;
    if (existingAudit && existingAudit !== audit_id) {
      res
        .status(409)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_TOKEN_LINKED_CONFLICT, INTAKE_TOKEN_LINKED_CONFLICT_MESSAGE),
        );
      return;
    }

    const { data: audit, error: aErr } = await supabase
      .from('audits')
      .select('id, user_id')
      .eq('id', audit_id)
      .single();
    if (aErr || !audit || audit.user_id !== req.userId) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_NOT_FOUND, INTAKE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    const { error: upErr } = await supabase
      .from('intake_tokens')
      .update({ audit_id })
      .eq('id', tokRow.id);

    if (upErr) {
      logger.error('intake.link_audit_update_failed', { component: 'intake', error: upErr.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_TOKEN_FAILED, INTAKE_LINK_TOKEN_FAILED_MESSAGE));
      return;
    }

    const rawResponses = tokRow.responses as Record<string, unknown>;
    const parsed = BriefResponsesSchema.safeParse(rawResponses);
    if (parsed.success && Object.keys(parsed.data).length > 0) {
      try {
        const outcome = await mergePreBriefFromParsedResponses(
          audit_id,
          req.userId!,
          parsed.data as Record<string, unknown>,
        );
        if (outcome === 'consultant_not_audit_owner') {
          logger.warn('intake.link_audit_merge_skipped', {
            component: 'intake',
            code: API_ERROR_CODES.INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH,
            message: INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH_MESSAGE,
          });
        }
      } catch (mergeErr) {
        logger.warn('intake.link_audit_merge_skipped', {
          component: 'intake',
          error: (mergeErr as Error).message,
        });
      }
    }

    res.json({ ok: true as const });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.link_audit_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_AUDIT_FAILED, INTAKE_LINK_AUDIT_FAILED_MESSAGE));
  }
});

/**
 * GET /api/intake/submissions — consultant: pre-brief rows this user created where the client
 * already submitted (for admin queue / ops review before or after linking to an audit).
 */
intakeRouter.get('/submissions', requireAuth, attachProfile, requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('intake_tokens')
      .select('token, metadata, responses, submitted_at, expires_at, audit_id')
      .eq('consultant_id', req.userId!)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(100);

    if (error) {
      logger.error('intake.submissions_list_failed', { component: 'intake', error: error.message });
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_LIST_SUBMISSIONS_FAILED, INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE),
        );
      return;
    }

    const base = resolveFrontendBaseUrl();
    const submissions = (rows ?? []).map(r => ({
      token: r.token as string,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      responses: (r.responses as Record<string, unknown>) ?? {},
      submitted_at: r.submitted_at as string,
      expires_at: r.expires_at as string,
      audit_id: (r.audit_id as string | null) ?? null,
      intake_url: `${base}/intake/${r.token as string}`,
    }));

    res.json({ submissions });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.submissions_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.INTAKE_LIST_SUBMISSIONS_FAILED, INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE),
      );
  }
});

/**
 * GET /api/intake/prefill/:token — consultant-only; same payload as public GET but does not reject
 * expired links. Used when opening New Audit from the request queue so client answers still load.
 */
intakeRouter.get(
  '/prefill/:token',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  async (req: AuthRequest, res) => {
    try {
      const token = String(req.params.token ?? '').trim();
      if (!token || !TOKEN_HEX.test(token)) {
        res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
        return;
      }

      const { data: row, error } = await supabase
        .from('intake_tokens')
        .select('metadata, responses, submitted_at, expires_at, consultant_id')
        .eq('token', token)
        .single();

      if (error || !row) {
        res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
        return;
      }
      if (row.consultant_id !== req.userId) {
        res.status(403).json(apiErrorJson(API_ERROR_CODES.INTAKE_NOT_ALLOWED, INTAKE_NOT_ALLOWED_MESSAGE));
        return;
      }

      // Same bundle as public GET /api/intake/:token (buildPreBriefQuestionsForResponses).
      const questions = buildPreBriefQuestionsForResponses((row.responses as Record<string, unknown>) ?? {});
      const expMs = new Date(row.expires_at as string).getTime();
      const linkExpired = !Number.isFinite(expMs) || Date.now() > expMs;

      res.json({
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        questions,
        responses: (row.responses as Record<string, unknown>) ?? {},
        submitted_at: (row.submitted_at as string | null) ?? null,
        expires_at: row.expires_at as string,
        link_expired: linkExpired,
      });
    } catch (err) {
      const e = err as Error;
      logger.error('intake.prefill_get_exception', { component: 'intake', error: e.message, stack: e.stack });
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_PREFILL_LOAD_FAILED, INTAKE_PREFILL_LOAD_FAILED_MESSAGE),
        );
    }
  }
);

/**
 * POST /api/intake/plan-trace — ADR Phase 2b debug tooling (consultant-only).
 *
 * Runs `buildIntakePlan` for the supplied context and returns the full `IntakePlan`
 * (including `reasonsById`, `debugTrace`, `derivedFacts`, `coverage`, `confidence`)
 * plus a human-readable text trace via `formatPlanTrace`. Use this endpoint to
 * diagnose visibility/required set divergence without needing a local dev server.
 *
 * Body: {
 *   responses: Record<string, unknown>,      // intake answers (unwrapped or wrapped values)
 *   productMode?: string,                    // default "full"
 *   collectionMode?: string,                 // e.g. "discovery", "pre_brief"
 *   surface?: string,                        // e.g. "consultant_interview", "public_discovery"
 *   intakeVersionTuple?: IntakeVersionTuple  // omit to use current artifacts
 * }
 */
const VALID_PRODUCT_MODES = new Set<string>(['full', 'express', 'discovery', 'pre_brief', 'free_snapshot']);
const VALID_COLLECTION_MODES = new Set<string>(['full', 'discovery', 'pre_brief', 'express', 'free_snapshot']);
const VALID_SURFACES = new Set<string>([
  'consultant_interview',
  'client_form',
  'client_portal',
  'internal_review',
  'public_discovery',
]);

intakeRouter.post(
  '/plan-trace',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};

      const responses =
        body.responses != null && typeof body.responses === 'object' && !Array.isArray(body.responses)
          ? (body.responses as Record<string, unknown>)
          : {};

      const rawMode = typeof body.productMode === 'string' ? body.productMode : 'full';
      if (!VALID_PRODUCT_MODES.has(rawMode)) {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_PRODUCT_MODE_INVALID,
              intakeProductModeInvalidMessage(rawMode, [...VALID_PRODUCT_MODES].join(', ')),
            ),
          );
        return;
      }
      const productMode = rawMode as ProductMode;

      const rawCollection = typeof body.collectionMode === 'string' ? body.collectionMode : undefined;
      if (rawCollection !== undefined && !VALID_COLLECTION_MODES.has(rawCollection)) {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_COLLECTION_MODE_INVALID,
              `Invalid collectionMode "${rawCollection}".`,
            ),
          );
        return;
      }
      const collectionMode = rawCollection as IntakeBriefCollectionMode | undefined;

      const rawSurface = typeof body.surface === 'string' ? body.surface : undefined;
      if (rawSurface !== undefined && !VALID_SURFACES.has(rawSurface)) {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_SURFACE_INVALID,
              `Invalid surface "${rawSurface}". Valid values: ${[...VALID_SURFACES].join(', ')}`,
            ),
          );
        return;
      }
      const surface = rawSurface as IntakeSurface | undefined;

      const intakeVersionTuple = body.intakeVersionTuple != null
        ? parseIntakeVersionTuple(body.intakeVersionTuple)
        : undefined;

      if (intakeVersionTuple !== undefined && !isSupportedIntakeArtifactTuple(intakeVersionTuple)) {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.INTAKE_VERSION_TUPLE_UNSUPPORTED,
              INTAKE_VERSION_TUPLE_UNSUPPORTED_MESSAGE,
            ),
          );
        return;
      }

      const plan = buildIntakePlan({ responses, productMode, collectionMode, surface, intakeVersionTuple });
      const text = formatPlanTrace(plan, { productMode, collectionMode, surface });

      res.json({ plan, text });
    } catch (err) {
      const e = err as Error;
      logger.error('intake.plan_trace_exception', { component: 'intake', error: e.message });
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_PLAN_TRACE_FAILED, INTAKE_PLAN_TRACE_FAILED_MESSAGE, {
            detail: e.message,
          }),
        );
    }
  },
);

/** GET /api/intake/:token — public */
intakeRouter.get('/:token', intakePublicReadLimiter, async (req, res) => {
  try {
    const token = String(req.params.token ?? '');
    if (!token || !TOKEN_HEX.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }

    const { data: row, error } = await supabase
      .from('intake_tokens')
      .select('metadata, responses, submitted_at, expires_at')
      .eq('token', token)
      .single();

    if (error || !row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }

    const exp = new Date(row.expires_at as string).getTime();
    if (!Number.isFinite(exp) || Date.now() > exp) {
      res.status(410).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_EXPIRED, INTAKE_LINK_EXPIRED_MESSAGE));
      return;
    }

    // Public pre-brief: INTAKE_IDENTITY_BRIEF_QUESTIONS first (policy identityFieldIds bank stubs; a2 Other uses intake_industry_specify inline),
    // then getBriefQuestionsByIds(plan.visible) for the pre_brief bank slice.
    const questions = buildPreBriefQuestionsForResponses((row.responses as Record<string, unknown>) ?? {});

    res.json({
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      questions,
      responses: (row.responses as Record<string, unknown>) ?? {},
      submitted_at: (row.submitted_at as string | null) ?? null,
      expires_at: row.expires_at as string,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.public_get_exception', { component: 'intake', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_LOAD_FAILED, INTAKE_LOAD_FAILED_MESSAGE));
  }
});

/** POST /api/intake/:token/respond — public; overwrites responses until expiry */
intakeRouter.post('/:token/respond', intakePublicWriteLimiter, async (req, res) => {
  try {
    const token = String(req.params.token ?? '');
    if (!token || !TOKEN_HEX.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }

    const { data: row, error: fetchErr } = await supabase
      .from('intake_tokens')
      .select('id, audit_id, consultant_id, expires_at')
      .eq('token', token)
      .single();

    if (fetchErr || !row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }

    const exp = new Date(row.expires_at as string).getTime();
    if (!Number.isFinite(exp) || Date.now() > exp) {
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

    if (!arePreBriefSlotsSatisfied(parsed.data as Record<string, unknown>)) {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_PREBRIEF_INCOMPLETE, INTAKE_PREBRIEF_INCOMPLETE_MESSAGE),
        );
      return;
    }

    const submittedAt = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('intake_tokens')
      .update({
        responses: parsed.data,
        submitted_at: submittedAt,
      })
      .eq('id', row.id);

    if (upErr) {
      logger.error('intake.respond_update_failed', { component: 'intake', error: upErr.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
      return;
    }

    const auditId = row.audit_id as string | null;
    if (auditId) {
      try {
        const outcome = await mergePreBriefFromParsedResponses(
          auditId,
          row.consultant_id as string,
          parsed.data as Record<string, unknown>,
        );
        if (outcome === 'consultant_not_audit_owner') {
          logger.warn('intake.brief_merge_skipped', {
            component: 'intake',
            code: API_ERROR_CODES.INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH,
            message: INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH_MESSAGE,
          });
        }
      } catch (mergeErr) {
        logger.warn('intake.brief_merge_skipped', {
          component: 'intake',
          reason: 'merge_error',
          error: (mergeErr as Error).message,
        });
      }
    }

    const responseCount = Object.keys(parsed.data as Record<string, unknown>).length;
    if (auditId) {
      await emitStructuredNotification({
        category: 'intake',
        event: 'intake_responses_updated',
        priority: 'low',
        audience: 'audit_participants',
        auditId,
        title: 'Intake responses updated',
        message: `Client submitted pre-brief responses (${responseCount} fields).`,
        payload: {
          token,
          submitted_at: submittedAt,
        },
        route: `/audit/${auditId}`,
      });
    } else {
      await emitStructuredNotification({
        category: 'intake',
        event: 'intake_submission_received',
        priority: 'low',
        audience: 'user',
        userId: row.consultant_id as string,
        auditId: null,
        title: 'New intake submission',
        message: `Client submitted pre-brief responses (${responseCount} fields).`,
        payload: {
          token,
          submitted_at: submittedAt,
        },
      });
    }

    res.json({ ok: true as const, submitted_at: submittedAt });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.respond_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
  }
});
