/**
 * Public Snapshot Routes — no auth required for start/poll.
 *
 * POST /api/snapshot        — submit URL for free snapshot (guest httpOnly cookie + funnel row)
 * POST /api/snapshot/claim  — attach snapshot audit to authenticated user (JWT)
 * GET  /api/snapshot/quota — remaining free checks this window (same IP key as POST)
 * GET  /api/snapshot/:token — poll status / fetch result by snapshotToken
 */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../services/supabase.js';
import { PipelineOrchestrator } from '../services/pipeline.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { resolveSelfServeAuditOwnerUserId } from '../lib/self-serve-audit-owner.js';
import {
  extractUtmFromBody,
  getOrIssueSnapshotGuestToken,
  hashSnapshotGuestIp,
} from '../lib/guest-session.js';
import {
  getSnapshotPublicQuota,
  snapshotCompareLimiter,
  snapshotPublicLimiter,
} from '../middleware/rate-limit.js';
import { ensureHttpsUrl } from '@glc/intake-core';
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../lib/public-http-url.js';
import type { CrawledPage, FreeSnapshotPreview, SnapshotScanCoverageApi } from '../types/audit.js';
import { maybeBuildCompetitorMini } from '../lib/snapshot-competitor.js';
import { logger } from '../services/logger.js';
import { emitStructuredNotification } from '../services/notifications.js';
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
import { computePublicSnapshotAccessFlags } from '../snapshot/snapshot-access-state.js';
import { normalizeScanCoverageFromStoredJson } from '@glc/snapshot-scan-coverage';
import {
  getFreeSnapshotTokenBudget,
  getGuestFunnelRetentionMs,
  SNAPSHOT_COMPETITOR_TIMEOUT_MS,
  SNAPSHOT_GUEST_HEADER_MAX_LEN,
  SNAPSHOT_TOKEN_TTL_HOURS,
  SNAPSHOT_UX_SUMMARY_MAX_CHARS,
} from '../config/snapshot-public.js';
import {
  API_ERROR_CODES,
  SNAPSHOT_CLAIM_CONFLICT_MESSAGE,
  SNAPSHOT_CLAIM_FAILED_MESSAGE,
  SNAPSHOT_COMPANY_URL_REQUIRED_MESSAGE,
  SNAPSHOT_CREATE_FAILED_MESSAGE,
  SNAPSHOT_DOMAIN_FRESH_COOLDOWN_MESSAGE,
  SNAPSHOT_FETCH_FAILED_MESSAGE,
  SNAPSHOT_FAILED_MESSAGE,
  SNAPSHOT_HOST_REQUIRED_MESSAGE,
  SNAPSHOT_INIT_ROLLBACK_MESSAGE,
  SNAPSHOT_INVALID_TOKEN_MESSAGE,
  SNAPSHOT_METRICS_FAILED_MESSAGE,
  SNAPSHOT_NOT_FOUND_MESSAGE,
  SNAPSHOT_PURGE_FAILED_MESSAGE,
  SNAPSHOT_QUOTA_READ_FAILED_MESSAGE,
  SNAPSHOT_RESOURCE_NOT_FOUND_MESSAGE,
  SNAPSHOT_START_FAILED_MESSAGE,
  SNAPSHOT_TOKEN_EXPIRED_MESSAGE,
  SNAPSHOT_TOKEN_REQUIRED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';
import {
  SNAPSHOT_CLAIMED_NOTIFICATION_MESSAGE_EN,
  SNAPSHOT_CLAIMED_NOTIFICATION_TITLE_EN,
  SNAPSHOT_STARTED_NOTIFICATION_TITLE,
  snapshotClaimedInAppRoute,
  snapshotStartedNotificationMessage,
} from '../config/route-notification-messages.js';

export const snapshotRouter = Router();

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Best-effort funnel row for public snapshot (cookie-bound guest). */
async function upsertSnapshotGuestSessionRow(params: {
  guestToken: string;
  snapshotToken: string;
  companyUrl: string;
  utm: ReturnType<typeof extractUtmFromBody>;
  req: import('express').Request;
}): Promise<void> {
  const ipHash = hashSnapshotGuestIp(params.req);
  const uaRaw = params.req.headers['user-agent'];
  const ua =
    typeof uaRaw === 'string' ? uaRaw.slice(0, SNAPSHOT_GUEST_HEADER_MAX_LEN) : null;
  const refRaw = params.req.headers.referer;
  const referrer =
    typeof refRaw === 'string' ? refRaw.slice(0, SNAPSHOT_GUEST_HEADER_MAX_LEN) : null;
  const expiresAt = new Date(Date.now() + getGuestFunnelRetentionMs()).toISOString();

  const { error } = await supabase.from('snapshot_guest_sessions').upsert(
    {
      guest_session_token: params.guestToken,
      snapshot_token: params.snapshotToken,
      status: 'running',
      company_url: params.companyUrl,
      utm_source: params.utm.utm_source,
      utm_medium: params.utm.utm_medium,
      utm_campaign: params.utm.utm_campaign,
      referrer,
      user_agent: ua,
      ip_hash: ipHash,
      expires_at: expiresAt,
      claimed_by_user_id: null,
      claimed_at: null,
    },
    { onConflict: 'guest_session_token' },
  );

  if (error) {
    logger.warn('snapshot.guest_session_upsert_failed', {
      component: 'snapshot',
      message: error.message,
      code: (error as { code?: string }).code,
    });
  } else {
    logger.info('snapshot.guest_session_upsert_ok', {
      component: 'snapshot',
      snapshot_token: params.snapshotToken,
    });
  }
}

async function updateGuestSessionPollStatus(snapshotToken: string, status: 'completed' | 'failed'): Promise<void> {
  const { error } = await supabase
    .from('snapshot_guest_sessions')
    .update({ status })
    .eq('snapshot_token', snapshotToken);
  if (error) {
    logger.debug('snapshot.guest_session_poll_update_skipped', {
      component: 'snapshot',
      snapshot_token: snapshotToken,
      message: error.message,
    });
  }
}

function normalizeSnapshotScanCoverageFromStoredDet(stored: unknown): SnapshotScanCoverageApi | null {
  return normalizeScanCoverageFromStoredJson(stored) as SnapshotScanCoverageApi | null;
}

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
  const normalizedCov = normalizeSnapshotScanCoverageFromStoredDet(det.scan_coverage);
  if (normalizedCov) {
    preview.scan_coverage = normalizedCov;
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
  if (det.classification_transparency && typeof det.classification_transparency === 'object') {
    preview.classification_transparency =
      det.classification_transparency as FreeSnapshotPreview['classification_transparency'];
  }
  if (typeof det.fetch_strategy_version === 'string') {
    preview.fetch_strategy_version = det.fetch_strategy_version;
  }
  if (typeof det.snapshot_engine_version === 'string') {
    preview.snapshot_engine_version = det.snapshot_engine_version;
  }
  if (det.snapshot_access_blocked === true) {
    preview.snapshot_access_blocked = true;
    preview.snapshot_access_robots_blocked = det.snapshot_access_robots_blocked === true;
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
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_QUOTA_READ_FAILED, SNAPSHOT_QUOTA_READ_FAILED_MESSAGE));
  }
});

