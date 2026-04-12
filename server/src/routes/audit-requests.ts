/**
 * Audit Request routes — client self-serve request submission flow.
 *
 * POST   /api/audit-requests              — client submits request
 * GET    /api/audit-requests              — list requests (client: own; consultant: all)
 * GET    /api/audit-requests/:id          — get single request
 * PATCH  /api/audit-requests/:id          — client updates draft
 * POST   /api/audit-requests/:id/submit   — client finalises and submits
 * POST   /api/audit-requests/:id/approve  — consultant approves → creates audit
 * POST   /api/audit-requests/:id/reject   — consultant rejects with note
 * POST   /api/audit-requests/:id/deliver  — consultant marks as delivered
 */
import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest, type UserRole } from '../middleware/auth.js';
import { generalLimiter, createAuditLimiter } from '../middleware/rate-limit.js';
import {
  DEFAULT_AUDIT_PRODUCT_MODE,
  DOMAIN_KEYS,
  EXPRESS_DOMAIN_KEYS,
  reviewPhasesForMode,
  type ProductMode,
} from '../types/audit.js';
import { ensureHttpsUrl } from '@glc/intake-core';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { idempotencyPostAuditRequestApproveKey } from '../config/api-http-paths.js';
import { NO_PUBLIC_WEBSITE_URL, isNoPublicWebsiteUrl } from '../config/no-public-website.js';
import {
  AUDIT_REQUESTS_LIST_DEFAULT_LIMIT,
  AUDIT_REQUESTS_LIST_MAX_LIMIT,
} from '../config/route-query-limits.js';
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import {
  getStoredIdempotentResponse,
  isIdempotencyPayloadConflictError,
  storeIdempotentResponse,
} from '../lib/idempotency.js';
import {
  API_ERROR_CODES,
  AUDIT_INITIALIZATION_FAILED_MESSAGE,
  AUDIT_REQUEST_ACCESS_DENIED_MESSAGE,
  AUDIT_REQUEST_APPROVE_CLAIM_CONFLICT_MESSAGE,
  AUDIT_REQUEST_APPROVE_FAILED_MESSAGE,
  AUDIT_REQUEST_APPROVE_IN_PROGRESS_MESSAGE,
  AUDIT_REQUEST_APPROVE_SEED_FAILED_MESSAGE,
  AUDIT_REQUEST_BRIEF_SNAPSHOT_INDUSTRY_OTHER_MESSAGE,
  AUDIT_REQUEST_CREATE_FAILED_MESSAGE,
  AUDIT_REQUEST_DELIVER_FAILED_MESSAGE,
  AUDIT_REQUEST_DELIVER_UPDATE_FAILED_MESSAGE,
  AUDIT_REQUEST_DELIVER_WRONG_STATUS_MESSAGE,
  AUDIT_REQUEST_FETCH_FAILED_MESSAGE,
  AUDIT_REQUEST_GUEST_FORBIDDEN_MESSAGE,
  AUDIT_REQUEST_LIST_FAILED_MESSAGE,
  AUDIT_REQUEST_NOT_FOUND_MESSAGE,
  AUDIT_REQUEST_PRODUCT_MODE_INVALID_MESSAGE,
  AUDIT_REQUEST_REJECT_FAILED_MESSAGE,
  AUDIT_REQUEST_REJECT_WRONG_STATUS_MESSAGE,
  AUDIT_REQUEST_SUBMIT_FAILED_MESSAGE,
  AUDIT_REQUEST_SUBMIT_MISSING_SITE_MESSAGE,
  AUDIT_REQUEST_SUBMIT_NOT_DRAFT_MESSAGE,
  AUDIT_REQUEST_SUBMIT_WRONG_STATUS_MESSAGE,
  AUDIT_REQUEST_UPDATE_FAILED_MESSAGE,
  AUDIT_REQUEST_URL_OMIT_WHEN_NO_SITE_MESSAGE,
  AUDIT_REQUEST_URL_OR_FLAG_REQUIRED_MESSAGE,
  AUDIT_REQUEST_WRONG_STATUS_FOR_UPDATE_MESSAGE,
  IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';
import { logger } from '../services/logger.js';
import { saveBriefResponses } from '../services/brief-validator.js';
import { emitStructuredNotification } from '../services/notifications.js';
import {
  AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_MESSAGE,
  AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_TITLE,
  AUDIT_REQUEST_NOTIFICATION_CREATED_CONSULTANTS_MESSAGE,
  AUDIT_REQUEST_NOTIFICATION_CREATED_CONSULTANTS_TITLE,
  AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_MESSAGE,
  AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_TITLE,
  AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_MESSAGE,
  AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_TITLE,
  AUDIT_REQUEST_NOTIFICATION_SUBMITTED_CONSULTANTS_MESSAGE,
  AUDIT_REQUEST_NOTIFICATION_SUBMITTED_CONSULTANTS_TITLE,
} from '../config/route-notification-messages.js';

export const auditRequestsRouter = Router();

auditRequestsRouter.use(requireAuth);
auditRequestsRouter.use(attachProfile);
auditRequestsRouter.use((req: AuthRequest, res, next) => {
  if (req.userRole === 'guest') {
    res
      .status(403)
      .json(
        apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_GUEST_FORBIDDEN, AUDIT_REQUEST_GUEST_FORBIDDEN_MESSAGE),
      );
    return;
  }
  next();
});
auditRequestsRouter.use(generalLimiter);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isConsultant(req: AuthRequest) {
  return (req.userRole as UserRole) === 'consultant';
}

