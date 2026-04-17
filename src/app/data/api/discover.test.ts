import { beforeEach, describe, expect, it, vi } from 'vitest';

const { publicApiFetchMock } = vi.hoisted(() => ({
  publicApiFetchMock: vi.fn(),
}));

vi.mock('../api-http', () => ({
  apiFetch: vi.fn(),
  publicApiFetch: publicApiFetchMock,
}));

import { discoverApi, resetDiscoverApiUiFragmentCacheForTests } from './discover';

describe('discoverApi.getUiFragment', () => {
  beforeEach(() => {
    publicApiFetchMock.mockReset();
    resetDiscoverApiUiFragmentCacheForTests();
  });

  it('deduplicates concurrent requests', async () => {
    const payload = {
      version: 'v1',
      policyVersion: 'p1',
      questionBankVersion: 'qb1',
      questions: [{ id: 'a1', question: 'Q1', type: 'single_choice' as const }],
    };
    publicApiFetchMock.mockResolvedValue(payload);

    const [first, second] = await Promise.all([
      discoverApi.getUiFragment(),
      discoverApi.getUiFragment(),
    ]);

    expect(publicApiFetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
  });

  it('returns cached payload on subsequent calls', async () => {
    const payload = {
      version: 'v1',
      policyVersion: 'p1',
      questionBankVersion: 'qb1',
      questions: [{ id: 'a1', question: 'Q1', type: 'single_choice' as const }],
    };
    publicApiFetchMock.mockResolvedValue(payload);

    const first = await discoverApi.getUiFragment();
    const second = await discoverApi.getUiFragment();

    expect(publicApiFetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
  });
});