// ─── POST /api/snapshot/claim — Save snapshot to account (after login) ───────
snapshotRouter.post('/claim', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body as { snapshot_token?: unknown };
    const raw = body?.snapshot_token;
    const snapshotToken = typeof raw === 'string' ? raw.trim() : '';
    if (!snapshotToken || !UUID_V4_RE.test(snapshotToken)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_TOKEN_REQUIRED, SNAPSHOT_TOKEN_REQUIRED_MESSAGE));
      return;
    }

    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select('id, client_id, created_at, product_mode, snapshot_token')
      .eq('snapshot_token', snapshotToken)
      .eq('product_mode', 'free_snapshot')
      .single();

    if (auditErr || !audit) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_NOT_FOUND, SNAPSHOT_NOT_FOUND_MESSAGE));
      return;
    }

    const createdAt = new Date(audit.created_at as string).getTime();
    if (!Number.isFinite(createdAt)) {
      res
        .status(410)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_TOKEN_EXPIRED, SNAPSHOT_TOKEN_EXPIRED_MESSAGE));
      return;
    }
    const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
    if (ageHours > SNAPSHOT_TOKEN_TTL_HOURS) {
      res
        .status(410)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_TOKEN_EXPIRED, SNAPSHOT_TOKEN_EXPIRED_MESSAGE));
      return;
    }

    const userId = req.userId!;
    const existingClient = audit.client_id as string | null;

    if (existingClient === userId) {
      await supabase
        .from('snapshot_guest_sessions')
        .update({
          status: 'claimed',
          claimed_by_user_id: userId,
          claimed_at: new Date().toISOString(),
        })
        .eq('snapshot_token', snapshotToken);
      res.json({
        ok: true,
        audit_id: audit.id as string,
        already_claimed: true,
      });
      return;
    }

    if (existingClient != null && existingClient !== userId) {
      logger.info('snapshot.claim_conflict', {
        component: 'snapshot',
        audit_id: audit.id,
      });
      res
        .status(409)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_CLAIM_CONFLICT, SNAPSHOT_CLAIM_CONFLICT_MESSAGE));
      return;
    }

    const { data: updated, error: updErr } = await supabase
      .from('audits')
      .update({ client_id: userId })
      .eq('id', audit.id)
      .eq('product_mode', 'free_snapshot')
      .is('client_id', null)
      .select('id')
      .maybeSingle();

    if (updErr || !updated) {
      const { data: again } = await supabase
        .from('audits')
        .select('id, client_id')
        .eq('id', audit.id)
        .single();
      if (again?.client_id === userId) {
        res.json({
          ok: true,
          audit_id: again.id as string,
          already_claimed: true,
        });
        return;
      }
      logger.info('snapshot.claim_conflict', { component: 'snapshot', audit_id: audit.id });
      res
        .status(409)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_CLAIM_CONFLICT, SNAPSHOT_CLAIM_CONFLICT_MESSAGE));
      return;
    }

    await supabase
      .from('snapshot_guest_sessions')
      .update({
        status: 'claimed',
        claimed_by_user_id: userId,
        claimed_at: new Date().toISOString(),
      })
      .eq('snapshot_token', snapshotToken);

    logger.info('snapshot.claim_success', {
      component: 'snapshot',
      audit_id: updated.id,
      user_id: userId,
    });

    await emitStructuredNotification({
      category: 'snapshot',
      event: 'snapshot_claimed',
      priority: 'low',
      audience: 'consultants',
      auditId: updated.id as string,
      title: SNAPSHOT_CLAIMED_NOTIFICATION_TITLE_EN,
      message: SNAPSHOT_CLAIMED_NOTIFICATION_MESSAGE_EN,
      route: snapshotClaimedInAppRoute(updated.id as string),
      payload: {
        audit_id: updated.id,
        claimed_by_user_id: userId,
        actor_role: 'client',
      },
    });

    res.json({
      ok: true,
      audit_id: updated.id as string,
      already_claimed: false,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.claim_exception', { component: 'snapshot', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_CLAIM_FAILED, SNAPSHOT_CLAIM_FAILED_MESSAGE));
  }
});

