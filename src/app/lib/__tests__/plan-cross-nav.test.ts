import { describe, expect, it } from 'vitest';

import {
  buildPlanSurfaceHrefWithFocus,
  buildPlanUrlWithViewPreservingForeignParams,
  mergeFocusIntoPlanHref,
  readPlanFocusCanonicalKey,
  resolvePlanFocusToPackGraphNodeId,
} from '../plan-cross-nav';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';

describe('plan-cross-nav', () => {
  it('reads focus canonical key', () => {
    expect(readPlanFocusCanonicalKey('?view=board&focus=cnk_v1_abcd')).toBe('cnk_v1_abcd');
    expect(readPlanFocusCanonicalKey('')).toBeNull();
  });

  it('merges focus into plan href', () => {
    const withFocus = mergeFocusIntoPlanHref('/plan/x?view=roadmap', 'cnk_v1_x');
    const sp1 = new URLSearchParams(withFocus.split('?')[1] ?? '');
    expect(sp1.get('view')).toBe('roadmap');
    expect(sp1.get('focus')).toBe('cnk_v1_x');

    const cleared = mergeFocusIntoPlanHref('/plan/x?view=roadmap&focus=old', null);
    const sp2 = new URLSearchParams(cleared.split('?')[1] ?? '');
    expect(sp2.get('focus')).toBeNull();
  });

  it('buildPlanSurfaceHrefWithFocus merges roadmap view and focus token', () => {
    const href = buildPlanSurfaceHrefWithFocus({
      auditId: 'audit-z',
      isClient: false,
      view: 'roadmap',
      focusCanonicalKey: 'cnk_v1_focus',
    });
    expect(href).toContain('/plan/audit-z');
    expect(href).toContain('view=roadmap');
    expect(href).toContain('focus=cnk_v1_focus');
  });

  it('resolves board_identity_key focus to pack graph node id', () => {
    const pack = {
      graph: {
        nodes: [
          {
            id: 'node-graph-1',
            title: 'T',
            domain: 'seo_digital',
            lane: 'seo_digital',
            board_identity_key: 'stable-key-1',
          },
        ],
        edges: [],
      },
    } as unknown as GlcOrchestrationPackView;
    expect(resolvePlanFocusToPackGraphNodeId('stable-key-1', pack)).toBe('node-graph-1');
    expect(resolvePlanFocusToPackGraphNodeId('node-graph-1', pack)).toBe('node-graph-1');
  });

  it('preserves focus and arbitrary params when changing view', () => {
    const href = buildPlanUrlWithViewPreservingForeignParams({
      pathname: '/plan/audit-1',
      currentSearch: '?view=timeline&focus=key1&range=90',
      nextView: 'board',
    });
    expect(href).toContain('view=board');
    expect(href).toContain('focus=key1');
    expect(href).toContain('range=90');
  });
});