/** Ensures Other industry always has a non-empty sector description in brief_snapshot. */
function normalizeBriefSnapshotForIndustry(
  industry: string | null | undefined,
  brief_snapshot: Record<string, unknown>,
): { ok: true; snapshot: Record<string, unknown> } | { ok: false; error: string } {
  const snap = { ...brief_snapshot };
  if ((industry ?? '').trim() === 'Other') {
    const raw = snap.intake_industry_specify;
    const spec = typeof raw === 'string' ? raw.trim() : '';
    if (!spec) {
      return { ok: false, error: AUDIT_REQUEST_BRIEF_SNAPSHOT_INDUSTRY_OTHER_MESSAGE };
    }
    snap.intake_industry_specify = spec;
  } else {
    delete snap.intake_industry_specify;
  }
  return { ok: true, snapshot: snap };
}

/** Seeds intake_brief from portal request row so agents see URL, industry, and Other specify. */
function initialIntakeResponsesFromAuditRequest(row: {
  url: string;
  industry: string | null;
  brief_snapshot: unknown;
}): Record<string, unknown> {
  const snap =
    row.brief_snapshot && typeof row.brief_snapshot === 'object' && !Array.isArray(row.brief_snapshot)
      ? (row.brief_snapshot as Record<string, unknown>)
      : {};
  const out: Record<string, unknown> = {
    a11: { value: row.url, source: 'client' },
  };
  if (row.industry != null && String(row.industry).trim()) {
    out.a2 = { value: String(row.industry).trim(), source: 'client' };
  }
  const spec = snap.intake_industry_specify;
  if (typeof spec === 'string' && spec.trim()) {
    out.intake_industry_specify = { value: spec.trim(), source: 'client' };
  }
  return out;
}

