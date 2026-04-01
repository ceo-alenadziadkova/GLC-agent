import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { createAuditLimiter, generalLimiter } from '../middleware/rate-limit.js';
import {
  DOMAIN_KEYS,
  REVIEW_AFTER_PHASES,
  EXPRESS_DOMAIN_KEYS,
  EXPRESS_REVIEW_AFTER_PHASES,
  reviewPhasesForMode,
  type ProductMode,
} from '../types/audit.js';
import { evaluateBriefGates, saveBriefResponses, validateBriefResponses } from '../services/brief-validator.js';
import { BRIEF_QUESTIONS } from '../schemas/intake-brief.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { NO_PUBLIC_WEBSITE_URL } from '../config/no-public-website.js';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';
import { getStoredIdempotentResponse, storeIdempotentResponse } from '../lib/idempotency.js';
import { logger } from '../services/logger.js';

export const auditsRouter = Router();

// All audit routes require authentication
auditsRouter.use(requireAuth);
auditsRouter.use(generalLimiter);

const consultantGuard = [attachProfile, requireRole('consultant')] as const;

// ─── POST /api/audits — Create new audit (consultant only) ─
auditsRouter.post('/', ...consultantGuard, createAuditLimiter, async (req: AuthRequest, res) => {
  try {
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

      // Normalize URL BEFORE validation — prevents double-prefix like "https://http://..."
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

    // Create audit
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .insert({
        user_id: req.userId!,
        company_url: url,
        company_name: company_name || null,
        industry: industry || null,
        product_mode: mode,
      })
      .select()
      .single();

    if (auditErr) throw auditErr;

    // Pre-create placeholder records appropriate for this product mode.
    // Express: 4 domains, 2 review gates, no strategy row.
    // Full: 6 domains, 3 review gates, strategy row.
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
      // Express mode skips the strategy phase entirely
      ...(mode !== 'express' ? [supabase.from('audit_strategy').insert({ audit_id: audit.id })] : []),
    ] as const;

    const results = await Promise.allSettled(childInserts);

    const initFailed = results.some(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
    );

    if (initFailed) {
      // Rollback — CASCADE DELETE removes all child records
      await supabase.from('audits').delete().eq('id', audit.id);
      logger.error('Audit initialization failed, rollback applied', { audit_id: audit.id });
      res.status(500).json({ error: 'Failed to initialize audit — rolled back' });
      return;
    }

    const payload = { id: audit.id, status: audit.status };
    await storeIdempotentResponse(req, 'POST:/api/audits', idempotent.key, idempotent.hash, { statusCode: 201, payload }, audit.id);
    res.status(201).json(payload);
  } catch (err) {
    if ((err as Error).message.includes('Idempotency key reuse')) {
      res.status(409).json({ error: (err as Error).message });
      return;
    }
    logger.error('Create audit route failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// ─── GET /api/audits — List user's audits (paginated) ──────
// Query params: ?limit=20&offset=0 (defaults: limit=50, offset=0)
auditsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

    const uid = req.userId!;
    const userFilter = safeOrUserFilter(uid);
    const { data, error, count } = await supabase
      .from('audits')
      .select('id, company_url, company_name, industry, status, current_phase, overall_score, tokens_used, created_at, updated_at', { count: 'exact' })
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
auditsRouter.get('/:id', async (req: AuthRequest, res) => {
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

// ─── GET /api/audits/:id/brief — Get brief + questions ─────────────────────
// Accessible by any authenticated user who owns or requested this audit.
auditsRouter.get('/:id/brief', async (req: AuthRequest, res) => {
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

    // Compute validation stats live
    const responses = (brief?.responses as Record<string, unknown>) ?? {};
    const validation = validateBriefResponses(responses);
    const gates = evaluateBriefGates(responses, audit.product_mode as ProductMode);

    res.json({
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

// ─── PUT /api/audits/:id/brief — Save brief responses ──────────────────────
// Accessible by owner (consultant) or client who submitted the request.
// Idempotent upsert — call repeatedly as user fills the form.
auditsRouter.put('/:id/brief', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { responses } = req.body;

    if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
      res.status(400).json({ error: 'responses must be an object' });
      return;
    }

    // Verify access
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

    const { brief, gates } = await saveBriefResponses(id, responses as Record<string, unknown>);
    const liveValidation = validateBriefResponses(brief.responses as Record<string, unknown>);

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
