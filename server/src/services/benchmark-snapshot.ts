/**
 * Domain benchmark snapshots from evaluation_datasets (ADR-DOMAIN-BENCHMARKS).
 * CO-CONSUMER: `SYSTEM_DEFAULTS.benchmarks`, migration `056_domain_benchmark_snapshot.sql`.
 */

import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { isBenchmarksEnabled } from '../config/feature-flags.js';
import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { DOMAIN_KEYS, type DomainKey } from '../types/audit.js';
import {
  ALL_BUCKET,
  normalizeAuditIndustryKey,
} from '../lib/benchmark-industry.js';
import {
  average,
  medianSorted,
  percentilesFromSorted,
} from '../lib/benchmark-stats.js';

const B = SYSTEM_DEFAULTS.benchmarks;
const DOMAIN_KEY_SET = new Set<string>(DOMAIN_KEYS);

export type BenchmarkPeriod = (typeof B.computePeriods)[number];

export interface BenchmarkEvalRow {
  phase_id: string;
  control_object: Record<string, unknown>;
  decision_applied: string | null;
  created_at: string;
  audits: { industry: string | null } | { industry: string | null }[] | null;
}

function auditIndustryFromRow(row: BenchmarkEvalRow): string | null {
  const a = row.audits;
  if (a == null) return null;
  if (Array.isArray(a)) return a[0]?.industry ?? null;
  return a.industry ?? null;
}

function extractConfidenceOverall(co: Record<string, unknown>): number | null {
  const conf = co.confidence as Record<string, unknown> | undefined;
  if (!conf || typeof conf !== 'object') return null;
  const o = conf.overall;
  return typeof o === 'number' && Number.isFinite(o) ? o : null;
}

function extractRateMetrics(co: Record<string, unknown>): {
  hallucination: number | null;
  risky_promise: number | null;
  unverified: number | null;
} {
  const counts = co.counts as Record<string, unknown> | undefined;
  if (!counts || typeof counts !== 'object') {
    return { hallucination: null, risky_promise: null, unverified: null };
  }
  const total =
    typeof counts.total_claims === 'number' && counts.total_claims > 0
      ? counts.total_claims
      : null;
  const st = counts.statuses as Record<string, unknown> | undefined;
  if (!total || !st || typeof st !== 'object') {
    return { hallucination: null, risky_promise: null, unverified: null };
  }
  const div = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n / total : null);
  return {
    hallucination: div(st.likely_hallucination),
    risky_promise: div(st.risky_promise),
    unverified: div(st.unverified),
  };
}

function extractErrorCodes(co: Record<string, unknown>): string[] {
  const errors = co.errors as Record<string, unknown> | undefined;
  if (!errors || typeof errors !== 'object') return [];
  const out: string[] = [];
  for (const k of ['fixable', 'structural', 'data_gaps'] as const) {
    const arr = errors[k];
    if (!Array.isArray(arr)) continue;
    for (const x of arr) {
      if (typeof x === 'string' && x.length > 0) out.push(x);
    }
  }
  return out;
}

interface GroupAcc {
  scores: number[];
  hallucinationRates: number[];
  riskyRates: number[];
  unverifiedRates: number[];
  errorCounts: Map<string, number>;
}

function makeGroupAcc(): GroupAcc {
  return {
    scores: [],
    hallucinationRates: [],
    riskyRates: [],
    unverifiedRates: [],
    errorCounts: new Map(),
  };
}

function groupKey(phaseId: string, industry: string): string {
  return `${phaseId}::${industry}`;
}

