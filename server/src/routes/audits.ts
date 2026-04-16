import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase.js';
import { upgradeFreeSnapshotAudit } from '../lib/upgrade-free-snapshot-audit.js';
import {
  requireAuth,
  attachProfile,
  requireRole,
  rejectGuestFromPortal,
  type AuthRequest,
  type UserRole,
} from '../middleware/auth.js';
import { createAuditLimiter, generalLimiter } from '../middleware/rate-limit.js';
import {
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  type AuditExecutionPlan,
  type IntakeVersionTuple,
  type ProductMode,
} from '../types/audit.js';
import {
  currentIntakeVersionTuple,
  ensureHttpsUrl,
  isSupportedIntakeArtifactTuple,
  parseIntakeVersionsBody,
  validateIntakeVersionsForBriefWrite,
} from '@glc/intake-core';
import { buildBriefSchemaSnapshot } from '@glc/intake-core';
import {
  evaluateBriefGates,
  resolveIntakeSurfaceForPlan,
  saveBriefResponses,
  validateBriefResponses,
  validationPerspectiveForBriefAccess,
} from '../services/brief-validator.js';
import type { IntakeBriefCollectionMode } from '../types/audit.js';
import { getBriefQuestionsByIds } from '../schemas/intake-brief.js';
import { intakeAnalyticsAuditBriefBatchSchema } from '../schemas/intake-analytics-events.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { NO_PUBLIC_WEBSITE_URL } from '../config/no-public-website.js';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';
import {
  getStoredIdempotentResponse,
  isIdempotencyPayloadConflictError,
  storeIdempotentResponse,
} from '../lib/idempotency.js';
import { idempotencyPostAuditsCreateKey } from '../config/api-http-paths.js';
import { AUDIT_CHILD_ROWS_INIT_ROLLBACK_MESSAGE, isAuditChildRowsInitRollbackError } from '../lib/audit-init-error.js';
import {
  API_ERROR_CODES,
  AUDIT_INITIALIZATION_FAILED_MESSAGE,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_BRIEF_ANALYTICS_ACCEPT_FAILED_MESSAGE,
  AUDITS_BRIEF_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
  AUDITS_BRIEF_ANALYTICS_STORE_FAILED_MESSAGE,
  AUDITS_BRIEF_COLLECTION_MODE_INVALID_MESSAGE,
  AUDITS_BRIEF_GET_FAILED_MESSAGE,
  AUDITS_BRIEF_HELP_ACCESS_DENIED_MESSAGE,
  AUDITS_BRIEF_HELP_CLIENT_ONLY_MESSAGE,
  AUDITS_BRIEF_HELP_FAILED_MESSAGE,
  AUDITS_BRIEF_HELP_WRONG_PHASE_MESSAGE,
  AUDITS_BRIEF_RESPONSES_NOT_OBJECT_MESSAGE,
  AUDITS_BRIEF_SAVE_FAILED_MESSAGE,
  AUDITS_BRIEF_SCHEMA_FAILED_MESSAGE,
  AUDITS_COMPANY_URL_INVALID_MESSAGE,
  AUDITS_COMPANY_URL_REQUIRED_MESSAGE,
  AUDITS_CREATE_FAILED_MESSAGE,
  AUDITS_DELETE_FAILED_MESSAGE,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_FORBIDDEN_MESSAGE,
  AUDITS_LIST_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_OMIT_COMPANY_URL_WHEN_NO_PUBLIC_WEBSITE_MESSAGE,
  AUDITS_UPGRADE_FAILED_MESSAGE,
  AUDITS_UPGRADE_PAYLOAD_INVALID_MESSAGE,
  IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
  INCOMPLETE_INTAKE_VERSIONS_MESSAGE,
  INTAKE_VERSION_CONFLICT_MESSAGE,
  UNSUPPORTED_INTAKE_VERSION_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';
import { AUDITS_LIST_DEFAULT_LIMIT, AUDITS_LIST_MAX_LIMIT } from '../config/audits-list-limits.js';
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import { logger } from '../services/logger.js';
import { createAuditWithChildren } from '../services/audit-initialization.js';
import { resolveSelfServeAuditOwnerUserId } from '../lib/self-serve-audit-owner.js';
import { emitStructuredNotification } from '../services/notifications.js';
import {
  BRIEF_HELP_REQUESTED_NOTIFICATION_TITLE,
  briefHelpRequestedNotificationMessage,
} from '../config/route-notification-messages.js';
import { healUxDomainRowForFreeSnapshotPortal } from '../lib/snapshot-audit-response-heal.js';
import { buildIntakePlan } from '@glc/intake-core';
import { normalizeExecutionPlan } from '../services/execution-plan.js';
import {
  intakeBriefGateModeFromPartialPlan,
  persistedProductModeForExecutionPlan,
} from '../lib/audit-coverage-bridge.js';

export const auditsRouter = Router();

// All audit routes require authentication
auditsRouter.use(requireAuth);
auditsRouter.use(generalLimiter);

const consultantGuard = [attachProfile, requireRole('consultant')] as const;

// ─── POST /api/audits — Create audit (consultant: own user_id; client: self-serve owner + client_id) ─
auditsRouter.post('/', attachProfile, createAuditLimiter, async (req: AuthRequest, res) => {
  try {
    const role = req.userRole as UserRole | undefined;
    if (role !== 'consultant' && role !== 'client') {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.AUDITS_FORBIDDEN, AUDITS_FORBIDDEN_MESSAGE));
      return;
    }

    const { company_url, company_name, industry, execution_plan, no_public_website } = req.body;
    const normalizedPlan = normalizeExecutionPlan(
      (execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
      DEFAULT_AUDIT_COVERAGE_PACKAGE,
    );
    const mode: ProductMode = persistedProductModeForExecutionPlan(normalizedPlan);
    const idempotent = await getStoredIdempotentResponse(req, idempotencyPostAuditsCreateKey(), req.body);
    if (idempotent.replay) {
      res.status(idempotent.replay.statusCode).json(idempotent.replay.payload);
      return;
    }

    const noSite = no_public_website === true;
    let url: string;

    if (noSite) {
      if (company_url != null && typeof company_url === 'string' && company_url.trim() !== '') {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.AUDITS_OMIT_COMPANY_URL_WHEN_NO_PUBLIC_WEBSITE,
              AUDITS_OMIT_COMPANY_URL_WHEN_NO_PUBLIC_WEBSITE_MESSAGE,
            ),
          );
        return;
      }
      url = NO_PUBLIC_WEBSITE_URL;
    } else {
      if (!company_url || typeof company_url !== 'string') {
        res
          .status(400)
          .json(apiErrorJson(API_ERROR_CODES.AUDITS_COMPANY_URL_REQUIRED, AUDITS_COMPANY_URL_REQUIRED_MESSAGE));
        return;
      }

      url = ensureHttpsUrl(company_url);

      if (url.length < REQUEST_FIELD_LIMITS.auditCompanyUrlMinNormalizedLength) {
        res
          .status(400)
          .json(apiErrorJson(API_ERROR_CODES.AUDITS_COMPANY_URL_INVALID, AUDITS_COMPANY_URL_INVALID_MESSAGE));
        return;
      }

      try {
        url = await validatePublicAuditUrl(url);
      } catch (e) {
        if (e instanceof PublicUrlNotAllowedError) {
          res.status(400).json(apiErrorJson(e.code, e.message));
          return;
        }
        throw e;
      }
    }

    let ownerUserId: string;
    let clientId: string | null = null;

    if (role === 'consultant') {
      ownerUserId = req.userId!;
    } else {
      const resolved = await resolveSelfServeAuditOwnerUserId();
      if (!resolved.ok) {
        res.status(resolved.statusCode).json(apiErrorJson(resolved.code, resolved.error));
        return;
      }
      ownerUserId = resolved.userId;
      clientId = req.userId!;
    }

    const audit = await createAuditWithChildren({
      ownerUserId,
      clientId,
      company_url: url,
      company_name: typeof company_name === 'string' && company_name.trim() ? company_name.trim() : null,
      industry: typeof industry === 'string' && industry.trim() ? industry.trim() : null,
      mode,
      execution_plan: normalizedPlan,
      no_public_website: noSite,
    });

    const payload = { id: audit.id, status: audit.status };
    await storeIdempotentResponse(req, idempotencyPostAuditsCreateKey(), idempotent.key, idempotent.hash, { statusCode: 201, payload }, audit.id);
    res.status(201).json(payload);
  } catch (err) {
    if (isIdempotencyPayloadConflictError(err)) {
      res
        .status(409)
        .json(
          apiErrorJson(API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH, IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE),
        );
      return;
    }
    if (isAuditChildRowsInitRollbackError(err)) {
      logger.error('Create audit: child row initialization failed', { error: (err as Error).message });
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.AUDIT_INITIALIZATION_FAILED, AUDIT_INITIALIZATION_FAILED_MESSAGE),
        );
      return;
    }
    logger.error('Create audit route failed', { error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.AUDITS_CREATE_FAILED, AUDITS_CREATE_FAILED_MESSAGE));
  }
});