// ── POST /api/audit-requests — Create new request (client or consultant) ────
auditRequestsRouter.post('/', createAuditLimiter, async (req: AuthRequest, res) => {
  try {
    const {
      url,
      industry,
      product_mode = 'express',
      brief_snapshot = {},
      client_notes,
      no_public_website,
    } = req.body;

    const noSite = no_public_website === true;
    let normalizedUrl: string;

    if (noSite) {
      if (url != null && typeof url === 'string' && url.trim() !== '') {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.AUDIT_REQUEST_URL_OMIT_WHEN_NO_SITE,
              AUDIT_REQUEST_URL_OMIT_WHEN_NO_SITE_MESSAGE,
            ),
          );
        return;
      }
      normalizedUrl = NO_PUBLIC_WEBSITE_URL;
    } else {
      if (!url || typeof url !== 'string' || !url.trim()) {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.AUDIT_REQUEST_URL_OR_FLAG_REQUIRED,
              AUDIT_REQUEST_URL_OR_FLAG_REQUIRED_MESSAGE,
            ),
          );
        return;
      }

      const u = ensureHttpsUrl(url);

      try {
        normalizedUrl = await validatePublicAuditUrl(u);
      } catch (e) {
        if (e instanceof PublicUrlNotAllowedError) {
          res.status(400).json(apiErrorJson(e.code, e.message));
          return;
        }
        throw e;
      }
    }

    if (!['express', 'full'].includes(product_mode)) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDIT_REQUEST_PRODUCT_MODE_INVALID,
            AUDIT_REQUEST_PRODUCT_MODE_INVALID_MESSAGE,
          ),
        );
      return;
    }

    const snapIn = brief_snapshot && typeof brief_snapshot === 'object' && !Array.isArray(brief_snapshot)
      ? brief_snapshot as Record<string, unknown>
      : {};
    const snapResult = normalizeBriefSnapshotForIndustry(industry, snapIn);
    if (!snapResult.ok) {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_BRIEF_SNAPSHOT_INVALID, snapResult.error),
        );
      return;
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .insert({
        client_id: req.userId!,
        url: normalizedUrl,
        industry: industry || null,
        product_mode,
        brief_snapshot: snapResult.snapshot,
        client_notes: client_notes ? String(client_notes).slice(0, REQUEST_FIELD_LIMITS.clientNotesMax) : null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    if (data.status === 'submitted') {
      await emitStructuredNotification({
        category: 'request',
        event: 'audit_request_created',
        priority: 'medium',
        audience: 'consultants',
        title: AUDIT_REQUEST_NOTIFICATION_CREATED_CONSULTANTS_TITLE,
        message: AUDIT_REQUEST_NOTIFICATION_CREATED_CONSULTANTS_MESSAGE,
        route: '/admin/requests',
        payload: {
          request_id: data.id,
          status: data.status,
          actor_role: 'client',
        },
      });
    }

    res.status(201).json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_create_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_CREATE_FAILED, AUDIT_REQUEST_CREATE_FAILED_MESSAGE),
      );
  }
});

// ── GET /api/audit-requests — List requests ──────────────────────────────────
auditRequestsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(
      parseInt(String(req.query.limit ?? String(AUDIT_REQUESTS_LIST_DEFAULT_LIMIT)), 10) ||
        AUDIT_REQUESTS_LIST_DEFAULT_LIMIT,
      AUDIT_REQUESTS_LIST_MAX_LIMIT,
    );
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

    let query = supabase
      .from('audit_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Consultants see all requests; clients see only their own
    if (!isConsultant(req)) {
      query = query.eq('client_id', req.userId!);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ data, total: count ?? 0, limit, offset });
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_requests_list_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_LIST_FAILED, AUDIT_REQUEST_LIST_FAILED_MESSAGE));
  }
});

// ── GET /api/audit-requests/:id — Single request ─────────────────────────────
auditRequestsRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    let query = supabase
      .from('audit_requests')
      .select('*')
      .eq('id', id);

    if (!isConsultant(req)) {
      query = query.eq('client_id', req.userId!);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE));
      return;
    }

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_get_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_FETCH_FAILED, AUDIT_REQUEST_FETCH_FAILED_MESSAGE));
  }
});

