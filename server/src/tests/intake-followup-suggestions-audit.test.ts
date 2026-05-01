import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/audits/audit-brief.repository.js', () => ({
  fetchBriefByAuditId: vi.fn(),
}));
vi.mock('../repositories/audits/audits.repository.js', () => ({
  fetchAuditForBriefById: vi.fn(),
}));

import { fetchBriefByAuditId } from '../repositories/audits/audit-brief.repository.js';
import { fetchAuditForBriefById } from '../repositories/audits/audits.repository.js';
import { getIntakeFollowupSuggestionsForAuditId } from '../services/intake/intake-followup-candidates.service.js';

afterEach(() => {
  vi.mocked(fetchBriefByAuditId).mockReset();
  vi.mocked(fetchAuditForBriefById).mockReset();
});

describe('getIntakeFollowupSuggestionsForAuditId', () => {
  it('returns null when no brief row', async () => {
    vi.mocked(fetchBriefByAuditId).mockResolvedValue({
      data: null,
      error: { message: 'no row' },
    } as Awaited<ReturnType<typeof fetchBriefByAuditId>>);
    await expect(getIntakeFollowupSuggestionsForAuditId('a1')).resolves.toBeNull();
  });

  it('returns a bundle when brief and audit exist', async () => {
    vi.mocked(fetchBriefByAuditId).mockResolvedValue({
      data: {
        responses: { a5: { value: 'Co', source: 'client' } },
        collection_mode: 'self_serve',
        collected_by: 'client',
      },
      error: null,
    } as Awaited<ReturnType<typeof fetchBriefByAuditId>>);
    vi.mocked(fetchAuditForBriefById).mockResolvedValue({
      data: {
        id: 'a1',
        product_mode: 'full',
        execution_plan: {},
        user_id: 'u1',
        client_id: 'c1',
      },
      error: null,
    } as Awaited<ReturnType<typeof fetchAuditForBriefById>>);
    const r = await getIntakeFollowupSuggestionsForAuditId('a1');
    expect(r).not.toBeNull();
    expect(r?.nextRecommended).toEqual(expect.any(Array));
    expect(r?.questionIds).toEqual(expect.any(Array));
  });
});
