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

  it('maps timeline legacy search onto portal plan preserving view', () => {
    const base = buildAppRoute.portalPlan(id, 'timeline');
    const merged = canonicalPlanHrefWithLegacySearch(base, '?range=90', 'timeline');
    expect(merged.startsWith(`${buildAppRoute.portalPlan(id)}`)).toBe(true);
    expect(parseQueryPairs(merged)).toEqual({ view: 'timeline', range: '90' });
  });

  it('drops foreign view from legacy search when promoting timeline tab', () => {
    const base = buildAppRoute.plan(id, 'timeline');
    const merged = canonicalPlanHrefWithLegacySearch(base, '?view=roadmap&range=60', 'timeline');
    expect(merged.startsWith(`${buildAppRoute.plan(id)}`)).toBe(true);
    expect(parseQueryPairs(merged)).toEqual({ view: 'timeline', range: '60' });
  });

  it('removes view for roadmap surface and forwards other params', () => {
    const base = buildAppRoute.plan(id);
    expect(canonicalPlanHrefWithLegacySearch(base, '?view=timeline&more=1', 'roadmap')).toBe(`${buildAppRoute.plan(id)}?more=1`);
  });
});
