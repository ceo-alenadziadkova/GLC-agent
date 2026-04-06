/**
 * Public Snapshot Routes — no auth required.
 *
 * POST /api/snapshot        — submit URL for free snapshot, returns { snapshotToken }
 * GET  /api/snapshot/quota — remaining free checks this window (same IP key as POST)
 * GET  /api/snapshot/:token — poll status / fetch result by snapshotToken
 */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../services/supabase.js';
import { PipelineOrchestrator } from '../services/pipeline.js';
import {
  getSnapshotPublicQuota,
  snapshotCompareLimiter,
  snapshotPublicLimiter,
} from '../middleware/rate-limit.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import type { CrawledPage, FreeSnapshotPreview, SnapshotScanCoverageApi } from '../types/audit.js';
import { maybeBuildCompetitorMini } from '../lib/snapshot-competitor.js';
import { logger } from '../services/logger.js';
import { readSnapshotCache, normalizeSnapshotHost } from '../snapshot/cache.js';
import {
  derivePublicUxFieldsFromSnapshotPayload,
  snapshotPayloadToDeterministicApiRecord,
} from '../snapshot/run-snapshot.js';
import { overallToLegacyScore } from '../snapshot/audit/run-audit.js';
import {
  getSnapshotDomainFreshCooldownRetryAfterSecondsAsync,
  isSnapshotDomainFreshCooldownActiveAsync,
  SnapshotAtCapacityError,
} from '../snapshot/abuse-guards.js';
import { getSnapshotMetricsSnapshot } from '../snapshot/snapshot-metrics.js';
import { getSnapshotSharedMetricsForOperator } from '../snapshot/snapshot-operator-metrics-shared.js';
import { deleteSnapshotDomainCache } from '../snapshot/cache.js';

export const snapshotRouter = Router();
const SNAPSHOT_TTL_HOURS = Number(process.env.SNAPSHOT_TOKEN_TTL_HOURS ?? 72);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uxLegacyLabel(score: number): string {
  if (score >= 4) return 'Good';
  if (score >= 3) return 'Moderate';
  if (score >= 2) return 'Needs Work';
  return 'Critical';
}

/** Merge `raw_data.snapshot_deterministic` or cache-derived record into the public preview. */
function applyDeterministicRecordToPreview(
  preview: FreeSnapshotPreview,
  det: Record<string, unknown>,
): void {
  if (typeof det.overall_score === 'number') preview.overall_score = det.overall_score;
  if (det.category_scores && typeof det.category_scores === 'object') {
    preview.category_scores = det.category_scores as FreeSnapshotPreview['category_scores'];
  }
  if (typeof det.scan_basis === 'string') preview.scan_basis = det.scan_basis;
  if (Array.isArray(det.signals_found)) {
    preview.signals_found = det.signals_found as string[];
  }
  if (det.scan_confidence_band === 'high' || det.scan_confidence_band === 'medium' || det.scan_confidence_band === 'low') {
    preview.scan_confidence_band = det.scan_confidence_band;
  }
  if (det.site_profile && typeof det.site_profile === 'object') {
    preview.site_profile = det.site_profile as FreeSnapshotPreview['site_profile'];
  }
  if (
    det.classification_confidence_band === 'high' ||
    det.classification_confidence_band === 'medium' ||
    det.classification_confidence_band === 'low'
  ) {
    preview.classification_confidence_band = det.classification_confidence_band;
  } else if (preview.site_profile?.classificationConfidenceBand) {
    preview.classification_confidence_band = preview.site_profile.classificationConfidenceBand;
  }
  const cov = det.scan_coverage as SnapshotScanCoverageApi | undefined;
  if (cov && typeof cov.budget_ms === 'number' && Array.isArray(cov.pages)) {
    preview.scan_coverage = cov;
  }
  if (typeof det.audit_rules_version === 'number') {
    preview.audit_rules_version = det.audit_rules_version;
  }
  if (det.cache_hit === true) {
    preview.cache_hit = true;
    preview.scan_basis_code = 'cache_hit';
  } else if (
    det.scan_basis_code === 'homepage_only' ||
    det.scan_basis_code === 'homepage_plus_core_pages' ||
    det.scan_basis_code === 'homepage_rendered_fallback' ||
    det.scan_basis_code === 'degraded' ||
    det.scan_basis_code === 'cache_hit'
  ) {
    preview.scan_basis_code = det.scan_basis_code;
  }
  if (typeof det.scanned_at === 'string') {
    preview.scanned_at = det.scanned_at;
  }
  if (Array.isArray(det.limitations)) {
    preview.limitations = det.limitations as string[];
  }
  if (typeof det.classification_version === 'number') {
    preview.classification_version = det.classification_version;
  }
  if (typeof det.fetch_strategy_version === 'string') {
    preview.fetch_strategy_version = det.fetch_strategy_version;
  }
  if (typeof det.snapshot_engine_version === 'string') {
    preview.snapshot_engine_version = det.snapshot_engine_version;
  }
  const hs = det.homepage_snippet;
  if (hs && typeof hs === 'object' && hs !== null) {
    const o = hs as { title?: unknown; description?: unknown };
    const title = typeof o.title === 'string' ? o.title : '';
    const description = typeof o.description === 'string' ? o.description : '';
    if (title.trim() || description.trim()) {
      preview.homepage_snippet = { title, description };
    }
  }
  const tst = det.tech_stack_tentative;
  if (Array.isArray(tst) && tst.length > 0) {
    preview.tech_stack_tentative = tst as FreeSnapshotPreview['tech_stack_tentative'];
  }
  const av = det.ai_visibility as FreeSnapshotPreview['ai_visibility'] | undefined;
  if (av && Array.isArray(av.gaps)) {
    preview.ai_visibility = { gaps: av.gaps };
  }
}