// ─── GET /api/audits — List user's audits (paginated) ──────
// Query params: ?limit=20&offset=0 (defaults: limit=50, offset=0)
auditsRouter.get('/', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(
      parseInt(String(req.query.limit ?? String(AUDITS_LIST_DEFAULT_LIMIT)), 10) || AUDITS_LIST_DEFAULT_LIMIT,
      AUDITS_LIST_MAX_LIMIT,
    );
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

    const uid = req.userId!;
    const userFilter = safeOrUserFilter(uid);
    const { data, error, count } = await supabase
      .from('audits')
      .select(
        'id, company_url, company_name, industry, product_mode, status, current_phase, overall_score, tokens_used, created_at, updated_at, no_public_website',
        { count: 'exact' },
      )
      .or(userFilter)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ data, total: count ?? 0, limit, offset });
  } catch (err) {
    const e = err as Error;
    logger.error('route.audits_list_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.AUDITS_LIST_FAILED, AUDITS_LIST_FAILED_MESSAGE));
  }
});

// ─── GET /api/audits/:id — Full audit state ────────────────
auditsRouter.get('/:id', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    // Fetch audit (RLS ensures ownership)
    const uid = req.userId!;
    const userFilter = safeOrUserFilter(uid);
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select('*')
      .eq('id', id)
      .or(userFilter)
      .single();

    if (auditErr || !audit) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE));
      return;
    }

    // Fetch related data in parallel — use allSettled so a single DB error
    // returns partial data rather than a 500 for the entire request.
    const [reconRes, domainsRes, strategyRes, reviewsRes, briefRes] = await Promise.allSettled([
      supabase.from('audit_recon').select('*').eq('audit_id', id).single(),
      supabase.from('audit_domains').select('*').eq('audit_id', id).order('phase_number'),
      supabase.from('audit_strategy').select('*').eq('audit_id', id).single(),
      supabase.from('review_points').select('*').eq('audit_id', id).order('after_phase'),
      supabase.from('intake_brief').select('*').eq('audit_id', id).single(),
    ]);

    const recon = reconRes.status === 'fulfilled' ? (reconRes.value.data ?? null) : null;
    const domainsArr = domainsRes.status === 'fulfilled' ? (domainsRes.value.data ?? []) : [];
    const strategy = strategyRes.status === 'fulfilled' ? (strategyRes.value.data ?? null) : null;
    const reviews = reviewsRes.status === 'fulfilled' ? (reviewsRes.value.data ?? []) : [];
    const brief = briefRes.status === 'fulfilled' ? (briefRes.value.data ?? null) : null;

    // Build domains map (latest version per domain_key)
    const domainsMap: Record<string, unknown> = {};
    for (const d of domainsArr) {
      const existing = domainsMap[d.domain_key] as { version?: number } | undefined;
      if (!existing || (d.version > (existing.version ?? 0))) {
        domainsMap[d.domain_key] = d;
      }
    }

    if (audit.product_mode === 'free_snapshot' && audit.status === 'completed') {
      const ux = domainsMap['ux_conversion'];
      if (ux && typeof ux === 'object' && ux !== null && !Array.isArray(ux)) {
        domainsMap['ux_conversion'] = await healUxDomainRowForFreeSnapshotPortal(
          ux as Record<string, unknown>,
          audit.company_url as string,
        );
      }
    }

    res.json({
      meta: audit,
      recon,
      domains: domainsMap,
      strategy,
      reviews,
      brief,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_get_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE));
  }
});

