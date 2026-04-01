/**
 * Analytics routes — Sprint 22
 *
 * GET /api/analytics/dashboard
 *   Returns operational dashboard data for the authenticated consultant:
 *   KPIs, action-required items (with priority), activity feed, score distribution.
 *
 *   All four data-sets are fetched via Promise.allSettled so a partial backend
 *   failure never blacks out the whole dashboard — the response includes
 *   meta.degraded_sections so the UI can show targeted "panel unavailable" states.
 */

import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rate-limit.js';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.use(attachProfile);
analyticsRouter.use(requireRole('consultant'));
analyticsRouter.use(generalLimiter);

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low';

interface DashboardKpis {
  total_audits: number;
  active_audits: number;
  avg_score: number | null;
  awaiting_review: number;
}

interface ReviewGateItem {
  id: string;
  company_name: string | null;
  company_url: string;
  status: string;
  updated_at: string;
  priority: Priority;
}

interface SlaRiskItem {
  id: string;
  company_name: string | null;
  company_url: string;
  created_at: string;
  days_open: number;
  priority: Priority;
}

interface FailureItem {
  id: string;
  company_name: string | null;
  company_url: string;
  updated_at: string;
  priority: Priority;
}

interface PendingRequestItem {
  id: string;
  url: string;
  industry: string | null;
  created_at: string;
  priority: Priority;
}

interface ActionItems {
  review_gates: ReviewGateItem[];
  sla_risks: SlaRiskItem[];
  recent_failures: FailureItem[];
  pending_requests: PendingRequestItem[];
}

interface ActivityEvent {
  id: number;
  audit_id: string;
  phase: number;
  event_type: string;
  message: string | null;
  created_at: string;
  company_name: string | null;
  company_url: string;
}

interface ScoreDistribution {
  band_1: number;  // 1.0–1.9
  band_2: number;  // 2.0–2.9
  band_3: number;  // 3.0–3.9
  band_4: number;  // 4.0–5.0
  total_scored: number;
}

type DegradedSection = 'kpis' | 'action_items' | 'activity_feed' | 'score_distribution';