function snapshotOperatorAuthorized(req: import('express').Request): boolean {
  const token = process.env.SNAPSHOT_OPERATOR_TOKEN?.trim();
  if (!token) return false;
  const auth = req.headers.authorization;
  if (auth === `Bearer ${token}`) return true;
  const hdr = req.headers['x-snapshot-operator-token'];
  return typeof hdr === 'string' && hdr === token;
}

/**
 * Public Free UX Snapshot API contract — see docs/API.md (Public Snapshot), docs/PRODUCT.md (product_mode free_snapshot).
 * POST returns 202 + snapshot_token; GET returns status or completed preview.
 * Completed body: company meta, ux score/label/summary, max 2 issues, max 2 quick_wins (trimmed preview).
 */

// ─── GET /api/snapshot/quota — Remaining free checks (no auth, no quota spend) ─
snapshotRouter.get('/quota', async (req, res) => {
  try {
    const quota = await getSnapshotPublicQuota(req);
    res.json(quota);
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.quota_failed', { component: 'snapshot', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to read quota' });
  }
});

// ─── POST /api/snapshot — Start a free snapshot ────────────
snapshotRouter.post('/', snapshotPublicLimiter, async (req, res) => {
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

    const snapHost = normalizeSnapshotHost(url);
    if (snapHost) {
      const cacheHit = await readSnapshotCache(snapHost);
      if (!cacheHit && (await isSnapshotDomainFreshCooldownActiveAsync(snapHost))) {
        const retrySec = await getSnapshotDomainFreshCooldownRetryAfterSecondsAsync(snapHost);
        res.status(429).json({
          error:
            'This website was just scanned from our free tool. Please wait a few minutes before starting another fresh check for the same site.',
          code: 'DOMAIN_FRESH_COOLDOWN',
          retry_after_seconds: retrySec > 0 ? retrySec : undefined,
        });
        return;
      }
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
      logger.error('snapshot.create_audit_failed', { component: 'snapshot', error: auditErr?.message });
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
      logger.error('snapshot.init_placeholders_failed', { component: 'snapshot', audit_id: auditId });
      res.status(500).json({ error: 'Failed to initialize snapshot — rolled back' });
      return;
    }

    // Run pipeline asynchronously — client polls for result
    const orchestrator = new PipelineOrchestrator(auditId);
    orchestrator.runFreeSnapshot().catch((err: Error) => {
      if (err instanceof SnapshotAtCapacityError) {
        logger.warn('snapshot.pipeline_capacity', {
          component: 'snapshot',
          audit_id: auditId,
          error: err.message,
        });
        return;
      }
      logger.error('snapshot.pipeline_unhandled', {
        component: 'snapshot',
        audit_id: auditId,
        error: err.message,
        stack: err.stack,
      });
    });

    res.status(202).json({
      snapshot_token: snapshotToken,
      status: 'running',
    });

  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.post_exception', { component: 'snapshot', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to start snapshot' });
  }
});