// ── PATCH /api/audit-requests/:id — Update draft (client only) ───────────────
auditRequestsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { url, industry, product_mode, brief_snapshot, client_notes } = req.body;

    // Verify ownership + draft status
    const { data: existing, error: fetchErr } = await supabase
      .from('audit_requests')
      .select('status, client_id, industry, brief_snapshot')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE));
      return;
    }

    if (!isConsultant(req) && existing.client_id !== req.userId) {
      res
        .status(403)
        .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_ACCESS_DENIED, AUDIT_REQUEST_ACCESS_DENIED_MESSAGE));
      return;
    }

    if (!['draft', 'submitted'].includes(existing.status as string)) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDIT_REQUEST_WRONG_STATUS_FOR_UPDATE,
            AUDIT_REQUEST_WRONG_STATUS_FOR_UPDATE_MESSAGE,
          ),
        );
      return;
    }

    const updates: Record<string, unknown> = {};
    if (url) {
      const normalizedUrl = ensureHttpsUrl(String(url));
      try {
        updates.url = await validatePublicAuditUrl(normalizedUrl);
      } catch (e) {
        if (e instanceof PublicUrlNotAllowedError) {
          res.status(400).json(apiErrorJson(e.code, e.message));
          return;
        }
        throw e;
      }
    }
    if (industry !== undefined) updates.industry = industry || null;
    if (product_mode) updates.product_mode = product_mode;

    const nextIndustry = industry !== undefined ? industry : (existing.industry as string | null);
    let nextSnap = (existing.brief_snapshot as Record<string, unknown>) ?? {};
    if (brief_snapshot !== undefined) {
      nextSnap = { ...nextSnap, ...(brief_snapshot as Record<string, unknown>) };
    }
    if (industry !== undefined || brief_snapshot !== undefined) {
      const snapResult = normalizeBriefSnapshotForIndustry(nextIndustry, nextSnap);
      if (!snapResult.ok) {
        res
          .status(400)
          .json(
            apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_BRIEF_SNAPSHOT_INVALID, snapResult.error),
          );
        return;
      }
      updates.brief_snapshot = snapResult.snapshot;
    }

    if (client_notes !== undefined) {
      updates.client_notes = client_notes ? String(client_notes).slice(0, REQUEST_FIELD_LIMITS.clientNotesMax) : null;
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await emitStructuredNotification({
      category: 'request',
      event: 'audit_request_submitted',
      priority: 'medium',
      audience: 'consultants',
      title: AUDIT_REQUEST_NOTIFICATION_SUBMITTED_CONSULTANTS_TITLE,
      message: AUDIT_REQUEST_NOTIFICATION_SUBMITTED_CONSULTANTS_MESSAGE,
      route: '/admin/requests',
      payload: {
        request_id: data.id,
        status: data.status,
        actor_role: isConsultant(req) ? 'consultant' : 'client',
      },
    });

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_patch_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_UPDATE_FAILED, AUDIT_REQUEST_UPDATE_FAILED_MESSAGE),
      );
  }
});

// ── POST /api/audit-requests/:id/submit — Client submits request ─────────────
auditRequestsRouter.post('/:id/submit', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data: existing } = await supabase
      .from('audit_requests')
      .select('status, client_id, industry, brief_snapshot, url')
      .eq('id', id)
      .single();

    if (!existing) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE));
      return;
    }

    if (!isConsultant(req) && existing.client_id !== req.userId) {
      res
        .status(403)
        .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_ACCESS_DENIED, AUDIT_REQUEST_ACCESS_DENIED_MESSAGE));
      return;
    }

    if (existing.status !== 'draft') {
      res.status(400).json({
        ...apiErrorJson(
          API_ERROR_CODES.AUDIT_REQUEST_SUBMIT_NOT_DRAFT,
          AUDIT_REQUEST_SUBMIT_NOT_DRAFT_MESSAGE,
        ),
        current_status: existing.status as string,
      });
      return;
    }

    const snapResult = normalizeBriefSnapshotForIndustry(
      existing.industry as string | null,
      (existing.brief_snapshot as Record<string, unknown>) ?? {},
    );
    if (!snapResult.ok) {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_BRIEF_SNAPSHOT_INVALID, snapResult.error),
        );
      return;
    }

    const u = String(existing.url ?? '').trim();
    if (
      !u ||
      (!isNoPublicWebsiteUrl(u) && u.length < REQUEST_FIELD_LIMITS.auditCompanyUrlMinNormalizedLength)
    ) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDIT_REQUEST_SUBMIT_MISSING_SITE,
            AUDIT_REQUEST_SUBMIT_MISSING_SITE_MESSAGE,
          ),
        );
      return;
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .update({ status: 'submitted' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_submit_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_SUBMIT_FAILED, AUDIT_REQUEST_SUBMIT_FAILED_MESSAGE));
  }
});

