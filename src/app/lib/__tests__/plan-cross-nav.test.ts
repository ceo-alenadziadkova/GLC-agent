import { describe, expect, it } from 'vitest';

import {
  buildPlanExecuteViewHref,
  buildPlanUrlWithModePreservingForeignParams,
  buildPlanSurfaceHrefWithFocus,
  buildPlanUrlWithViewPreservingForeignParams,
  mergePlanCardMetricFiltersIntoLocationSearch,
  mergeFocusIntoPlanHref,
  readPlanCardMetricFilters,
  readPlanFocusCanonicalKey,
  resolvePlanFocusToPackGraphNodeId,
  planWorkspacePathContext,
} from '../plan-cross-nav';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';

describe('plan-cross-nav', () => {
  it('parses lab path as studio context', () => {
    expect(planWorkspacePathContext('/lab/audit-1')).toEqual({
      auditId: 'audit-1',
      isClient: false,
      surface: 'studio',
    });
    expect(planWorkspacePathContext('/portal/lab/audit-2')).toEqual({
      auditId: 'audit-2',
      isClient: true,
      surface: 'studio',
    });
  });

  it('reads focus canonical key', () => {
    expect(readPlanFocusCanonicalKey('?view=board&focus=cnk_v1_abcd')).toBe('cnk_v1_abcd');
    expect(readPlanFocusCanonicalKey('')).toBeNull();
  });

  it('merges focus into plan href', () => {
    const withFocus = mergeFocusIntoPlanHref('/plan/x/roadmap', 'cnk_v1_x');
    const sp1 = new URLSearchParams(withFocus.split('?')[1] ?? '');
    expect(withFocus.startsWith('/plan/x/roadmap')).toBe(true);
    expect(sp1.get('focus')).toBe('cnk_v1_x');

    const cleared = mergeFocusIntoPlanHref('/plan/x/roadmap?focus=old', null);
    const sp2 = new URLSearchParams(cleared.split('?')[1] ?? '');
    expect(sp2.get('focus')).toBeNull();
  });

  it('buildPlanSurfaceHrefWithFocus merges roadmap path and focus token', () => {
    const href = buildPlanSurfaceHrefWithFocus({
      auditId: 'audit-z',
      isClient: false,
      view: 'roadmap',
      focusCanonicalKey: 'cnk_v1_focus',
    });
    expect(href).toContain('/plan/audit-z/roadmap');
    expect(href).toContain('focus=cnk_v1_focus');
    expect(href).not.toContain('view=');
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

  it('preserves focus and arbitrary params when changing view (path-first)', () => {
    const href = buildPlanUrlWithViewPreservingForeignParams({
      pathname: '/plan/audit-1/roadmap',
      currentSearch: '?focus=key1&range=90',
      nextView: 'board',
    });
    expect(href).toContain('/plan/audit-1/board');
    expect(href).toContain('focus=key1');
    expect(href).toContain('range=90');
    expect(href).not.toContain('view=');
  });

  it('keeps focus when switching execute views (board -> table -> roadmap)', () => {
    const toTable = buildPlanExecuteViewHref({
      pathname: '/plan/audit-1/board',
      currentSearch: '?focus=node-7&lane=seo_digital',
      nextView: 'table',
    });
    expect(toTable).toContain('/plan/audit-1/table');
    const tableQuery = new URLSearchParams(toTable.split('?')[1] ?? '');
    expect(tableQuery.get('focus')).toBe('node-7');
    expect(tableQuery.get('lane')).toBe('seo_digital');

    const toRoadmap = buildPlanExecuteViewHref({
      pathname: '/plan/audit-1/table',
      currentSearch: `?${tableQuery.toString()}`,
      nextView: 'roadmap',
    });
    expect(toRoadmap).toContain('/plan/audit-1/roadmap');
    const roadmapQuery = new URLSearchParams(toRoadmap.split('?')[1] ?? '');
    expect(roadmapQuery.get('focus')).toBe('node-7');
  });

  it('keeps focus while toggling workspace mode to studio', () => {
    const toShape = buildPlanUrlWithModePreservingForeignParams({
      pathname: '/portal/plan/audit-2/table',
      currentSearch: '?focus=cnk_22',
      nextMode: 'shape',
    });
    expect(toShape).toContain('/portal/lab/audit-2');
    const shapeQuery = new URLSearchParams(toShape.split('?')[1] ?? '');
    expect(shapeQuery.get('mode')).toBe('shape');
    expect(shapeQuery.get('focus')).toBe('cnk_22');
  });

  it('reads and merges assignee/due metric filters', () => {
    const parsed = readPlanCardMetricFilters('?domain=seo&prio=7d&quick=1&crit=1&assignee=alex&due=overdue');
    expect(parsed).toEqual({
      domain: 'seo',
      priority: '7d',
      quickOnly: true,
      criticalOnly: true,
      assignee: 'alex',
      dueState: 'overdue',
    });

    const href = mergePlanCardMetricFiltersIntoLocationSearch({
      pathname: '/plan/audit-7/board',
      currentSearch: '?focus=node-1&domain=seo&prio=30d',
      patch: { domain: 'all', assignee: 'all', dueState: 'due_soon' },
    });
    const qs = new URLSearchParams(href.split('?')[1] ?? '');
    expect(qs.get('focus')).toBe('node-1');
    expect(qs.get('domain')).toBeNull();
    expect(qs.get('prio')).toBe('30d');
    expect(qs.get('due')).toBe('due_soon');
  });

  it('preserves focus + metric filters across board-roadmap-table roundtrip', () => {
    const boardToRoadmap = buildPlanUrlWithViewPreservingForeignParams({
      pathname: '/plan/audit-7/board',
      currentSearch: '?focus=node-77&domain=seo_digital&prio=7d&quick=1&crit=1&assignee=alex&due=overdue&lane=seo_digital',
      nextView: 'roadmap',
    });
    const roadmapQs = new URLSearchParams(boardToRoadmap.split('?')[1] ?? '');
    expect(boardToRoadmap).toContain('/plan/audit-7/roadmap');
    expect(roadmapQs.get('focus')).toBe('node-77');
    expect(roadmapQs.get('domain')).toBe('seo_digital');
    expect(roadmapQs.get('prio')).toBe('7d');
    expect(roadmapQs.get('quick')).toBe('1');
    expect(roadmapQs.get('crit')).toBe('1');
    expect(roadmapQs.get('assignee')).toBe('alex');
    expect(roadmapQs.get('due')).toBe('overdue');
    expect(roadmapQs.get('lane')).toBe('seo_digital');

    const roadmapToTable = buildPlanExecuteViewHref({
      pathname: '/plan/audit-7/roadmap',
      currentSearch: `?${roadmapQs.toString()}`,
      nextView: 'table',
    });
    const tableQs = new URLSearchParams(roadmapToTable.split('?')[1] ?? '');
    expect(roadmapToTable).toContain('/plan/audit-7/table');
    expect(tableQs.get('focus')).toBe('node-77');
    expect(tableQs.get('domain')).toBe('seo_digital');
    expect(tableQs.get('prio')).toBe('7d');
    expect(tableQs.get('quick')).toBe('1');
    expect(tableQs.get('crit')).toBe('1');
    expect(tableQs.get('assignee')).toBe('alex');
    expect(tableQs.get('due')).toBe('overdue');
    expect(tableQs.get('lane')).toBe('seo_digital');
  });
});
