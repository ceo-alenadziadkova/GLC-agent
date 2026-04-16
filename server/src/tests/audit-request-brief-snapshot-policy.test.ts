import { describe, expect, it } from 'vitest';
import { normalizeBriefSnapshotForIndustry } from '../audit-requests/domain/brief-snapshot-policy.js';

describe('normalizeBriefSnapshotForIndustry', () => {
  it('requires intake_industry_specify for Other', () => {
    const result = normalizeBriefSnapshotForIndustry('Other', {});
    expect(result.ok).toBe(false);
  });

  it('trims intake_industry_specify for Other', () => {
    const result = normalizeBriefSnapshotForIndustry('Other', { intake_industry_specify: '  niche  ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.intake_industry_specify).toBe('niche');
    }
  });

  it('removes intake_industry_specify for non-Other industries', () => {
    const result = normalizeBriefSnapshotForIndustry('SaaS', { intake_industry_specify: 'niche' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.intake_industry_specify).toBeUndefined();
    }
  });
});