// ─── POST /api/snapshot — Start a free snapshot ────────────
snapshotRouter.post('/', snapshotPublicLimiter, async (req, res) => {
  try {
    const { company_url } = req.body;

    if (!company_url || typeof company_url !== 'string') {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.SNAPSHOT_COMPANY_URL_REQUIRED, SNAPSHOT_COMPANY_URL_REQUIRED_MESSAGE),
        );
      return;
    }

    const guestToken = getOrIssueSnapshotGuestToken(req, res);
    const utm = extractUtmFromBody(req.body);

    let url = ensureHttpsUrl(company_url);

    try {
      url = await validatePublicAuditUrl(url);
    } catch (e) {
      if (e instanceof PublicUrlNotAllowedError) {
        res.status(400).json(apiErrorJson(e.code, e.message));
        return;
      }
      throw e;
    }

    const snapHost = normalizeSnapshotHost(url);
    if (snapHost) {
      const cacheHit = await readSnapshotCache(snapHost);
      if (!cacheHit && (await isSnapshotDomainFreshCooldownActiveAsync(snapHost))) {
        const retrySec = await getSnapshotDomainFreshCooldownRetryAfterSecondsAsync(snapHost);
        const body = apiErrorJson(
          API_ERROR_CODES.SNAPSHOT_DOMAIN_FRESH_COOLDOWN,
          SNAPSHOT_DOMAIN_FRESH_COOLDOWN_MESSAGE,
        );
        if (retrySec > 0) body.retry_after_seconds = retrySec;
        res.status(429).json(body);
        return;
      }
    }

    const snapshotToken = randomUUID();

    const resolved = await resolveSelfServeAuditOwnerUserId();
    if (!resolved.ok) {
      res.status(resolved.statusCode).json(apiErrorJson(resolved.code, resolved.error));
      return;
    }
    const ownerUserId = resolved.userId;
    const clientId: string | null = null;

    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .insert({
        company_url: url,
        product_mode: 'free_snapshot',
        snapshot_token: snapshotToken,
        token_budget: getFreeSnapshotTokenBudget(),
        user_id: ownerUserId,
        client_id: clientId,
      })
      .select('id')
      .single();

    if (auditErr || !audit) {
      const pe = auditErr as { message?: string; code?: string; details?: string; hint?: string } | null;
      logger.error('snapshot.create_audit_failed', {
        component: 'snapshot',
        error: pe?.message,
        code: pe?.code,
        details: pe?.details,
        hint: pe?.hint,
      });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_CREATE_FAILED, SNAPSHOT_CREATE_FAILED_MESSAGE));
      return;
    }

    const auditId = audit.id as string;

    await emitStructuredNotification({
      category: 'snapshot',
      event: 'snapshot_started',
      priority: 'medium',
      audience: 'consultants',
      auditId,
      title: SNAPSHOT_STARTED_NOTIFICATION_TITLE,
      message: snapshotStartedNotificationMessage(url),
      route: `/pipeline/${auditId}`,
      payload: {
        audit_id: auditId,
        company_url: url,
        actor_role: 'client',
      },
    });

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
      const placeholders = ['audit_recon', 'audit_domains'] as const;
      const initErrors = initResults.map((r, i) => {
        const label = placeholders[i] ?? `idx_${i}`;
        if (r.status === 'rejected') {
          return { table: label, error: (r.reason as Error)?.message ?? String(r.reason) };
        }
        if (r.status === 'fulfilled' && r.value.error) {
          const err = r.value.error as { message?: string; code?: string; details?: string; hint?: string };
          return {
            table: label,
            error: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint,
          };
        }
        return null;
      }).filter(Boolean);
      await supabase.from('audits').delete().eq('id', auditId);
      logger.error('snapshot.init_placeholders_failed', {
        component: 'snapshot',
        audit_id: auditId,
        init_errors: initErrors,
      });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_INIT_ROLLBACK, SNAPSHOT_INIT_ROLLBACK_MESSAGE));
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

    void upsertSnapshotGuestSessionRow({
      guestToken,
      snapshotToken,
      companyUrl: url,
      utm,
      req,
    });

    res.status(202).json({
      snapshot_token: snapshotToken,
      status: 'running',
    });

  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.post_exception', { component: 'snapshot', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_START_FAILED, SNAPSHOT_START_FAILED_MESSAGE));
  }
});

