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
  DOMAIN_KEYS,
  EXPRESS_DOMAIN_KEYS,
  reviewPhasesForMode,
  type IntakeVersionTuple,
  type ProductMode,
} from '../types/audit.js';
import {
  currentIntakeVersionTuple,
  isSupportedIntakeArtifactTuple,
  parseIntakeVersionsBody,
  validateIntakeVersionsForBriefWrite,
} from '../intake/core/index.js';
import { buildBriefSchemaSnapshot } from '../intake/core/build-brief-schema-snapshot.js';
import {
  evaluateBriefGates,
  resolveIntakeSurfaceForPlan,
  saveBriefResponses,
  validateBriefResponses,
  validationPerspectiveForBriefAccess,
} from '../services/brief-validator.js';
import type { IntakeBriefCollectionMode } from '../types/audit.js';
import { BRIEF_QUESTIONS } from '../schemas/intake-brief.js';
import { intakeAnalyticsAuditBriefBatchSchema } from '../schemas/intake-analytics-events.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { NO_PUBLIC_WEBSITE_URL } from '../config/no-public-website.js';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';
import { getStoredIdempotentResponse, storeIdempotentResponse } from '../lib/idempotency.js';
import { logger } from '../services/logger.js';
import { resolveSelfServeAuditOwnerUserId } from '../lib/self-serve-audit-owner.js';
import { notifyConsultants } from '../services/notifications.js';
import { healUxDomainRowForFreeSnapshotPortal } from '../lib/snapshot-audit-response-heal.js';

export const auditsRouter = Router();

// All audit routes require authentication
auditsRouter.use(requireAuth);
auditsRouter.use(generalLimiter);

const consultantGuard = [attachProfile, requireRole('consultant')] as const;

async function createAuditWithChildren(params: {
  ownerUserId: string;
  clientId: string | null;
  company_url: string;
  company_name: string | null;
  industry: string | null;
  mode: ProductMode;
}): Promise<{ id: string; status: string }> {
  const { ownerUserId, clientId, company_url, company_name, industry, mode } = params;

  const { data: audit, error: auditErr } = await supabase
    .from('audits')
    .insert({
      user_id: ownerUserId,
      client_id: clientId,
      company_url,
      company_name,
      industry,
      product_mode: mode,
    })
    .select()
    .single();

  if (auditErr) throw auditErr;

  const activeDomainKeys = mode === 'express' ? EXPRESS_DOMAIN_KEYS : DOMAIN_KEYS;
  const activeReviewPhases = reviewPhasesForMode(mode);

  const reviewInserts = activeReviewPhases.map(phase => ({
    audit_id: audit.id,
    after_phase: phase,
  }));

  const domainInserts = activeDomainKeys.map((key, i) => ({
    audit_id: audit.id,
    domain_key: key,
    phase_number: i + 1,
  }));

  const childInserts = [
    supabase.from('review_points').insert(reviewInserts),
    supabase.from('audit_domains').insert(domainInserts),
    supabase.from('audit_recon').insert({ audit_id: audit.id }),
    ...(mode !== 'express' ? [supabase.from('audit_strategy').insert({ audit_id: audit.id })] : []),
  ] as const;

  const results = await Promise.allSettled(childInserts);

  const initFailed = results.some(
    r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
  );

  if (initFailed) {
    await supabase.from('audits').delete().eq('id', audit.id);
    logger.error('Audit initialization failed, rollback applied', { audit_id: audit.id });
    throw new Error('Failed to initialize audit — rolled back');
  }

  return { id: audit.id as string, status: audit.status as string };
}

