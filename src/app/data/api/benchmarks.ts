import { BENCHMARKS_FEATURE_DISABLED_API_CODE } from '../../config/benchmarks-client-policy';
import { STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD } from '../../config/strategy-lab';
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
 * When the server has benchmarks disabled (`FEATURE_BENCHMARKS`), every GET returns 503.
 * Strategy Lab fires many parallel snapshot requests; cache + single in-flight probe limits noise
 * (console + load) to one failed request per session until reload.
 */
let benchmarksEndpointDisabledCache: boolean | null = null;
let benchmarksUsabilityProbe: Promise<boolean> | null = null;

/**
 * True when GET /api/benchmarks is turned off (feature flag), so callers should skip further fetches.
 */
async function isBenchmarksEndpointDisabled(): Promise<boolean> {
  if (benchmarksEndpointDisabledCache === true) return true;
  if (benchmarksEndpointDisabledCache === false) return false;

  if (!benchmarksUsabilityProbe) {
    benchmarksUsabilityProbe = (async () => {
      const path = apiBenchmarksQuery({
        phase_id: DOMAIN_KEYS[0],
        industry: 'all',
        period: STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD,
      });
      try {
        await apiFetch<DomainBenchmarkSnapshot>(path);
        benchmarksEndpointDisabledCache = false;
        return false;
      } catch (e) {
        if (
          e instanceof ApiError &&
          e.status === 503 &&
          e.code === BENCHMARKS_FEATURE_DISABLED_API_CODE
        ) {
          benchmarksEndpointDisabledCache = true;
          return true;
        }
        if (e instanceof ApiError && e.status === 404) {
          benchmarksEndpointDisabledCache = false;
          return false;
        }
        benchmarksEndpointDisabledCache = false;
        throw e;
      } finally {
        benchmarksUsabilityProbe = null;
      }
    })();
  }

  return benchmarksUsabilityProbe;
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
    try {
      return await apiFetch<DomainBenchmarkSnapshot>(path);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      if (
        e instanceof ApiError &&
        e.status === 503 &&
        e.code === BENCHMARKS_FEATURE_DISABLED_API_CODE
      ) {
        benchmarksEndpointDisabledCache = true;
        return null;
      }
      throw e;
    }
  },
};
