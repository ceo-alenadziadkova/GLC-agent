/**
 * Public Snapshot Routes — no auth required.
 *
 * POST /api/snapshot       — submit URL for free snapshot, returns { snapshotToken }
 * GET  /api/snapshot/:token — poll status / fetch result by snapshotToken
 */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../services/supabase.js';
import { PipelineOrchestrator } from '../services/pipeline.js';
import { snapshotPublicLimiter } from '../middleware/rate-limit.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import type { CrawledPage, FreeSnapshotPreview } from '../types/audit.js';
import { maybeBuildCompetitorMini } from '../lib/snapshot-competitor.js';

export const snapshotRouter = Router();
const SNAPSHOT_TTL_HOURS = Number(process.env.SNAPSHOT_TOKEN_TTL_HOURS ?? 72);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

snapshotRouter.use(snapshotPublicLimiter);

/**
 * Public Free UX Snapshot API contract — see docs/API.md (Public Snapshot), docs/PRODUCT.md (product_mode free_snapshot).
 * POST returns 202 + snapshot_token; GET returns status or completed preview.
 * Completed body: company meta, ux score/label/summary, max 2 issues, max 2 quick_wins (trimmed preview).
 */

// ─── POST /api/snapshot — Start a free snapshot ────────────
snapshotRouter.post('/', async (req, res) => {
  try {
    const { company_url } = req.body;

    if (!company_url || typeof company_url !== 'string') {
      res.status(400).json({ error: 'company_url is required' });
      return;
    }

    // Normalize URL
    let url = company_url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
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

    const snapshotToken = randomUUID();

    // Create audit record (no user_id for free_snapshot)
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .insert({
        company_url: url,
        product_mode: 'free_snapshot',
        snapshot_token: snapshotToken,
        token_budget: 80000, // Reduced budget for free snapshot
      })
      .select('id')
      .single();

    if (auditErr || !audit) {
      console.error('[POST /api/snapshot] DB error:', auditErr);
      res.status(500).json({ error: 'Failed to create snapshot' });
      return;
    }

    const auditId = audit.id as string;

    // Pre-create required child records
    const initResults = await Promise.allSettled([
      supabase.from('audit_recon').insert({ audit_id: auditId }),
      supabase.from('audit_domains').insert({
        audit_id: auditId,
        domain_key: 'ux_conversion',
        phase_number: 4,
      }),
    ]);

    const initFailed = initResults.some(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
    );

    if (initFailed) {
      await supabase.from('audits').delete().eq('id', auditId);
      console.error('[POST /api/snapshot] Placeholder init failed, rolled back audit', auditId);
      res.status(500).json({ error: 'Failed to initialize snapshot — rolled back' });
      return;
    }

    // Run pipeline asynchronously — client polls for result
    const orchestrator = new PipelineOrchestrator(auditId);
    orchestrator.runFreeSnapshot().catch((err: Error) => {
      console.error(`[FreeSnapshot ${auditId}] Unhandled error:`, err.message);
    });

    res.status(202).json({
      snapshot_token: snapshotToken,
      status: 'running',
    });

  } catch (err) {
    console.error('[POST /api/snapshot]', err);
    res.status(500).json({ error: 'Failed to start snapshot' });
  }
});

// ─── GET /api/snapshot/:token — Poll status / fetch result ─
snapshotRouter.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || !UUID_V4_RE.test(token)) {
      res.status(400).json({ error: 'Invalid snapshot token' });
      return;
    }

    // Fetch audit by snapshot_token
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select('id, status, company_url, company_name, product_mode, created_at')
      .eq('snapshot_token', token)
      .eq('product_mode', 'free_snapshot') // Safety: only expose free snapshots
      .single();

    if (auditErr || !audit) {
      res.status(404).json({ error: 'Snapshot not found' });
      return;
    }

    const status = audit.status as string;
    const createdAt = new Date(audit.created_at as string).getTime();
    if (!Number.isFinite(createdAt)) {
      await supabase
        .from('audits')
        .update({ snapshot_token: null })
        .eq('id', audit.id)
        .eq('product_mode', 'free_snapshot');
      res.status(410).json({ error: 'Snapshot token expired' });
      return;
    }
    const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
    if (ageHours > SNAPSHOT_TTL_HOURS) {
      // Best-effort token invalidation so leaked URLs stop working permanently.
      await supabase
        .from('audits')
        .update({ snapshot_token: null })
        .eq('id', audit.id)
        .eq('product_mode', 'free_snapshot');
      res.status(410).json({ error: 'Snapshot token expired' });
      return;
    }

    // Still running — return status only
    if (status !== 'completed' && status !== 'failed') {
      res.json({ status, snapshot_token: token });
      return;
    }

    if (status === 'failed') {
      res.json({ status: 'failed', snapshot_token: token });
      return;
    }

    // Completed — fetch result data; competitor mini is best-effort (never fails the response).
    const [{ data: recon }, { data: uxDomain }] = await Promise.all([
      supabase.from('audit_recon')
        .select('company_name, tech_stack, location, pages_crawled')
        .eq('audit_id', audit.id)
        .single(),
      supabase.from('audit_domains')
        .select('score, label, summary, issues, quick_wins')
        .eq('audit_id', audit.id)
        .eq('domain_key', 'ux_conversion')
        .order('version', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const pagesCrawled = (recon?.pages_crawled as CrawledPage[] | null) ?? null;
    const companyUrl = audit.company_url as string;

    const preview: FreeSnapshotPreview = {
      audit_id: audit.id as string,
      snapshot_token: token,
      status: 'completed',
      company_url: companyUrl,
      company_name: (recon?.company_name as string | null) ?? (audit.company_name as string | null) ?? null,
      tech_stack: (recon?.tech_stack as Record<string, string[]>) ?? {},
      location: (recon?.location as string | null) ?? null,
      ux_score: (uxDomain?.score as number | null) ?? null,
      ux_label: (uxDomain?.label as string | null) ?? null,
      ux_summary: (uxDomain?.summary as string | null) ?? null,
      issues: ((uxDomain?.issues as unknown[]) ?? []).slice(0, 2) as FreeSnapshotPreview['issues'],
      quick_wins: ((uxDomain?.quick_wins as unknown[]) ?? []).slice(0, 2) as FreeSnapshotPreview['quick_wins'],
    };

    const competitorSettled = await Promise.allSettled([
      maybeBuildCompetitorMini(companyUrl, pagesCrawled, 3000),
    ]);
    if (competitorSettled[0].status === 'fulfilled' && competitorSettled[0].value) {
      preview.competitor_mini = competitorSettled[0].value;
    }

    res.json(preview);

  } catch (err) {
    console.error('[GET /api/snapshot/:token]', err);
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});
