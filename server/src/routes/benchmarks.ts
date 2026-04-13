/**
 * Domain benchmark snapshots — GET read (consultant), POST recompute (cron secret).
 * See docs/adrs/ADR-DOMAIN-BENCHMARKS.md
 */

import { Router } from 'express';
import { requireAuth, attachProfile, requireRole } from '../middleware/auth.js';
import { generalLimiter, benchmarkRecomputeLimiter } from '../middleware/rate-limit.js';
import { API_ERROR_CODES, apiErrorJson } from '../config/api-error-codes.js';
import {
  BENCHMARKS_FEATURE_DISABLED_MESSAGE,
  BENCHMARK_PERIOD_INVALID_MESSAGE,
  BENCHMARK_RECOMPUTE_NOT_CONFIGURED_MESSAGE,
  BENCHMARK_RECOMPUTE_UNAUTHORIZED_MESSAGE,
  BENCHMARK_SNAPSHOT_NOT_FOUND_MESSAGE,
  INTERNAL_SERVER_ERROR_MESSAGE,
} from '../config/api-user-messages.en.js';
import { isBenchmarksEnabled } from '../config/feature-flags.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import {
  computeAndStoreBenchmarkSnapshots,
  fetchLatestBenchmarkSnapshotForQuery,
  type BenchmarkPeriod,
} from '../services/benchmark-snapshot.js';
import { benchmarkRecomputeSecretValid, benchmarkRecomputeSecretHeaderName } from '../lib/benchmark-recompute-secret.js';
import { logger } from '../services/logger.js';

export const benchmarksRouter = Router();

const PERIODS = new Set<string>(SYSTEM_DEFAULTS.benchmarks.computePeriods);

function parsePeriod(raw: unknown): BenchmarkPeriod | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  if (!PERIODS.has(raw)) return undefined;
  return raw as BenchmarkPeriod;
}

benchmarksRouter.get('/', requireAuth, attachProfile, requireRole('consultant'), generalLimiter, async (req, res) => {
  if (!isBenchmarksEnabled()) {
    res.status(503).json(apiErrorJson(API_ERROR_CODES.BENCHMARKS_FEATURE_DISABLED, BENCHMARKS_FEATURE_DISABLED_MESSAGE));
    return;
  }

  const q = req.query as Record<string, string | undefined>;
  const period = parsePeriod(q.period);
  if (q.period !== undefined && q.period !== '' && period === undefined) {
    res.status(400).json(apiErrorJson(API_ERROR_CODES.BENCHMARK_PERIOD_INVALID, BENCHMARK_PERIOD_INVALID_MESSAGE));
    return;
  }

  const row = await fetchLatestBenchmarkSnapshotForQuery({
    phaseId: q.phase_id,
    industry: q.industry,
    period,
  });

  if (!row) {
    res.status(404).json(apiErrorJson(API_ERROR_CODES.BENCHMARK_SNAPSHOT_NOT_FOUND, BENCHMARK_SNAPSHOT_NOT_FOUND_MESSAGE));
    return;
  }

  res.json({
    id: row.id,
    phase_id: row.phase_id,
    industry: row.industry,
    period: row.period,
    sample_count: row.sample_count,
    percentiles: {
      p25: row.p25,
      p50: row.p50,
      p75: row.p75,
      p90: row.p90,
    },
    avg_score: row.avg_score,
    hallucination_rate_p50: row.hallucination_rate_p50,
    risky_promise_rate_p50: row.risky_promise_rate_p50,
    unverified_rate_p50: row.unverified_rate_p50,
    top_error_types: row.top_error_types ?? [],
    computed_at: row.computed_at,
  });
});

benchmarksRouter.post('/recompute', benchmarkRecomputeLimiter, async (req, res) => {
  const configured = Boolean(process.env.BENCHMARK_RECOMPUTE_SECRET?.trim());
  if (!configured) {
    res
      .status(503)
      .json(apiErrorJson(API_ERROR_CODES.BENCHMARK_RECOMPUTE_NOT_CONFIGURED, BENCHMARK_RECOMPUTE_NOT_CONFIGURED_MESSAGE));
    return;
  }

  const headerName = benchmarkRecomputeSecretHeaderName();
  const provided = req.get(headerName);
  if (!benchmarkRecomputeSecretValid(provided)) {
    res.status(401).json(apiErrorJson(API_ERROR_CODES.BENCHMARK_RECOMPUTE_UNAUTHORIZED, BENCHMARK_RECOMPUTE_UNAUTHORIZED_MESSAGE));
    return;
  }

  try {
    const out = await computeAndStoreBenchmarkSnapshots();
    res.json({ ok: true, inserted: out.inserted });
  } catch (e) {
    logger.error('benchmarks.recompute_failed', {
      component: 'benchmarks_route',
      error: e instanceof Error ? e.message : String(e),
    });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR_MESSAGE));
  }
});
