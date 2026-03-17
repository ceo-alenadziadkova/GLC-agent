import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createAuditLimiter, generalLimiter } from '../middleware/rate-limit.js';
import { DOMAIN_KEYS, REVIEW_AFTER_PHASES } from '../types/audit.js';

export const auditsRouter = Router();

// All audit routes require authentication
auditsRouter.use(requireAuth);
auditsRouter.use(generalLimiter);

// ─── POST /api/audits — Create new audit ───────────────────
auditsRouter.post('/', createAuditLimiter, async (req: AuthRequest, res) => {
  try {
    const { company_url, company_name, industry } = req.body;

    if (!company_url || typeof company_url !== 'string' || company_url.length < 5) {
      res.status(400).json({ error: 'company_url is required (min 5 characters)' });
      return;
    }

    // Normalize URL
    let url = company_url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    // Create audit
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .insert({
        user_id: req.userId!,
        company_url: url,
        company_name: company_name || null,
        industry: industry || null,
      })
      .select()
      .single();

    if (auditErr) throw auditErr;

    // Pre-create all placeholder records in parallel.
    // If any INSERT fails we roll back by deleting the audit (CASCADE handles the rest).
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
      // Rollback — CASCADE DELETE removes all child records
      await supabase.from('audits').delete().eq('id', audit.id);
      console.error('[POST /api/audits] Placeholder init failed, rolled back audit', audit.id);
      res.status(500).json({ error: 'Failed to initialize audit — rolled back' });
      return;
    }

    res.status(201).json({ id: audit.id, status: audit.status });
  } catch (err) {
    console.error('[POST /api/audits]', err);
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// ─── GET /api/audits — List user's audits (paginated) ──────
// Query params: ?limit=20&offset=0 (defaults: limit=50, offset=0)
auditsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

    const { data, error, count } = await supabase
      .from('audits')
      .select('id, company_url, company_name, industry, status, current_phase, overall_score, tokens_used, created_at, updated_at', { count: 'exact' })
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ data, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error('[GET /api/audits]', err);
    res.status(500).json({ error: 'Failed to list audits' });
  }
});

// ─── GET /api/audits/:id — Full audit state ────────────────
auditsRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    // Fetch audit (RLS ensures ownership)
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single();

    if (auditErr || !audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    // Fetch related data in parallel — use allSettled so a single DB error
    // returns partial data rather than a 500 for the entire request.
    const [reconRes, domainsRes, strategyRes, reviewsRes] = await Promise.allSettled([
      supabase.from('audit_recon').select('*').eq('audit_id', id).single(),
      supabase.from('audit_domains').select('*').eq('audit_id', id).order('phase_number'),
      supabase.from('audit_strategy').select('*').eq('audit_id', id).single(),
      supabase.from('review_points').select('*').eq('audit_id', id).order('after_phase'),
    ]);

    const recon = reconRes.status === 'fulfilled' ? (reconRes.value.data ?? null) : null;
    const domainsArr = domainsRes.status === 'fulfilled' ? (domainsRes.value.data ?? []) : [];
    const strategy = strategyRes.status === 'fulfilled' ? (strategyRes.value.data ?? null) : null;
    const reviews = reviewsRes.status === 'fulfilled' ? (reviewsRes.value.data ?? []) : [];

    // Build domains map (latest version per domain_key)
    const domainsMap: Record<string, unknown> = {};
    for (const d of domainsArr) {
      const existing = domainsMap[d.domain_key] as { version?: number } | undefined;
      if (!existing || (d.version > (existing.version ?? 0))) {
        domainsMap[d.domain_key] = d;
      }
    }

    res.json({
      meta: audit,
      recon,
      domains: domainsMap,
      strategy,
      reviews,
    });
  } catch (err) {
    console.error('[GET /api/audits/:id]', err);
    res.status(500).json({ error: 'Failed to fetch audit' });
  }
});

// ─── DELETE /api/audits/:id — Delete audit (CASCADE) ───────
auditsRouter.delete('/:id', async (req: AuthRequest, res) => {
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
    console.error('[DELETE /api/audits/:id]', err);
    res.status(500).json({ error: 'Failed to delete audit' });
  }
});
