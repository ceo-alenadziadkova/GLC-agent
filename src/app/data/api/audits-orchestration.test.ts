import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('../api-http', () => ({
  apiFetch: apiFetchMock,
}));

import { auditsOrchestrationApi } from './audits-orchestration';
import {
  apiAuditsOrchestrationCommercialOffer,
  apiAuditsOrchestrationPackDiffHistory,
} from '../../config/api-paths';

describe('auditsOrchestrationApi', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it('calls diff-history endpoint with limit query', async () => {
    await auditsOrchestrationApi.getOrchestrationPackDiffHistory('audit-1', { limit: 7 });
    expect(apiFetchMock).toHaveBeenCalledWith(
      apiAuditsOrchestrationPackDiffHistory('audit-1', { limit: 7 }),
      { method: 'GET' },
    );
  });

  it('posts commercial offer payload including accepted domain', async () => {
    await auditsOrchestrationApi.postOrchestrationCommercialOffer('audit-1', {
      selected_domains: ['seo_digital'],
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
      accept_domain: 'marketing_utp',
    });
    expect(apiFetchMock).toHaveBeenCalledWith(apiAuditsOrchestrationCommercialOffer('audit-1'), {
      method: 'POST',
      body: JSON.stringify({
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        accept_domain: 'marketing_utp',
      }),
    });
  });
});