const upgradeSnapshotBody = z.object({
  coverage_package: z.enum(['starter', 'pro', 'complete']),
  use_scraped_context: z.boolean(),
});

// ─── POST /api/audits/:id/upgrade-from-snapshot — free_snapshot → Starter/Pro/Complete ─
auditsRouter.post('/:id/upgrade-from-snapshot', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const parsed = upgradeSnapshotBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.AUDITS_UPGRADE_PAYLOAD_INVALID, AUDITS_UPGRADE_PAYLOAD_INVALID_MESSAGE),
        );
      return;
    }
    const result = await upgradeFreeSnapshotAudit({
      auditId: id,
      actorUserId: req.userId!,
      coveragePackage: parsed.data.coverage_package,
      useScrapedContext: parsed.data.use_scraped_context,
    });
    if (!result.ok) {
      res.status(result.status).json(apiErrorJson(result.code, result.error));
      return;
    }
    res.json(result);
  } catch (err) {
    const e = err as Error;
    logger.error('route.upgrade_snapshot_failed', { component: 'audits', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.AUDITS_UPGRADE_FAILED,
          AUDITS_UPGRADE_FAILED_MESSAGE,
        ),
      );
  }
});

// ─── DELETE /api/audits/:id — Delete audit (consultant only) ─
auditsRouter.delete('/:id', ...consultantGuard, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { error } = await supabase
      .from('audits')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId!);

    if (error) throw error;

    res.json({ deleted: true });
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_delete_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.AUDITS_DELETE_FAILED, AUDITS_DELETE_FAILED_MESSAGE));
  }
});

