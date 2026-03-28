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
import { DOMAIN_KEYS, REVIEW_AFTER_PHASES } from '../types/audit.js';

export const auditRequestsRouter = Router();

auditRequestsRouter.use(requireAuth);
auditRequestsRouter.use(attachProfile);
auditRequestsRouter.use(generalLimiter);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isConsultant(req: AuthRequest) {
  return (req.userRole as UserRole) === 'consultant';
}

// ── POST /api/audit-requests — Create new request (client or consultant) ────
auditRequestsRouter.post('/', createAuditLimiter, async (req: AuthRequest, res) => {
  try {
    const { url, industry, product_mode = 'express', brief_snapshot = {}, client_notes } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      res.status(400).json({ error: 'url must be a valid URL (e.g. https://company.com)' });
      return;
    }

    if (!['express', 'full'].includes(product_mode)) {
      res.status(400).json({ error: 'product_mode must be "express" or "full"' });
      return;
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .insert({
        client_id: req.userId!,
        url: normalizedUrl,
        industry: industry || null,
        product_mode,
        brief_snapshot: brief_snapshot ?? {},
        client_notes: client_notes ? String(client_notes).slice(0, 2000) : null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('[POST /api/audit-requests]', err);
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
    console.error('[GET /api/audit-requests]', err);
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
    console.error('[GET /api/audit-requests/:id]', err);
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
      .select('status, client_id')
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
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      updates.url = normalizedUrl;
    }
    if (industry !== undefined) updates.industry = industry || null;
    if (product_mode) updates.product_mode = product_mode;
    if (brief_snapshot !== undefined) updates.brief_snapshot = brief_snapshot;
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
    console.error('[PATCH /api/audit-requests/:id]', err);
    res.status(500).json({ error: 'Failed to update audit request' });
  }
});

// ── POST /api/audit-requests/:id/submit — Client submits request ─────────────
auditRequestsRouter.post('/:id/submit', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data: existing } = await supabase
      .from('audit_requests')
      .select('status, client_id')
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

    const { data, error } = await supabase
      .from('audit_requests')
      .update({ status: 'submitted' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('[POST /api/audit-requests/:id/submit]', err);
    res.status(500).json({ error: 'Failed to submit audit request' });
  }
});

// ── POST /api/audit-requests/:id/approve — Consultant approves → creates audit
auditRequestsRouter.post('/:id/approve', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { consultant_note } = req.body;

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

    // Pre-create audit child records
    const reviewInserts = REVIEW_AFTER_PHASES.map(phase => ({
      audit_id: audit.id,
      after_phase: phase,
    }));

    const domainInserts = DOMAIN_KEYS.map((key, i) => ({
      audit_id: audit.id,
      domain_key: key,
      phase_number: i + 1,
    }));

    const [reviewRes, domainsRes, reconRes, strategyRes] = await Promise.allSettled([
      supabase.from('review_points').insert(reviewInserts),
      supabase.from('audit_domains').insert(domainInserts),
      supabase.from('audit_recon').insert({ audit_id: audit.id }),
      supabase.from('audit_strategy').insert({ audit_id: audit.id }),
    ]);

    const initFailed = [reviewRes, domainsRes, reconRes, strategyRes].some(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
    );

    if (initFailed) {
      await supabase.from('audits').delete().eq('id', audit.id);
      res.status(500).json({ error: 'Failed to initialize audit — rolled back' });
      return;
    }

    // Update request: link audit_id, set status=approved
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

    if (updateErr) throw updateErr;

    res.status(201).json({ audit_request: updatedRequest, audit: { id: audit.id, status: audit.status } });
  } catch (err) {
    console.error('[POST /api/audit-requests/:id/approve]', err);
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
    console.error('[POST /api/audit-requests/:id/reject]', err);
    res.status(500).json({ error: 'Failed to reject audit request' });
  }
});

// ── POST /api/audit-requests/:id/deliver — Consultant marks delivered ─────────
auditRequestsRouter.post('/:id/deliver', requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data, error } = await supabase
      .from('audit_requests')
      .update({ status: 'delivered' })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Audit request not found' });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[POST /api/audit-requests/:id/deliver]', err);
    res.status(500).json({ error: 'Failed to mark as delivered' });
  }
});
