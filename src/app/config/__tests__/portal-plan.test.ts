import { describe, expect, it } from 'vitest';

import { parsePortalPlanViewParam } from '../portal-plan';

describe('parsePortalPlanViewParam', () => {
  it('defaults to roadmap', () => {
    expect(parsePortalPlanViewParam(null)).toBe('roadmap');
    expect(parsePortalPlanViewParam('')).toBe('roadmap');
    expect(parsePortalPlanViewParam('roadmap')).toBe('roadmap');
    expect(parsePortalPlanViewParam('anything')).toBe('roadmap');
  });

  it('accepts timeline spellings used in older redirects', () => {
    expect(parsePortalPlanViewParam('timeline')).toBe('timeline');
    expect(parsePortalPlanViewParam('Timeline')).toBe('timeline');
  });
});
