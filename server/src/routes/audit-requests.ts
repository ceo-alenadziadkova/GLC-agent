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
  DOMAIN_KEYS,
  REVIEW_AFTER_PHASES,
  EXPRESS_DOMAIN_KEYS,
  reviewPhasesForMode,
  type ProductMode,
} from '../types/audit.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { NO_PUBLIC_WEBSITE_URL, isNoPublicWebsiteUrl } from '../config/no-public-website.js';
import { getStoredIdempotentResponse, storeIdempotentResponse } from '../lib/idempotency.js';
import { logger } from '../services/logger.js';
import { saveBriefResponses } from '../services/brief-validator.js';

export const auditRequestsRouter = Router();

auditRequestsRouter.use(requireAuth);
auditRequestsRouter.use(attachProfile);
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
      return { ok: false, error: 'Describe your industry or sector when you select Other.' };
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
    intake_company_website: { value: row.url, source: 'client' },
  };
  if (row.industry != null && String(row.industry).trim()) {
    out.intake_industry = { value: String(row.industry).trim(), source: 'client' };
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
        res.status(400).json({ error: 'Leave the website field empty when you have no public website.' });
        return;
      }
      normalizedUrl = NO_PUBLIC_WEBSITE_URL;
    } else {
      if (!url || typeof url !== 'string' || !url.trim()) {
        res.status(400).json({ error: 'Enter your website URL, or indicate that you have no public website.' });
        return;
      }

      let u = url.trim();
      if (!u.startsWith('http://') && !u.startsWith('https://')) {
        u = `https://${u}`;
      }

      try {
        normalizedUrl = await validatePublicAuditUrl(u);
      } catch (e) {
        if (e instanceof PublicUrlNotAllowedError) {
          res.status(400).json({ error: 'url is not allowed' });
          return;
        }
        throw e;
      }
    }

    if (!['express', 'full'].includes(product_mode)) {
      res.status(400).json({ error: 'product_mode must be "express" or "full"' });
      return;
    }

    const snapIn = brief_snapshot && typeof brief_snapshot === 'object' && !Array.isArray(brief_snapshot)
      ? brief_snapshot as Record<string, unknown>
      : {};
    const snapResult = normalizeBriefSnapshotForIndustry(industry, snapIn);
    if (!snapResult.ok) {
      res.status(400).json({ error: snapResult.error });
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
        client_notes: client_notes ? String(client_notes).slice(0, 2000) : null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_create_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to create audit request' });
  }
});

// ── GET /api/audit-requests — List requests ──────────────────────────────────
auditRequestsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
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
    res.status(500).json({ error: 'Failed to list audit requests' });
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
      res.status(404).json({ error: 'Audit request not found' });
      return;
    }

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_get_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to fetch audit request' });
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
      res.status(404).json({ error: 'Audit request not found' });
      return;
    }

    if (!isConsultant(req) && existing.client_id !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!['draft', 'submitted'].includes(existing.status as string)) {
      res.status(400).json({ error: 'Only draft or submitted requests can be updated' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (url) {
      let normalizedUrl = String(url).trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      try {
        updates.url = await validatePublicAuditUrl(normalizedUrl);
      } catch (e) {
        if (e instanceof PublicUrlNotAllowedError) {
          res.status(400).json({ error: 'url is not allowed' });
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
        res.status(400).json({ error: snapResult.error });
        return;
      }
      updates.brief_snapshot = snapResult.snapshot;
    }

    if (client_notes !== undefined) updates.client_notes = client_notes ? String(client_notes).slice(0, 2000) : null;

    const { data, error } = await supabase
      .from('audit_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_patch_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to update audit request' });
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
      res.status(404).json({ error: 'Audit request not found' });
      return;
    }

    if (!isConsultant(req) && existing.client_id !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(400).json({ error: 'Only draft requests can be submitted', current_status: existing.status });
      return;
    }

    const snapResult = normalizeBriefSnapshotForIndustry(
      existing.industry as string | null,
      (existing.brief_snapshot as Record<string, unknown>) ?? {},
    );
    if (!snapResult.ok) {
      res.status(400).json({ error: snapResult.error });
      return;
    }

    const u = String(existing.url ?? '').trim();
    if (!u || (!isNoPublicWebsiteUrl(u) && u.length < 10)) {
      res.status(400).json({ error: 'Request is missing a valid website or no-public-website flag.' });
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
    res.status(500).json({ error: 'Failed to submit audit request' });
  }
});

// ── POST /api/audit-requests/:id/approve — Consultant approves → creates audit
auditRequestsRouter.post('/:id/approve', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { consultant_note } = req.body;
    const idempotent = await getStoredIdempotentResponse(req, `POST:/api/audit-requests/${id}/approve`, req.body);
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
      res.status(404).json({ error: 'Audit request not found' });
      return;
    }

    if (!['submitted', 'under_review'].includes(requestRow.status as string)) {
      res.status(400).json({ error: 'Request must be submitted or under review to approve', current_status: requestRow.status });
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
      })
      .select()
      .single();

    if (auditErr) throw auditErr;

    // Pre-create audit child records — mirror the same mode-aware logic as POST /api/audits
    const requestMode = (requestRow.product_mode ?? 'full') as ProductMode;
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
      res.status(500).json({ error: 'Failed to initialize audit — rolled back' });
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
      res.status(500).json({ error: 'Failed to seed intake brief from request' });
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
        consultant_note: consultant_note ? String(consultant_note).slice(0, 1000) : null,
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
      `POST:/api/audit-requests/${id}/approve`,
      idempotent.key,
      idempotent.hash,
      { statusCode: 201, payload },
      audit.id
    );
    res.status(201).json(payload);
  } catch (err) {
    if ((err as Error).message.includes('Idempotency key reuse')) {
      res.status(409).json({ error: (err as Error).message });
      return;
    }
    logger.error('Approve audit request route failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to approve audit request' });
  }
});

// ── POST /api/audit-requests/:id/reject — Consultant rejects ─────────────────
auditRequestsRouter.post('/:id/reject', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { consultant_note } = req.body;

    const { data: existing } = await supabase
      .from('audit_requests')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      res.status(404).json({ error: 'Audit request not found' });
      return;
    }

    if (!['submitted', 'under_review'].includes(existing.status as string)) {
      res.status(400).json({ error: 'Only submitted/under_review requests can be rejected' });
      return;
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .update({
        status: 'rejected',
        consultant_note: consultant_note ? String(consultant_note).slice(0, 1000) : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_reject_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to reject audit request' });
  }
});

// ── POST /api/audit-requests/:id/deliver — Consultant marks delivered ─────────
auditRequestsRouter.post('/:id/deliver', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data: existing } = await supabase
      .from('audit_requests')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      res.status(404).json({ error: 'Audit request not found' });
      return;
    }

    if (!['approved', 'running'].includes(existing.status as string)) {
      res.status(400).json({ error: 'Only approved or running requests can be marked as delivered', current_status: existing.status });
      return;
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .update({ status: 'delivered' })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({ error: 'Failed to update request' });
      return;
    }

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.audit_request_deliver_failed', { component: 'audit_requests', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to mark as delivered' });
  }
});
