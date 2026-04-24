import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api-error';
import { BENCHMARKS_FEATURE_DISABLED_API_CODE } from '../../config/benchmarks-client-policy';

const apiFetchMock = vi.fn();

vi.mock('../api-http', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe('benchmarksApi.getLatestSnapshot', () => {
  afterEach(async () => {
    vi.resetModules();
    apiFetchMock.mockReset();
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
});