// ─── Operator-only (404 when SNAPSHOT_OPERATOR_TOKEN unset; auth via Bearer or X-Snapshot-Operator-Token) ─
snapshotRouter.get('/operator/metrics', async (req, res) => {
  if (!snapshotOperatorAuthorized(req)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  try {
    const shared = await getSnapshotSharedMetricsForOperator();
    res.json({ ...getSnapshotMetricsSnapshot(), ...shared });
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.operator_metrics_failed', { component: 'snapshot', error: e.message });
    res.status(500).json({ error: 'Metrics failed' });
  }
});

snapshotRouter.post('/operator/purge-cache', async (req, res) => {
  if (!snapshotOperatorAuthorized(req)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const host = typeof req.body?.host === 'string' ? req.body.host.trim() : '';
  if (!host) {
    res.status(400).json({ error: 'host is required' });
    return;
  }
  try {
    const ok = await deleteSnapshotDomainCache(host);
    res.json({ ok });
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.operator_purge_failed', { component: 'snapshot', error: e.message });
    res.status(500).json({ error: 'Purge failed' });
  }
});

// ─── GET /api/snapshot/:token — Poll status / fetch result ─
snapshotRouter.get('/:token', snapshotCompareLimiter, async (req, res) => {
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
      res.json({
        status: 'failed',
        snapshot_token: token,
        code: 'SNAPSHOT_FAILED',
      });
      return;
    }

    // Completed — fetch result data; competitor mini is best-effort (never fails the response).
    const [{ data: recon, error: reconErr }, { data: uxDomain, error: uxErr }] = await Promise.all([
      supabase.from('audit_recon')
        .select('company_name, tech_stack, location, pages_crawled')
        .eq('audit_id', audit.id)
        .single(),
      supabase.from('audit_domains')
        .select('score, label, summary, issues, quick_wins, raw_data')
        .eq('audit_id', audit.id)
        .eq('domain_key', 'ux_conversion')
        .order('version', { ascending: false })
        .limit(1)
        .single(),
    ]);
    if (reconErr) {
      logger.warn('snapshot.get_recon_failed', { component: 'snapshot', audit_id: audit.id, error: reconErr.message });
    }
    if (uxErr) {
      logger.warn('snapshot.get_ux_domain_failed', { component: 'snapshot', audit_id: audit.id, error: uxErr.message });
    }

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

    const rawData = uxDomain?.raw_data as Record<string, unknown> | null | undefined;
    const det = rawData?.snapshot_deterministic as Record<string, unknown> | undefined;
    if (det && typeof det === 'object') {
      applyDeterministicRecordToPreview(preview, det);
    }

    const needsDeterministicHeal =
      typeof preview.overall_score !== 'number' ||
      preview.ux_score === null ||
      preview.issues.length === 0;

    if (needsDeterministicHeal) {
      const host = normalizeSnapshotHost(companyUrl);
      const cached = host ? await readSnapshotCache(host) : null;
      if (cached) {
        if (typeof preview.overall_score !== 'number') {
          applyDeterministicRecordToPreview(preview, snapshotPayloadToDeterministicApiRecord(cached));
        }
        const uxFields = derivePublicUxFieldsFromSnapshotPayload(cached);
        if (preview.ux_score === null) {
          preview.ux_score = uxFields.ux_score;
          preview.ux_label = uxFields.ux_label;
          preview.ux_summary = uxFields.ux_summary;
        }
        if (preview.issues.length === 0) {
          preview.issues = uxFields.issues;
        }
        if (preview.quick_wins.length === 0) {
          preview.quick_wins = uxFields.quick_wins;
        }
        if (!preview.homepage_snippet && cached.homepage_snippet) {
          preview.homepage_snippet = cached.homepage_snippet;
        }
        if (
          cached.tech_stack_tentative &&
          cached.tech_stack_tentative.length > 0 &&
          !(preview.tech_stack_tentative && preview.tech_stack_tentative.length > 0)
        ) {
          preview.tech_stack_tentative = cached.tech_stack_tentative;
        }
        if (cached.ai_visibility && !preview.ai_visibility) {
          preview.ai_visibility = cached.ai_visibility;
        }
      }
    }

    if (preview.ux_score === null && typeof preview.overall_score === 'number') {
      preview.ux_score = overallToLegacyScore(preview.overall_score);
      preview.ux_label = uxLegacyLabel(preview.ux_score);
      if (!preview.ux_summary && typeof preview.scan_basis === 'string' && preview.scan_basis.length > 0) {
        const s = preview.scan_basis;
        preview.ux_summary = `${s.slice(0, 280)}${s.length > 280 ? '…' : ''}`;
      }
    }

    const wantCompetitor =
      req.query.compare === '1' ||
      req.query.compare === 'true' ||
      req.query.include_competitor === '1';
    if (wantCompetitor) {
      const competitorSettled = await Promise.allSettled([
        maybeBuildCompetitorMini(companyUrl, pagesCrawled, 3000),
      ]);
      if (competitorSettled[0].status === 'fulfilled' && competitorSettled[0].value) {
        preview.competitor_mini = competitorSettled[0].value;
      }
    }

    res.json(preview);

  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.get_exception', { component: 'snapshot', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});