// ─── Operator-only (404 when SNAPSHOT_OPERATOR_TOKEN unset; auth via Bearer or X-Snapshot-Operator-Token) ─
snapshotRouter.get('/operator/metrics', async (req, res) => {
  if (!snapshotOperatorAuthorized(req)) {
    res
      .status(404)
      .json(
        apiErrorJson(API_ERROR_CODES.SNAPSHOT_RESOURCE_NOT_FOUND, SNAPSHOT_RESOURCE_NOT_FOUND_MESSAGE),
      );
    return;
  }
  try {
    const shared = await getSnapshotSharedMetricsForOperator();
    res.json({ ...getSnapshotMetricsSnapshot(), ...shared });
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.operator_metrics_failed', { component: 'snapshot', error: e.message });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_METRICS_FAILED, SNAPSHOT_METRICS_FAILED_MESSAGE));
  }
});

snapshotRouter.post('/operator/purge-cache', async (req, res) => {
  if (!snapshotOperatorAuthorized(req)) {
    res
      .status(404)
      .json(
        apiErrorJson(API_ERROR_CODES.SNAPSHOT_RESOURCE_NOT_FOUND, SNAPSHOT_RESOURCE_NOT_FOUND_MESSAGE),
      );
    return;
  }
  const host = typeof req.body?.host === 'string' ? req.body.host.trim() : '';
  if (!host) {
    res.status(400).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_HOST_REQUIRED, SNAPSHOT_HOST_REQUIRED_MESSAGE));
    return;
  }
  try {
    const ok = await deleteSnapshotDomainCache(host);
    res.json({ ok });
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.operator_purge_failed', { component: 'snapshot', error: e.message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_PURGE_FAILED, SNAPSHOT_PURGE_FAILED_MESSAGE));
  }
});