interface DashboardResponse {
  kpis: DashboardKpis;
  action_items: ActionItems;
  activity_feed: ActivityEvent[];
  score_distribution: ScoreDistribution;
  meta: {
    degraded_sections: DegradedSection[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES_EXCLUDE = ['completed', 'failed', 'created'];

function daysSince(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24));
}

function scoreBucket(score: number): 1 | 2 | 3 | 4 {
  // Integer bucket: floor clamped to 1–4 (score 5.0 → bucket 4)
  return Math.min(Math.max(Math.floor(score), 1), 4) as 1 | 2 | 3 | 4;
}

// ─── GET /api/analytics/dashboard ────────────────────────────────────────────

analyticsRouter.get('/dashboard', async (req: AuthRequest, res) => {
  const uid = req.userId!;
  const userFilter = safeOrUserFilter(uid);
  const degraded: DegradedSection[] = [];

  // ── Q1: KPI base rows (all audits, lightweight) ─────────────────────────────
  const kpisPromise = supabase
    .from('audits')
    .select('id, status, overall_score, created_at')
    .or(userFilter);

  // ── Q2: Action-required sub-queries ─────────────────────────────────────────
  const reviewGatesPromise = supabase
    .from('audits')
    .select('id, company_name, company_url, status, updated_at')
    .or(userFilter)
    .eq('status', 'review')
    .order('updated_at', { ascending: true })
    .limit(20);

  const slaRisksPromise = supabase
    .from('audits')
    .select('id, company_name, company_url, created_at')
    .or(userFilter)
    .eq('status', 'created')
    .lt('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(20);

  const failuresPromise = supabase
    .from('audits')
    .select('id, company_name, company_url, updated_at')
    .or(userFilter)
    .eq('status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(10);

  // Pending client requests — all submitted requests visible to consultant
  // (mirrors existing GET /api/audit-requests behaviour for consultant role)
  const pendingRequestsPromise = supabase
    .from('audit_requests')
    .select('id, url, industry, created_at')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })
    .limit(20);

  // ── Q3: Activity feed (last 15 pipeline events across user's audits) ─────────
  // PostgREST inner-join via FK: pipeline_events.audit_id → audits.id
  const activityPromise = supabase
    .from('pipeline_events')
    .select('id, audit_id, phase, event_type, message, created_at, audits!inner(company_name, company_url, user_id)')
    .eq('audits.user_id', uid)
    .order('created_at', { ascending: false })
    .limit(15);

  // ── Run all queries in parallel ──────────────────────────────────────────────
  const [
    kpisResult,
    reviewGatesResult,
    slaRisksResult,
    failuresResult,
    pendingRequestsResult,
    activityResult,
  ] = await Promise.allSettled([
    kpisPromise,
    reviewGatesPromise,
    slaRisksPromise,
    failuresPromise,
    pendingRequestsPromise,
    activityPromise,
  ]);

  // ── Build KPIs + score distribution ─────────────────────────────────────────
  let kpis: DashboardKpis = { total_audits: 0, active_audits: 0, avg_score: null, awaiting_review: 0 };
  let scoreDistribution: ScoreDistribution = { band_1: 0, band_2: 0, band_3: 0, band_4: 0, total_scored: 0 };

  if (kpisResult.status === 'fulfilled' && !kpisResult.value.error && kpisResult.value.data) {
    const rows = kpisResult.value.data;
    const active = rows.filter(r => !ACTIVE_STATUSES_EXCLUDE.includes(r.status));
    const awaiting = rows.filter(r => r.status === 'review');
    const scored = rows.filter(r => r.overall_score !== null);
    const avgScore = scored.length > 0
      ? scored.reduce((s, r) => s + (r.overall_score as number), 0) / scored.length
      : null;

    kpis = {
      total_audits: rows.length,
      active_audits: active.length,
      avg_score: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
      awaiting_review: awaiting.length,
    };

    // Score distribution buckets
    const distCounts = { band_1: 0, band_2: 0, band_3: 0, band_4: 0 };
    for (const r of scored) {
      const bucket = scoreBucket(r.overall_score as number);
      distCounts[`band_${bucket}` as keyof typeof distCounts]++;
    }
    scoreDistribution = { ...distCounts, total_scored: scored.length };
  } else {
    degraded.push('kpis', 'score_distribution');
  }

  // ── Build action items ────────────────────────────────────────────────────────
  let actionItems: ActionItems = {
    review_gates: [],
    sla_risks: [],
    recent_failures: [],
    pending_requests: [],
  };

  const actionDegraded =
    reviewGatesResult.status === 'rejected' &&
    slaRisksResult.status === 'rejected' &&
    failuresResult.status === 'rejected' &&
    pendingRequestsResult.status === 'rejected';

  if (actionDegraded) {
    degraded.push('action_items');
  } else {
    if (reviewGatesResult.status === 'fulfilled' && !reviewGatesResult.value.error) {
      actionItems.review_gates = (reviewGatesResult.value.data ?? []).map(r => ({
        id: r.id,
        company_name: r.company_name,
        company_url: r.company_url,
        status: r.status,
        updated_at: r.updated_at,
        priority: 'high' as Priority,  // review gates always block progress
      }));
    }

    if (slaRisksResult.status === 'fulfilled' && !slaRisksResult.value.error) {
      actionItems.sla_risks = (slaRisksResult.value.data ?? []).map(r => {
        const days = daysSince(r.created_at);
        return {
          id: r.id,
          company_name: r.company_name,
          company_url: r.company_url,
          created_at: r.created_at,
          days_open: days,
          priority: (days > 14 ? 'high' : 'medium') as Priority,
        };
      });
    }

    if (failuresResult.status === 'fulfilled' && !failuresResult.value.error) {
      actionItems.recent_failures = (failuresResult.value.data ?? []).map(r => ({
        id: r.id,
        company_name: r.company_name,
        company_url: r.company_url,
        updated_at: r.updated_at,
        priority: 'medium' as Priority,
      }));
    }

    if (pendingRequestsResult.status === 'fulfilled' && !pendingRequestsResult.value.error) {
      actionItems.pending_requests = (pendingRequestsResult.value.data ?? []).map(r => ({
        id: r.id,
        url: r.url,
        industry: r.industry,
        created_at: r.created_at,
        priority: 'low' as Priority,
      }));
    }
  }

  // ── Build activity feed ───────────────────────────────────────────────────────
  let activityFeed: ActivityEvent[] = [];

  if (activityResult.status === 'fulfilled' && !activityResult.value.error && activityResult.value.data) {
    activityFeed = activityResult.value.data.map((row: Record<string, unknown>) => {
      const audit = (row.audits as { company_name?: string; company_url?: string } | null) ?? {};
      return {
        id: row.id as number,
        audit_id: row.audit_id as string,
        phase: row.phase as number,
        event_type: row.event_type as string,
        message: (row.message as string | null) ?? null,
        created_at: row.created_at as string,
        company_name: audit.company_name ?? null,
        company_url: audit.company_url ?? '',
      };
    });
  } else {
    degraded.push('activity_feed');
  }

  // ── Compose response ──────────────────────────────────────────────────────────
  const response: DashboardResponse = {
    kpis,
    action_items: actionItems,
    activity_feed: activityFeed,
    score_distribution: scoreDistribution,
    meta: { degraded_sections: degraded },
  };

  res.json(response);
});