/** Exported for unit tests — pure aggregation from in-memory rows. */
export function aggregateRowsIntoGroups(rows: readonly BenchmarkEvalRow[]): Map<string, GroupAcc> {
  const groups = new Map<string, GroupAcc>();

  for (const row of rows) {
    if (!DOMAIN_KEY_SET.has(row.phase_id)) continue;

    const score = extractConfidenceOverall(row.control_object);
    if (score === null) continue;

    const rates = extractRateMetrics(row.control_object);
    const errCodes = extractErrorCodes(row.control_object);
    const specific = normalizeAuditIndustryKey(auditIndustryFromRow(row));
    const industryTargets: string[] = [ALL_BUCKET];
    if (specific) industryTargets.push(specific);

    for (const ind of industryTargets) {
      const key = groupKey(row.phase_id, ind);
      let g = groups.get(key);
      if (!g) {
        g = makeGroupAcc();
        groups.set(key, g);
      }
      g.scores.push(score);
      if (rates.hallucination != null) g.hallucinationRates.push(rates.hallucination);
      if (rates.risky_promise != null) g.riskyRates.push(rates.risky_promise);
      if (rates.unverified != null) g.unverifiedRates.push(rates.unverified);
      for (const e of errCodes) {
        g.errorCounts.set(e, (g.errorCounts.get(e) ?? 0) + 1);
      }
    }
  }

  return groups;
}

function topErrorTypesFromCounts(m: Map<string, number>, limit: number): string[] {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([code]) => code);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildInsertRows(
  groups: Map<string, GroupAcc>,
  period: BenchmarkPeriod,
  computedAtIso: string
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const minN = B.minSampleCount;
  const topN = B.topErrorTypesCount;

  for (const [key, g] of groups) {
    if (g.scores.length < minN) continue;
    const [phase_id, industry] = key.split('::');
    if (!phase_id || !industry) continue;

    const sortedScores = [...g.scores].sort((a, b) => a - b);
    const pct = percentilesFromSorted(sortedScores);
    const avgScore = average(g.scores);

    const sortRate = (arr: number[]) => medianSorted([...arr].sort((a, b) => a - b));

    out.push({
      computed_at: computedAtIso,
      phase_id,
      industry,
      period,
      sample_count: g.scores.length,
      p25: round1(pct.p25),
      p50: round1(pct.p50),
      p75: round1(pct.p75),
      p90: round1(pct.p90),
      avg_score: round1(avgScore),
      hallucination_rate_p50:
        g.hallucinationRates.length > 0 ? round1(sortRate(g.hallucinationRates)) : null,
      risky_promise_rate_p50: g.riskyRates.length > 0 ? round1(sortRate(g.riskyRates)) : null,
      unverified_rate_p50: g.unverifiedRates.length > 0 ? round1(sortRate(g.unverifiedRates)) : null,
      top_error_types: topErrorTypesFromCounts(g.errorCounts, topN),
    });
  }

  return out;
}

function periodStartIso(period: BenchmarkPeriod, nowMs: number): string | null {
  if (period === 'all_time') return null;
  const days = B.periodDays[period];
  const ms = days * 86_400_000;
  return new Date(nowMs - ms).toISOString();
}

async function fetchEvaluationRowsForPeriod(
  sinceIso: string | null,
  pageSize: number
): Promise<BenchmarkEvalRow[]> {
  const hints = [...B.includedDecisionHints];
  const out: BenchmarkEvalRow[] = [];
  let from = 0;

  while (true) {
    let q = supabase
      .from('evaluation_datasets')
      .select('phase_id, control_object, decision_applied, created_at, audits!inner(industry)')
      .in('decision_applied', hints)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);

    if (sinceIso) q = q.gte('created_at', sinceIso);

    const { data, error } = await q;
    if (error) {
      throw new Error(`benchmark_snapshot.fetch_failed: ${error.message}`);
    }
    const batch = (data ?? []) as BenchmarkEvalRow[];
    if (batch.length === 0) break;
    out.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return out;
}

/**
 * Scans evaluation_datasets for each configured period and inserts snapshot rows
 * (multiple rows per run — retained for trends).
 */