// ─── GET /api/snapshot/:token — Poll status / fetch result ─
snapshotRouter.get('/:token', snapshotCompareLimiter, async (req, res) => {
  try {
    const rawTok = req.params.token;
    const token = typeof rawTok === 'string' ? rawTok : rawTok?.[0] ?? '';

    if (!token || !UUID_V4_RE.test(token)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_INVALID_TOKEN, SNAPSHOT_INVALID_TOKEN_MESSAGE));
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
      res.status(404).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_NOT_FOUND, SNAPSHOT_NOT_FOUND_MESSAGE));
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
      res
        .status(410)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_TOKEN_EXPIRED, SNAPSHOT_TOKEN_EXPIRED_MESSAGE));
      return;
    }
    const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
    if (ageHours > SNAPSHOT_TOKEN_TTL_HOURS) {
      // Best-effort token invalidation so leaked URLs stop working permanently.
      await supabase
        .from('audits')
        .update({ snapshot_token: null })
        .eq('id', audit.id)
        .eq('product_mode', 'free_snapshot');
      res
        .status(410)
        .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_TOKEN_EXPIRED, SNAPSHOT_TOKEN_EXPIRED_MESSAGE));
      return;
    }

    // Still running — return status only
    if (status !== 'completed' && status !== 'failed') {
      res.json({ status, snapshot_token: token });
      return;
    }

    if (status === 'failed') {
      void updateGuestSessionPollStatus(token, 'failed');
      res.json({
        status: 'failed',
        snapshot_token: token,
        ...apiErrorJson(API_ERROR_CODES.SNAPSHOT_FAILED, SNAPSHOT_FAILED_MESSAGE),
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

    const rawData = uxDomain?.raw_data as Record<string, unknown> | null | undefined;
    const det = rawData?.snapshot_deterministic as Record<string, unknown> | undefined;
    // Do not return a "completed" body until snapshot_deterministic is persisted (avoids empty UX + wrong badges).
    if (
      !uxDomain ||
      typeof det !== 'object' ||
      det === null ||
      typeof det.overall_score !== 'number' ||
      !Number.isFinite(det.overall_score)
    ) {
      logger.warn('snapshot.preview_data_not_ready', {
        component: 'snapshot',
        audit_id: audit.id,
        has_ux_row: !!uxDomain,
        has_det: det != null && typeof det === 'object',
      });
      res.json({ status: 'running', snapshot_token: token });
      return;
    }

    const preview: FreeSnapshotPreview = {
      audit_id: audit.id as string,
      snapshot_token: token,
      status: 'completed',
      company_url: companyUrl,
      company_name: (recon?.company_name as string | null) ?? (audit.company_name as string | null) ?? null,
      tech_stack: (recon?.tech_stack as Record<string, string[]>) ?? {},
      location: (recon?.location as string | null) ?? null,
      ux_score: (uxDomain.score as number | null) ?? null,
      ux_label: (uxDomain.label as string | null) ?? null,
      ux_summary: (uxDomain.summary as string | null) ?? null,
      issues: ((uxDomain.issues as unknown[]) ?? []).slice(0, REQUEST_FIELD_LIMITS.freeSnapshotPreviewItemsMax) as FreeSnapshotPreview['issues'],
      quick_wins: ((uxDomain.quick_wins as unknown[]) ?? []).slice(
        0,
        REQUEST_FIELD_LIMITS.freeSnapshotPreviewItemsMax,
      ) as FreeSnapshotPreview['quick_wins'],
    };

    applyDeterministicRecordToPreview(preview, det);

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
        const uxm = SNAPSHOT_UX_SUMMARY_MAX_CHARS;
        preview.ux_summary = `${s.slice(0, uxm)}${s.length > uxm ? '…' : ''}`;
      }
    }

    const wantCompetitor =
      req.query.compare === '1' ||
      req.query.compare === 'true' ||
      req.query.include_competitor === '1';
    if (wantCompetitor) {
      const competitorSettled = await Promise.allSettled([
        maybeBuildCompetitorMini(companyUrl, pagesCrawled, SNAPSHOT_COMPETITOR_TIMEOUT_MS),
      ]);
      if (competitorSettled[0].status === 'fulfilled' && competitorSettled[0].value) {
        preview.competitor_mini = competitorSettled[0].value;
      }
    }

    const access = computePublicSnapshotAccessFlags(preview, det);
    if (access.blocked) {
      preview.snapshot_access_blocked = true;
      preview.snapshot_access_robots_blocked = access.robots;
    } else {
      delete preview.snapshot_access_blocked;
      delete preview.snapshot_access_robots_blocked;
    }

    void updateGuestSessionPollStatus(token, 'completed');
    res.json(preview);

  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.get_exception', { component: 'snapshot', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_FETCH_FAILED, SNAPSHOT_FETCH_FAILED_MESSAGE));
  }
});