// ─── GET /api/audits/:id/brief/schema — Compact IntakePlan + bank labels (ADR Phase D) ─
auditsRouter.get('/:id/brief/schema', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data: audit } = await supabase
      .from('audits')
      .select('id, product_mode, execution_plan, user_id, client_id')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE));
      return;
    }

    const hasAccess = audit.user_id === req.userId || audit.client_id === req.userId;
    if (!hasAccess) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE));
      return;
    }

    const { data: brief } = await supabase
      .from('intake_brief')
      .select('*')
      .eq('audit_id', id)
      .single();

    const responses = (brief?.responses as Record<string, unknown>) ?? {};
    const collectionMode =
      (brief?.collection_mode as IntakeBriefCollectionMode | undefined) ?? 'self_serve';
    const perspective = validationPerspectiveForBriefAccess(
      audit.user_id as string,
      audit.client_id as string | null | undefined,
      req.userId!,
    );
    const surface = resolveIntakeSurfaceForPlan(collectionMode, perspective);
    const iv = brief?.intake_versions as IntakeVersionTuple | null | undefined;
    const intakeTuple =
      iv && isSupportedIntakeArtifactTuple(iv) ? iv : currentIntakeVersionTuple();

    const briefMode = intakeBriefGateModeFromPartialPlan(
      (audit.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
    );
    const schema = buildBriefSchemaSnapshot({
      responses,
      productMode: briefMode,
      collectionMode,
      surface,
      intakeVersionTuple: intakeTuple,
    });

    res.json(schema);
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_schema_get_failed', { component: 'audits', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_SCHEMA_FAILED, AUDITS_BRIEF_SCHEMA_FAILED_MESSAGE));
  }
});

