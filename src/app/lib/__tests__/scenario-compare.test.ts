import { describe, expect, it } from 'vitest';

import { compareRoadmapManifestPreviews } from '../scenario-compare';
import type { RoadmapManifestPreviewDto } from '../../data/api/orchestration-types';

const prev = (): RoadmapManifestPreviewDto => ({
  lanes_included: ['product_change', 'tech_delivery'],
  lanes_cut: ['seo'],
  waiting_list_domains: ['finance'],
  execution_compression_hint: 'balanced',
  lane_density_band: 'medium',
  confidence_callouts: [],
});

describe('compareRoadmapManifestPreviews', () => {
  it('detects lane and preview deltas', () => {
    const b: RoadmapManifestPreviewDto = {
      ...prev(),
      lanes_included: ['product_change', 'seo'],
      waiting_list_domains: [],
    };
    const d = compareRoadmapManifestPreviews(prev(), b);
    expect(d.lanesAdded).toContain('seo');
    expect(d.lanesRemoved).toContain('tech_delivery');
    expect(d.waitingListDelta).toBe(-1);
  });
});
