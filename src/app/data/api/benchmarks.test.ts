import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api-error';
import {
  BENCHMARKS_FEATURE_DISABLED_API_CODE,
  BENCHMARK_SNAPSHOT_NOT_FOUND_API_CODE,
} from '../../config/benchmarks-client-policy';

const apiFetchMock = vi.fn();

vi.mock('../api-http', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe('benchmarksApi.getLatestSnapshot', () => {
  beforeEach(async () => {
    apiFetchMock.mockReset();
    const { resetBenchmarksApiClientStateForTests } = await import('./benchmarks');
    resetBenchmarksApiClientStateForTests();
  });

  it('dedupes parallel calls when benchmarks feature is disabled (single 503 probe)', async () => {
    apiFetchMock.mockRejectedValue(
      new ApiError('off', 503, BENCHMARKS_FEATURE_DISABLED_API_CODE),
    );
    const { benchmarksApi } = await import('./benchmarks');
    const p1 = benchmarksApi.getLatestSnapshot({
      phase_id: 'tech_infrastructure',
      industry: 'all',
      period: 'last_90d',
    });
    const p2 = benchmarksApi.getLatestSnapshot({
      phase_id: 'seo_digital',
      industry: 'all',
      period: 'last_90d',
    });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('runs the usability probe only once after a 404 probe (no re-probe on later reads)', async () => {
    apiFetchMock.mockRejectedValue(
      new ApiError('nf', 404, BENCHMARK_SNAPSHOT_NOT_FOUND_API_CODE),
    );
    const { benchmarksApi } = await import('./benchmarks');
    const { DOMAIN_KEYS } = await import('../auditTypes');
    const p1 = benchmarksApi.getLatestSnapshot({
      phase_id: DOMAIN_KEYS[0],
      industry: 'all',
      period: 'last_90d',
    });
    const p2 = benchmarksApi.getLatestSnapshot({
      phase_id: DOMAIN_KEYS[1],
      industry: 'all',
      period: 'last_90d',
    });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBeNull();
    expect(b).toBeNull();
    // One shared probe + one fetch for DOMAIN_KEYS[1] (DOMAIN_KEYS[0] path is null-cached after probe).
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });
});
