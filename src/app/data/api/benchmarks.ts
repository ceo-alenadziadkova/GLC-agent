import {
  BENCHMARKS_FEATURE_DISABLED_API_CODE,
  BENCHMARK_SNAPSHOT_NOT_FOUND_API_CODE,
} from '../../config/benchmarks-client-policy';
import { STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD, STRATEGY_LAB_BENCHMARK_NULL_RESULT_CACHE_MS } from '../../config/strategy-lab';
import { apiBenchmarksQuery } from '../../config/api-paths';
import { DOMAIN_KEYS } from '../auditTypes';
import { apiFetch } from '../api-http';
import { ApiError } from '../api-error';

export interface DomainBenchmarkSnapshot {
  id: string;
  phase_id: string;
  industry: string;
  period: string;
  sample_count: number;
  percentiles: { p25: number; p50: number; p75: number; p90: number };
  avg_score: number;
  hallucination_rate_p50: number | null;
  risky_promise_rate_p50: number | null;
  unverified_rate_p50: number | null;
  top_error_types: string[];
  computed_at: string;
}

/**
 * When the server has benchmarks disabled (`FEATURE_BENCHMARKS`), GET returns 503.
 * Strategy Lab may call benchmarks often; we run one usability probe per session and
 * negative-cache snapshot-miss 404s to limit repeat requests and console noise.
 */
let benchmarksDisabledByFeatureFlag: boolean | null = null;
let benchmarksUsabilityProbe: Promise<boolean> | null = null;

const benchmarkNullResultUntilMsByPath = new Map<string, number>();

function isPathNullCached(path: string): boolean {
  const until = benchmarkNullResultUntilMsByPath.get(path);
  if (until == null) return false;
  if (Date.now() >= until) {
    benchmarkNullResultUntilMsByPath.delete(path);
    return false;
  }
  return true;
}

function rememberPathReturnedNull(path: string): void {
  benchmarkNullResultUntilMsByPath.set(path, Date.now() + STRATEGY_LAB_BENCHMARK_NULL_RESULT_CACHE_MS);
}

/**
 * True when GET /api/benchmarks is turned off (feature flag), so callers should skip further fetches.
 */
async function isBenchmarksEndpointDisabled(): Promise<boolean> {
  if (benchmarksDisabledByFeatureFlag === true) return true;
  if (benchmarksDisabledByFeatureFlag === false) return false;

  if (!benchmarksUsabilityProbe) {
    benchmarksUsabilityProbe = (async (): Promise<boolean> => {
      const path = apiBenchmarksQuery({
        phase_id: DOMAIN_KEYS[0],
        industry: 'all',
        period: STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD,
      });
      try {
        await apiFetch<DomainBenchmarkSnapshot>(path);
        benchmarksDisabledByFeatureFlag = false;
        return false;
      } catch (e) {
        if (
          e instanceof ApiError &&
          e.status === 503 &&
          e.code === BENCHMARKS_FEATURE_DISABLED_API_CODE
        ) {
          benchmarksDisabledByFeatureFlag = true;
          return true;
        }
        if (e instanceof ApiError && e.status === 404) {
          // Route is up; no row for probe filters — not feature-disabled.
          benchmarksDisabledByFeatureFlag = false;
          rememberPathReturnedNull(path);
          return false;
        }
        benchmarksDisabledByFeatureFlag = false;
        throw e;
      } finally {
        benchmarksUsabilityProbe = null;
      }
    })();
  }

  return benchmarksUsabilityProbe;
}

function shouldCache404AsEmptySnapshot(e: ApiError): boolean {
  if (e.status !== 404) return false;
  return e.code === BENCHMARK_SNAPSHOT_NOT_FOUND_API_CODE || e.code == null || e.code === '';
}

export const benchmarksApi = {
  /**
   * Latest snapshot for optional filters. Returns null when benchmarks are off, missing, or not found.
   */
  async getLatestSnapshot(args: {
    phase_id?: string;
    industry?: string;
    period?: string;
  }): Promise<DomainBenchmarkSnapshot | null> {
    if (await isBenchmarksEndpointDisabled()) return null;

    const path = apiBenchmarksQuery(args);
    if (isPathNullCached(path)) return null;

    try {
      return await apiFetch<DomainBenchmarkSnapshot>(path);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        if (shouldCache404AsEmptySnapshot(e)) {
          rememberPathReturnedNull(path);
        }
        return null;
      }
      if (
        e instanceof ApiError &&
        e.status === 503 &&
        e.code === BENCHMARKS_FEATURE_DISABLED_API_CODE
      ) {
        benchmarksDisabledByFeatureFlag = true;
        return null;
      }
      throw e;
    }
  },
};

/** Vitest-only: clears session caches so tests do not need `vi.resetModules()`. */
export function resetBenchmarksApiClientStateForTests(): void {
  benchmarksDisabledByFeatureFlag = null;
  benchmarksUsabilityProbe = null;
  benchmarkNullResultUntilMsByPath.clear();
}