// ─── POST /api/audits/:id/brief/analytics-events — Wizard funnel (ADR Phase G) ─

auditsRouter.post('/:id/brief/analytics-events', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const parsed = intakeAnalyticsAuditBriefBatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.AUDITS_BRIEF_ANALYTICS_PAYLOAD_INVALID,
          AUDITS_BRIEF_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }
    const body = parsed.data;

    const { data: audit } = await supabase
      .from('audits')
      .select('id, user_id, client_id')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE));
      return;
    }

    const hasAccess = audit.user_id === req.userId || audit.client_id === req.userId;
    if (!hasAccess) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE));
      return;
    }

    const hasTuple =
      body.intake_versions && Object.values(body.intake_versions).some(v => v != null && v !== '');
    let versions: Record<string, unknown> | null = hasTuple ? { ...body.intake_versions } : null;
    if (body.experiment_variant) {
      versions = {
        ...(versions ?? {}),
        experimentVariant: body.experiment_variant,
      };
    }

    const rows = body.events.map(e => ({
      surface: body.surface,
      event_type: e.event_type,
      client_session_id: body.client_session_id,
      audit_id: id,
      question_id: e.question_id ?? null,
      step_index: e.step_index ?? null,
      intake_versions: versions,
      client_ts: e.client_ts ?? null,
    }));

    const { error } = await supabase.from('intake_analytics_events').insert(rows);
    if (error) {
      logger.error('route.brief_analytics_insert_failed', {
        component: 'audits',
        error: error.message,
        audit_id: id,
      });
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDITS_BRIEF_ANALYTICS_STORE_FAILED,
            AUDITS_BRIEF_ANALYTICS_STORE_FAILED_MESSAGE,
          ),
        );
      return;
    }

    res.status(200).json({ ok: true as const, received: rows.length });
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_analytics_failed', { component: 'audits', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.AUDITS_BRIEF_ANALYTICS_ACCEPT_FAILED,
          AUDITS_BRIEF_ANALYTICS_ACCEPT_FAILED_MESSAGE,
        ),
      );
  }
});

// ─── GET /api/audits/:id/brief — Get brief + questions ─────────────────────
// Accessible by any authenticated user who owns or requested this audit.
auditsRouter.get('/:id/brief', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    // Verify access (owner or client)
    const { data: audit } = await supabase
      .from('audits')
      .select('id, product_mode, execution_plan, user_id, client_id')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE));
      return;
    }

    const hasAccess = audit.user_id === req.userId || audit.client_id === req.userId;
    if (!hasAccess) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE));
      return;
    }

    const { data: brief } = await supabase
      .from('intake_brief')
      .select('*')
      .eq('audit_id', id)
      .single();

    // Compute validation stats live (layout surface matches who is viewing: consultant vs client).
    const responses = (brief?.responses as Record<string, unknown>) ?? {};
    const collectionMode =
      (brief?.collection_mode as IntakeBriefCollectionMode | undefined) ?? 'self_serve';
    const perspective = validationPerspectiveForBriefAccess(
      audit.user_id as string,
      audit.client_id as string | null | undefined,
      req.userId!,
    );
    const surface = resolveIntakeSurfaceForPlan(collectionMode, perspective);
    const iv = brief?.intake_versions as IntakeVersionTuple | null | undefined;
    const intakeTuple =
      iv && isSupportedIntakeArtifactTuple(iv) ? iv : currentIntakeVersionTuple();

    const briefMode = intakeBriefGateModeFromPartialPlan(
      (audit.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
    );
    const validation = validateBriefResponses(responses, {
      productMode: briefMode,
      collectionMode,
      surface,
      intakeVersionTuple: intakeTuple,
    });
    const gates = evaluateBriefGates(
      responses,
      briefMode,
      collectionMode,
      surface,
      intakeTuple,
    );

    const plan = buildIntakePlan({
      responses,
      productMode: briefMode,
      collectionMode,
      surface,
      intakeVersionTuple: intakeTuple,
    });
    const questions = getBriefQuestionsByIds(plan.visible);

    res.json({
      product_mode: audit.product_mode,
      coverage_package: (
        normalizeExecutionPlan(
          (audit.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
          DEFAULT_AUDIT_COVERAGE_PACKAGE,
        ).coverage_package
      ),
      brief: brief ?? null,
      questions,
      validation,
      gates,
      intakeProgress: gates.intakeProgress,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_get_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_GET_FAILED, AUDITS_BRIEF_GET_FAILED_MESSAGE));
  }
});

