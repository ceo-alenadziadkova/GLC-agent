import { describe, expect, it } from 'vitest';

import { buildAppRoute } from '../../../config/route-paths';
import { canonicalPlanHrefWithLegacySearch } from '../LegacyPlanPathRedirect';

function parseQueryPairs(href: string): Record<string, string> {
  const q = href.split('?')[1];
  if (!q) return {};
  return Object.fromEntries(new URLSearchParams(q).entries());
}

describe('canonicalPlanHrefWithLegacySearch', () => {
  const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('maps legacy /timeline onto portal plan board path and preserves foreign params', () => {
    const base = buildAppRoute.portalPlan(id, 'board');
    const merged = canonicalPlanHrefWithLegacySearch(base, '?range=90', 'timeline');
    expect(merged.startsWith(`${buildAppRoute.portalPlan(id, 'board')}`)).toBe(true);
    expect(parseQueryPairs(merged)).toEqual({ range: '90' });
  });

  it('drops foreign view from legacy search when promoting legacy timeline route to board', () => {
    const base = buildAppRoute.plan(id, 'board');
    const merged = canonicalPlanHrefWithLegacySearch(base, '?view=roadmap&range=60', 'timeline');
    expect(merged.startsWith(`${buildAppRoute.plan(id, 'board')}`)).toBe(true);
    expect(parseQueryPairs(merged)).toEqual({ range: '60' });
  });

  it('keeps focus when canonicalizing legacy timeline route (drops legacy view/mode keys)', () => {
    const base = buildAppRoute.portalPlan(id, 'board');
    const merged = canonicalPlanHrefWithLegacySearch(base, '?focus=node-1&mode=shape', 'timeline');
    expect(parseQueryPairs(merged)).toEqual({ focus: 'node-1' });
  });

  it('forces roadmap path for roadmap surface and forwards other params', () => {
    const base = buildAppRoute.plan(id, 'roadmap');
    expect(parseQueryPairs(canonicalPlanHrefWithLegacySearch(base, '?view=timeline&more=1', 'roadmap'))).toEqual({
      more: '1',
    });
  });
});
