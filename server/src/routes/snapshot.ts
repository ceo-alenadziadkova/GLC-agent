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
import type { FreeSnapshotPreview } from '../types/audit.js';

export const snapshotRouter = Router();

// Rate limit: no more than 5 snapshot requests per IP per hour
// (handled by general rate limiter in index.ts for now)

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
      new URL(url);
    } catch {
      res.status(400).json({ error: 'company_url must be a valid URL (e.g. example.com)' });
      return;
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
    await Promise.all([
      supabase.from('audit_recon').insert({ audit_id: auditId }),
      supabase.from('audit_domains').insert({
        audit_id: auditId,
        domain_key: 'ux_conversion',
        phase_number: 4,
      }),
    ]);

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

    if (!token || token.length < 32) {
      res.status(400).json({ error: 'Invalid snapshot token' });
      return;
    }

    // Fetch audit by snapshot_token
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select('id, status, company_url, company_name, product_mode')
      .eq('snapshot_token', token)
      .eq('product_mode', 'free_snapshot') // Safety: only expose free snapshots
      .single();

    if (auditErr || !audit) {
      res.status(404).json({ error: 'Snapshot not found' });
      return;
    }

    const status = audit.status as string;

    // Still running — return status only
    if (status !== 'completed' && status !== 'failed') {
      res.json({ status, snapshot_token: token });
      return;
    }

    if (status === 'failed') {
      res.json({ status: 'failed', snapshot_token: token });
      return;
    }

    // Completed — fetch result data
    const [{ data: recon }, { data: uxDomain }] = await Promise.all([
      supabase.from('audit_recon')
        .select('company_name, tech_stack, location')
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

    const preview: FreeSnapshotPreview = {
      audit_id: audit.id as string,
      snapshot_token: token,
      status: 'completed',
      company_url: audit.company_url as string,
      company_name: (recon?.company_name as string | null) ?? (audit.company_name as string | null) ?? null,
      tech_stack: (recon?.tech_stack as Record<string, string[]>) ?? {},
      location: (recon?.location as string | null) ?? null,
      ux_score: (uxDomain?.score as number | null) ?? null,
      ux_label: (uxDomain?.label as string | null) ?? null,
      ux_summary: (uxDomain?.summary as string | null) ?? null,
      issues: ((uxDomain?.issues as unknown[]) ?? []).slice(0, 2) as FreeSnapshotPreview['issues'],
      quick_wins: ((uxDomain?.quick_wins as unknown[]) ?? []).slice(0, 2) as FreeSnapshotPreview['quick_wins'],
    };

    res.json(preview);

  } catch (err) {
    console.error('[GET /api/snapshot/:token]', err);
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});