// ─── POST /api/audits/:id/brief/help-request — Client asks for brief help (optional) ─
auditsRouter.post('/:id/brief/help-request', attachProfile, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    if (req.userRole !== 'client') {
      res
        .status(403)
        .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_HELP_CLIENT_ONLY, AUDITS_BRIEF_HELP_CLIENT_ONLY_MESSAGE));
      return;
    }

    const rawMsg = req.body?.message;
    const message =
      typeof rawMsg === 'string' ? rawMsg.trim().slice(0, REQUEST_FIELD_LIMITS.clientNotesMax) : '';

    const { data: audit } = await supabase
      .from('audits')
      .select('id, user_id, client_id, company_url, status')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE));
      return;
    }

    if (audit.client_id !== req.userId) {
      res
        .status(403)
        .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_HELP_ACCESS_DENIED, AUDITS_BRIEF_HELP_ACCESS_DENIED_MESSAGE));
      return;
    }

    if ((audit.status as string) !== 'created') {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_HELP_WRONG_PHASE, AUDITS_BRIEF_HELP_WRONG_PHASE_MESSAGE),
        );
      return;
    }

    const { error: upErr } = await supabase
      .from('audits')
      .update({
        brief_help_requested_at: new Date().toISOString(),
        brief_help_client_message: message || null,
      })
      .eq('id', id)
      .eq('client_id', req.userId!);

    if (upErr) throw upErr;

    await emitStructuredNotification({
      category: 'help',
      event: 'brief_help_requested',
      priority: 'medium',
      audience: 'consultants',
      auditId: id,
      title: BRIEF_HELP_REQUESTED_NOTIFICATION_TITLE,
      message: briefHelpRequestedNotificationMessage(
        id.slice(0, REQUEST_FIELD_LIMITS.notificationAuditIdPrefixLen),
      ),
      route: `/audit/${id}`,
      payload: {
        audit_id: id,
        actor_role: 'client',
        help_message: message || undefined,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_help_request_failed', { component: 'audits', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_HELP_FAILED, AUDITS_BRIEF_HELP_FAILED_MESSAGE));
  }
});