// ── POST /api/audit-requests/:id/approve — Consultant approves → creates audit
auditRequestsRouter.post('/:id/approve', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { consultant_note } = req.body;
    const idempotent = await getStoredIdempotentResponse(req, idempotencyPostAuditRequestApproveKey(id), req.body);
    if (idempotent.replay) {
      res.status(idempotent.replay.statusCode).json(idempotent.replay.payload);
      return;
    }

    const { data: requestRow, error: fetchErr } = await supabase
      .from('audit_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !requestRow) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE));
      return;
    }

    if (!['submitted', 'under_review'].includes(requestRow.status as string)) {
      res.status(400).json({
        ...apiErrorJson(
          API_ERROR_CODES.AUDIT_REQUEST_SUBMIT_WRONG_STATUS,
          AUDIT_REQUEST_SUBMIT_WRONG_STATUS_MESSAGE,
        ),
        current_status: requestRow.status as string,
      });
      return;
    }

    // CAS lock: only one concurrent approve request can claim this row.
    // The winner moves status to under_review before any audit row is created.
    const { data: claimedRows, error: claimErr } = await supabase
      .from('audit_requests')
      .update({ status: 'under_review' })
      .eq('id', id)
      .eq('status', 'submitted')
      .is('audit_id', null)
      .select('id');
    if (claimErr) throw claimErr;

    // If status was already under_review we treat it as actively claimed by another request.
    if ((!claimedRows || claimedRows.length === 0) && requestRow.status === 'submitted') {
      res
        .status(409)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDIT_REQUEST_APPROVE_CLAIM_CONFLICT,
            AUDIT_REQUEST_APPROVE_CLAIM_CONFLICT_MESSAGE,
          ),
        );
      return;
    }
    if (requestRow.status === 'under_review') {
      res
        .status(409)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDIT_REQUEST_APPROVE_IN_PROGRESS,
            AUDIT_REQUEST_APPROVE_IN_PROGRESS_MESSAGE,
          ),
        );
      return;
    }

    // Create audit
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .insert({
        user_id: req.userId!,
        client_id: requestRow.client_id,
        company_url: requestRow.url,
        industry: requestRow.industry,
        product_mode: requestRow.product_mode,
        no_public_website: isNoPublicWebsiteUrl(String(requestRow.url ?? '')),
      })
      .select()
      .single();

    if (auditErr) throw auditErr;

    // Pre-create audit child records — mirror the same mode-aware logic as POST /api/audits
    const requestMode = (requestRow.product_mode ?? DEFAULT_AUDIT_PRODUCT_MODE) as ProductMode;
    const activeDomainKeys = requestMode === 'express' ? EXPRESS_DOMAIN_KEYS : DOMAIN_KEYS;
    const activeReviewPhases = reviewPhasesForMode(requestMode);

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
      ...(requestMode !== 'express' ? [supabase.from('audit_strategy').insert({ audit_id: audit.id })] : []),
    ] as const;

    const results = await Promise.allSettled(childInserts);

    const initFailed = results.some(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
    );

    if (initFailed) {
      await supabase.from('audits').delete().eq('id', audit.id); // CASCADE deletes child rows
      logger.error('Approve request failed during placeholder init', { audit_id: audit.id, request_id: id });
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.AUDIT_INITIALIZATION_FAILED, AUDIT_INITIALIZATION_FAILED_MESSAGE),
        );
      return;
    }

    try {
      await saveBriefResponses(
        audit.id,
        initialIntakeResponsesFromAuditRequest({
          url: requestRow.url as string,
          industry: (requestRow.industry as string | null) ?? null,
          brief_snapshot: requestRow.brief_snapshot,
        }),
      );
    } catch (seedErr) {
      await supabase.from('audits').delete().eq('id', audit.id);
      logger.error('Approve request failed intake brief seed', {
        audit_id: audit.id,
        request_id: id,
        error: (seedErr as Error).message,
      });
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDIT_REQUEST_APPROVE_SEED_FAILED,
            AUDIT_REQUEST_APPROVE_SEED_FAILED_MESSAGE,
          ),
        );
      return;
    }

    // Update request: link audit_id, set status=approved.
    // If this update fails we must also roll back the audit to keep data consistent —
    // otherwise the audit row exists but is not linked to the request.
    const { data: updatedRequest, error: updateErr } = await supabase
      .from('audit_requests')
      .update({
        audit_id: audit.id,
        status: 'approved',
        consultant_note: consultant_note
          ? String(consultant_note).slice(0, REQUEST_FIELD_LIMITS.consultantNoteMax)
          : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      await supabase.from('audits').delete().eq('id', audit.id);
      logger.error('Approve request failed during status update', { audit_id: audit.id, request_id: id, error: updateErr.message });
      throw updateErr;
    }

    const payload = { audit_request: updatedRequest, audit: { id: audit.id, status: audit.status } };
    await storeIdempotentResponse(
      req,
      idempotencyPostAuditRequestApproveKey(id),
      idempotent.key,
      idempotent.hash,
      { statusCode: 201, payload },
      audit.id
    );

    await emitStructuredNotification({
      category: 'request',
      event: 'audit_request_approved',
      priority: 'low',
      audience: 'user',
      userId: requestRow.client_id as string,
      auditId: audit.id as string,
      title: AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_TITLE,
      message: AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_MESSAGE,
      route: `/portal/audit/${audit.id}`,
      payload: {
        request_id: id,
        audit_id: audit.id,
        status: 'approved',
        actor_role: 'consultant',
      },
    });

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
    logger.error('Approve audit request route failed', { error: (err as Error).message });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_APPROVE_FAILED, AUDIT_REQUEST_APPROVE_FAILED_MESSAGE));
  }
});