// ─── POST /api/audits — Create audit (consultant: own user_id; client: self-serve owner + client_id) ─
auditsRouter.post('/', attachProfile, createAuditLimiter, async (req: AuthRequest, res) => {
  try {
    const role = req.userRole as UserRole | undefined;
    if (role !== 'consultant' && role !== 'client') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { company_url, company_name, industry, product_mode, no_public_website } = req.body;
    const mode: ProductMode = product_mode === 'express' ? 'express' : 'full';
    const idempotent = await getStoredIdempotentResponse(req, 'POST:/api/audits', req.body);
    if (idempotent.replay) {
      res.status(idempotent.replay.statusCode).json(idempotent.replay.payload);
      return;
    }

    const noSite = no_public_website === true;
    let url: string;

    if (noSite) {
      if (company_url != null && typeof company_url === 'string' && company_url.trim() !== '') {
        res.status(400).json({ error: 'Omit company_url when no_public_website is true' });
        return;
      }
      url = NO_PUBLIC_WEBSITE_URL;
    } else {
      if (!company_url || typeof company_url !== 'string') {
        res.status(400).json({ error: 'company_url is required' });
        return;
      }

      url = company_url.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      if (url.length < 10) {
        res.status(400).json({ error: 'company_url must be a valid URL (e.g. https://company.com)' });
        return;
      }

      try {
        url = await validatePublicAuditUrl(url);
      } catch (e) {
        if (e instanceof PublicUrlNotAllowedError) {
          res.status(400).json({ error: 'company_url is not allowed' });
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
        res.status(resolved.statusCode).json({ error: resolved.error, code: resolved.code });
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
    });

    const payload = { id: audit.id, status: audit.status };
    await storeIdempotentResponse(req, 'POST:/api/audits', idempotent.key, idempotent.hash, { statusCode: 201, payload }, audit.id);
    res.status(201).json(payload);
  } catch (err) {
    if ((err as Error).message.includes('Idempotency key reuse')) {
      res.status(409).json({ error: (err as Error).message });
      return;
    }
    if ((err as Error).message.includes('Failed to initialize audit')) {
      res.status(500).json({ error: (err as Error).message });
      return;
    }
    logger.error('Create audit route failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// ─── GET /api/audits — List user's audits (paginated) ──────
// Query params: ?limit=20&offset=0 (defaults: limit=50, offset=0)
auditsRouter.get('/', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

    const uid = req.userId!;
    const userFilter = safeOrUserFilter(uid);
    const { data, error, count } = await supabase
      .from('audits')
      .select(
        'id, company_url, company_name, industry, product_mode, status, current_phase, overall_score, tokens_used, created_at, updated_at',
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
    res.status(500).json({ error: 'Failed to list audits' });
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
      res.status(404).json({ error: 'Audit not found' });
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
    res.status(500).json({ error: 'Failed to fetch audit' });
  }
});

const upgradeSnapshotBody = z.object({
  target_mode: z.enum(['express', 'full']),
  use_scraped_context: z.boolean(),
});

// ─── POST /api/audits/:id/upgrade-from-snapshot — free_snapshot → express/full + brief seed ─
auditsRouter.post('/:id/upgrade-from-snapshot', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const parsed = upgradeSnapshotBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload — need target_mode and use_scraped_context' });
      return;
    }
    const result = await upgradeFreeSnapshotAudit({
      auditId: id,
      actorUserId: req.userId!,
      targetMode: parsed.data.target_mode,
      useScrapedContext: parsed.data.use_scraped_context,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    const e = err as Error;
    logger.error('route.upgrade_snapshot_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message || 'Upgrade failed' });
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
    res.status(500).json({ error: 'Failed to delete audit' });
  }
});

// ─── GET /api/audits/:id/brief/schema — Compact IntakePlan + bank labels (ADR Phase D) ─
auditsRouter.get('/:id/brief/schema', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data: audit } = await supabase
      .from('audits')
      .select('id, product_mode, user_id, client_id')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const hasAccess = audit.user_id === req.userId || audit.client_id === req.userId;
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
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

    const schema = buildBriefSchemaSnapshot({
      responses,
      productMode: audit.product_mode as ProductMode,
      collectionMode,
      surface,
      intakeVersionTuple: intakeTuple,
    });

    res.json(schema);
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_schema_get_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to get brief schema' });
  }
});

// ─── POST /api/audits/:id/brief/analytics-events — Wizard funnel (ADR Phase G) ─

auditsRouter.post('/:id/brief/analytics-events', attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const parsed = intakeAnalyticsAuditBriefBatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid analytics payload',
        details: parsed.error.flatten(),
      });
      return;
    }
    const body = parsed.data;

    const { data: audit } = await supabase
      .from('audits')
      .select('id, user_id, client_id')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const hasAccess = audit.user_id === req.userId || audit.client_id === req.userId;
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
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
      res.status(500).json({ error: 'Failed to store analytics events' });
      return;
    }

    res.status(200).json({ ok: true as const, received: rows.length });
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_analytics_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to accept analytics events' });
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
      .select('id, product_mode, user_id, client_id')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const hasAccess = audit.user_id === req.userId || audit.client_id === req.userId;
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
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

    const validation = validateBriefResponses(responses, {
      productMode: audit.product_mode as ProductMode,
      collectionMode,
      surface,
      intakeVersionTuple: intakeTuple,
    });
    const gates = evaluateBriefGates(
      responses,
      audit.product_mode as ProductMode,
      collectionMode,
      surface,
      intakeTuple,
    );

    res.json({
      product_mode: audit.product_mode,
      brief: brief ?? null,
      questions: BRIEF_QUESTIONS,
      validation,
      gates,
      intakeProgress: gates.intakeProgress,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_get_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to get brief' });
  }
});

