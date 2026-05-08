import { describe, expect, it } from 'vitest';

import {
  ROADMAP_SEARCH_PARAM_DAY_RANGE,
  ROADMAP_SEARCH_PARAM_QUERY,
  ROADMAP_SEARCH_PARAM_TOOLBAR_MORE,
  readRoadmapToolbarExpandedFromSearchParams,
} from '../roadmap-gantt-url-params';

describe('readRoadmapToolbarExpandedFromSearchParams', () => {
  it('returns false for a vanilla roadmap URL (progressive-disclosure toolbar)', () => {
    expect(readRoadmapToolbarExpandedFromSearchParams(new URLSearchParams())).toBe(false);
  });

  it('does not auto-open More when only day range is set (use more=1 to share expanded toolbar)', () => {
    const sp = new URLSearchParams([[ROADMAP_SEARCH_PARAM_DAY_RANGE, '90']]);
    expect(readRoadmapToolbarExpandedFromSearchParams(sp)).toBe(false);
  });

  it('opens More when explicit more=1 is present', () => {
    const sp = new URLSearchParams([
      [ROADMAP_SEARCH_PARAM_TOOLBAR_MORE, '1'],
      [ROADMAP_SEARCH_PARAM_DAY_RANGE, '90'],
    ]);
    expect(readRoadmapToolbarExpandedFromSearchParams(sp)).toBe(true);
  });

  it('opens More when search query encodes filtering', () => {
    const sp = new URLSearchParams([[ROADMAP_SEARCH_PARAM_QUERY, 'payments']]);
    expect(readRoadmapToolbarExpandedFromSearchParams(sp)).toBe(true);
  });
});
