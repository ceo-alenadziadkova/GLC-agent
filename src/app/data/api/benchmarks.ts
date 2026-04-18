import { apiBenchmarksQuery } from '../../config/api-paths';
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

export const benchmarksApi = {
  /**
   * Latest snapshot for optional filters. Returns null when benchmarks are off, missing, or not found.
   */
  async getLatestSnapshot(args: {
    phase_id?: string;
    industry?: string;
    period?: string;
  }): Promise<DomainBenchmarkSnapshot | null> {
    const path = apiBenchmarksQuery(args);
    try {
      return await apiFetch<DomainBenchmarkSnapshot>(path);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 503)) return null;
      throw e;
    }
  },
};