// ─── POST /api/audits/:id/brief/help-request — Client asks for brief help (optional) ─
auditsRouter.post('/:id/brief/help-request', attachProfile, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    if (req.userRole !== 'client') {
      res.status(403).json({ error: 'Only clients can request brief help from this endpoint' });
      return;
    }

    const rawMsg = req.body?.message;
    const message =
      typeof rawMsg === 'string' ? rawMsg.trim().slice(0, 2000) : '';

    const { data: audit } = await supabase
      .from('audits')
      .select('id, user_id, client_id, company_url, status')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    if (audit.client_id !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if ((audit.status as string) !== 'created') {
      res.status(400).json({ error: 'Help request is only available before the pipeline has started' });
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

    await notifyConsultants(
      'intake',
      'Client requested help with brief',
      message
        ? `A client asked for help with their intake brief (audit ${id.slice(0, 8)}…).`
        : `A client asked for help with their intake brief (audit ${id.slice(0, 8)}…).`,
      {
        audit_id: id,
        route: `/audit/${id}`,
        occurred_at: new Date().toISOString(),
        actor_role: 'client',
        help_message: message || undefined,
      },
    );

    res.json({ ok: true });
  } catch (err) {
    const e = err as Error;
    logger.error('route.brief_help_request_failed', { component: 'audits', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to record help request' });
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
      res.status(400).json({ error: 'responses must be an object' });
      return;
    }

    const allowedModes: IntakeBriefCollectionMode[] = ['self_serve', 'interview', 'pre_brief', 'discovery'];
    let collection_mode: IntakeBriefCollectionMode | undefined;
    if (collectionModeRaw !== undefined && collectionModeRaw !== null && collectionModeRaw !== '') {
      if (typeof collectionModeRaw !== 'string' || !allowedModes.includes(collectionModeRaw as IntakeBriefCollectionMode)) {
        res.status(400).json({ error: 'Invalid collection_mode', code: 'UNKNOWN_MODE' });
        return;
      }
      collection_mode = collectionModeRaw as IntakeBriefCollectionMode;
    }

    // Verify access
    const { data: audit } = await supabase
      .from('audits')
      .select('id, user_id, client_id, product_mode')
      .eq('id', id)
      .single();

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const hasAccess = audit.user_id === req.userId || audit.client_id === req.userId;
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const parsedVersions = parseIntakeVersionsBody(intakeVersionsRaw);
    if (parsedVersions.kind === 'incomplete') {
      res.status(400).json({
        code: 'INCOMPLETE_INTAKE_VERSIONS',
        error: 'intake_versions must include all of questionBankVersion, policyVersion, layoutVersion, resolverVersion, or be omitted.',
      });
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
      res.status(vr.status).json(vr.body);
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
    const liveValidation = validateBriefResponses(brief.responses as Record<string, unknown>, {
      productMode: audit.product_mode as ProductMode,
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
      res.status(400).json({ error: msg });
      return;
    }
    res.status(500).json({ error: 'Failed to save brief' });
  }
});