// ─── PUT /api/audits/:id/brief — Save brief responses ──────────────────────
// Accessible by owner (consultant) or client who submitted the request.
// Idempotent upsert — call repeatedly as user fills the form.
auditsRouter.put('/:id/brief', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { responses, collection_mode: collectionModeRaw, intake_versions: intakeVersionsRaw } = req.body;

    if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_RESPONSES_NOT_OBJECT, AUDITS_BRIEF_RESPONSES_NOT_OBJECT_MESSAGE),
        );
      return;
    }

    const allowedModes: IntakeBriefCollectionMode[] = ['self_serve', 'interview', 'pre_brief', 'discovery'];
    let collection_mode: IntakeBriefCollectionMode | undefined;
    if (collectionModeRaw !== undefined && collectionModeRaw !== null && collectionModeRaw !== '') {
      if (typeof collectionModeRaw !== 'string' || !allowedModes.includes(collectionModeRaw as IntakeBriefCollectionMode)) {
        res
          .status(400)
          .json(
            apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_COLLECTION_MODE_INVALID, AUDITS_BRIEF_COLLECTION_MODE_INVALID_MESSAGE),
          );
        return;
      }
      collection_mode = collectionModeRaw as IntakeBriefCollectionMode;
    }

    // Verify access
    const { data: audit } = await supabase
      .from('audits')
      .select('id, user_id, client_id, product_mode, execution_plan')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE));
      return;
    }

    const hasAccess = audit.user_id === req.userId || audit.client_id === req.userId;
    if (!hasAccess) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE));
      return;
    }

    const parsedVersions = parseIntakeVersionsBody(intakeVersionsRaw);
    if (parsedVersions.kind === 'incomplete') {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.INCOMPLETE_INTAKE_VERSIONS, INCOMPLETE_INTAKE_VERSIONS_MESSAGE),
        );
      return;
    }

    const { data: versionRow } = await supabase
      .from('intake_brief')
      .select('intake_versions')
      .eq('audit_id', id)
      .maybeSingle();

    const vr = validateIntakeVersionsForBriefWrite({
      parsedFromBody: parsedVersions.kind === 'full' ? parsedVersions.tuple : undefined,
      stored: (versionRow?.intake_versions as IntakeVersionTuple | null) ?? null,
    });
    if (!vr.ok) {
      const b = vr.body as {
        code: string;
        message?: string;
        received?: unknown;
        supportedHint?: string;
        stored?: unknown;
      };
      if (b.code === 'UNSUPPORTED_INTAKE_VERSION') {
        res.status(vr.status).json(
          apiErrorJson(API_ERROR_CODES.UNSUPPORTED_INTAKE_VERSION, UNSUPPORTED_INTAKE_VERSION_MESSAGE, {
            received: b.received,
            supportedHint: b.supportedHint,
          }),
        );
        return;
      }
      if (b.code === 'INTAKE_VERSION_CONFLICT') {
        res.status(vr.status).json(
          apiErrorJson(API_ERROR_CODES.INTAKE_VERSION_CONFLICT, INTAKE_VERSION_CONFLICT_MESSAGE, {
            stored: b.stored,
            received: b.received,
          }),
        );
        return;
      }
      logger.error('route.brief_put_unexpected_intake_version_body', { body: vr.body });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_SAVE_FAILED, AUDITS_BRIEF_SAVE_FAILED_MESSAGE));
      return;
    }

    const perspective = validationPerspectiveForBriefAccess(
      audit.user_id as string,
      audit.client_id as string | null | undefined,
      req.userId!,
    );
    const { brief, gates } = await saveBriefResponses(id, responses as Record<string, unknown>, {
      ...(collection_mode ? { collection_mode } : {}),
      validation_perspective: perspective,
      effective_intake_versions: vr.effective,
      ...(vr.migration ? { intake_version_migration: vr.migration } : {}),
    });
    const cm = (brief.collection_mode as IntakeBriefCollectionMode | undefined) ?? 'self_serve';
    const surface = resolveIntakeSurfaceForPlan(cm, perspective);
    const liveTuple =
      brief.intake_versions && isSupportedIntakeArtifactTuple(brief.intake_versions as IntakeVersionTuple)
        ? (brief.intake_versions as IntakeVersionTuple)
        : currentIntakeVersionTuple();
    const liveBriefMode = intakeBriefGateModeFromPartialPlan(
      (audit.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
    );
    const liveValidation = validateBriefResponses(brief.responses as Record<string, unknown>, {
      productMode: liveBriefMode,
      collectionMode: brief.collection_mode as IntakeBriefCollectionMode,
      surface,
      intakeVersionTuple: liveTuple,
    });

    res.json({
      brief,
      validation: liveValidation,
      gates,
      intakeProgress: gates.intakeProgress,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_put_failed', { component: 'audits', error: e.message, stack: e.stack });
    const msg = e.message;
    if (msg.startsWith('Invalid brief responses')) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_VALIDATION_FAILED, msg));
      return;
    }
    res.status(500).json(apiErrorJson(API_ERROR_CODES.AUDITS_BRIEF_SAVE_FAILED, AUDITS_BRIEF_SAVE_FAILED_MESSAGE));
  }
});