// ── POST /api/audit-requests/:id/reject — Consultant rejects ─────────────────
auditRequestsRouter.post('/:id/reject', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { consultant_note } = req.body;

    const { data: existing } = await supabase
      .from('audit_requests')
      .select('status, client_id')
      .eq('id', id)
      .single();

    if (!existing) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE));
      return;
    }

    if (!['submitted', 'under_review'].includes(existing.status as string)) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDIT_REQUEST_REJECT_WRONG_STATUS,
            AUDIT_REQUEST_REJECT_WRONG_STATUS_MESSAGE,
          ),
        );
      return;
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .update({
        status: 'rejected',
        consultant_note: consultant_note
          ? String(consultant_note).slice(0, REQUEST_FIELD_LIMITS.consultantNoteMax)
          : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await emitStructuredNotification({
      category: 'request',
      event: 'audit_request_rejected',
      priority: 'medium',
      audience: 'user',
      userId: data.client_id as string,
      title: AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_TITLE,
      message: AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_MESSAGE,
      route: '/portal',
      payload: {
        request_id: id,
        status: 'rejected',
        actor_role: 'consultant',
      },
    });

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_reject_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_REJECT_FAILED, AUDIT_REQUEST_REJECT_FAILED_MESSAGE));
  }
});

// ── POST /api/audit-requests/:id/deliver — Consultant marks delivered ─────────
auditRequestsRouter.post('/:id/deliver', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data: existing } = await supabase
      .from('audit_requests')
      .select('status, client_id, audit_id')
      .eq('id', id)
      .single();

    if (!existing) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE));
      return;
    }

    if (!['approved', 'running'].includes(existing.status as string)) {
      res.status(400).json({
        ...apiErrorJson(
          API_ERROR_CODES.AUDIT_REQUEST_DELIVER_WRONG_STATUS,
          AUDIT_REQUEST_DELIVER_WRONG_STATUS_MESSAGE,
        ),
        current_status: existing.status as string,
      });
      return;
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .update({ status: 'delivered' })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.AUDIT_REQUEST_DELIVER_UPDATE_FAILED,
            AUDIT_REQUEST_DELIVER_UPDATE_FAILED_MESSAGE,
          ),
        );
      return;
    }

    await emitStructuredNotification({
      category: 'request',
      event: 'audit_request_delivered',
      priority: 'low',
      audience: 'user',
      userId: data.client_id as string,
      auditId: (data.audit_id as string | null) ?? null,
      title: AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_TITLE,
      message: AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_MESSAGE,
      route: data.audit_id ? `/portal/audit/${data.audit_id as string}` : '/portal',
      payload: {
        request_id: id,
        audit_id: data.audit_id,
        status: 'delivered',
        actor_role: 'consultant',
      },
    });

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_deliver_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_DELIVER_FAILED, AUDIT_REQUEST_DELIVER_FAILED_MESSAGE));
  }
});