export async function computeAndStoreBenchmarkSnapshots(): Promise<{ inserted: number }> {
  const nowMs = Date.now();
  const computedAtIso = new Date(nowMs).toISOString();
  let inserted = 0;

  for (const period of B.computePeriods) {
    const sinceIso = periodStartIso(period, nowMs);
    const rows = await fetchEvaluationRowsForPeriod(sinceIso, B.evaluationPageSize);
    const groups = aggregateRowsIntoGroups(rows);
    const payloads = buildInsertRows(groups, period, computedAtIso);

    for (const row of payloads) {
      const { error } = await supabase.from('domain_benchmark_snapshot').insert(row);
      if (error) {
        logger.warn('benchmark_snapshot.insert_failed', {
          component: 'benchmark_snapshot',
          message: error.message,
          phase_id: row.phase_id,
          industry: row.industry,
          period: row.period,
        });
      } else {
        inserted += 1;
      }
    }
  }

  logger.info('benchmark_snapshot.recompute_done', {
    component: 'benchmark_snapshot',
    inserted,
  });

  return { inserted };
}

async function fetchLatestSnapshotId(args: {
  phaseId: string;
  industry: string;
  period: BenchmarkPeriod;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('domain_benchmark_snapshot')
    .select('id')
    .eq('phase_id', args.phaseId)
    .eq('industry', args.industry)
    .eq('period', args.period)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn('benchmark_snapshot.lookup_failed', {
      component: 'benchmark_snapshot',
      message: error.message,
      ...args,
    });
    return null;
  }
  return data?.id ?? null;
}

/**
 * Resolves `context.benchmark_reference_id` for a domain-phase CONTROL_OBJECT.
 */
export async function resolveBenchmarkReferenceId(args: {
  auditId: string;
  phaseId: DomainKey;
  period: BenchmarkPeriod;
}): Promise<string | null> {
  if (!isBenchmarksEnabled()) return null;

  const { data: audit, error } = await supabase
    .from('audits')
    .select('industry')
    .eq('id', args.auditId)
    .maybeSingle();

  if (error || !audit) {
    logger.warn('benchmark_snapshot.audit_lookup_failed', {
      component: 'benchmark_snapshot',
      audit_id: args.auditId,
      message: error?.message,
    });
    return null;
  }

  const specific = normalizeAuditIndustryKey(audit.industry);
  if (specific) {
    const id = await fetchLatestSnapshotId({
      phaseId: args.phaseId,
      industry: specific,
      period: args.period,
    });
    if (id) return id;
  }

  return fetchLatestSnapshotId({
    phaseId: args.phaseId,
    industry: ALL_BUCKET,
    period: args.period,
  });
}

export async function attachBenchmarkReferenceToControlObject(
  auditId: string,
  controlObject: { context: { phase_id: string; benchmark_reference_id?: string } }
): Promise<void> {
  if (!isBenchmarksEnabled()) return;
  const pid = controlObject.context.phase_id;
  if (!DOMAIN_KEY_SET.has(pid)) return;

  const id = await resolveBenchmarkReferenceId({
    auditId,
    phaseId: pid as DomainKey,
    period: B.defaultReferencePeriod,
  });

  if (id) controlObject.context.benchmark_reference_id = id;
}

export interface BenchmarkSnapshotApiRow {
  id: string;
  computed_at: string;
  phase_id: string;
  industry: string;
  period: string;
  sample_count: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  avg_score: number;
  hallucination_rate_p50: number | null;
  risky_promise_rate_p50: number | null;
  unverified_rate_p50: number | null;
  top_error_types: string[] | null;
}

/**
 * Latest snapshot for optional filters (consultant API).
 */
export async function fetchLatestBenchmarkSnapshotForQuery(args: {
  phaseId?: string;
  industry?: string;
  period?: BenchmarkPeriod;
}): Promise<BenchmarkSnapshotApiRow | null> {
  let q = supabase.from('domain_benchmark_snapshot').select('*');
  if (args.phaseId) q = q.eq('phase_id', args.phaseId);
  if (args.industry) q = q.eq('industry', args.industry);
  if (args.period) q = q.eq('period', args.period);

  const { data, error } = await q.order('computed_at', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    logger.warn('benchmark_snapshot.api_lookup_failed', {
      component: 'benchmark_snapshot',
      message: error.message,
      ...args,
    });
    return null;
  }
  return data as BenchmarkSnapshotApiRow | null;
}
