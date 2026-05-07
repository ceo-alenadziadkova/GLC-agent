import { describe, it, expect } from 'vitest';
import { buildAppRoute } from '../../config/route-paths';
import {
  buildConsultantNav,
  buildClientNav,
  buildGuestNav,
  buildMobileBottomNavItems,
  isNavItemActive,
} from '../app-shell-nav';

describe('app-shell-nav', () => {
  it('buildConsultantNav lists dashboard and admin queues with routes when no audit', () => {
    const nav = buildConsultantNav(null);
    expect(nav.map(i => i.to)).toEqual([
      '/dashboard',
      '/admin/audits',
      '/admin/requests',
      '/admin/snapshots',
      '/admin/discovery',
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('buildConsultantNav fills audit-scoped links when auditId is set', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildConsultantNav(id, { planWorkspacePrimaryUx: true });
    expect(nav[5]?.to).toBe(`/pipeline/${id}`);
    expect(nav[6]?.to).toBe(`/audit/${id}`);
    expect(nav[7]?.to).toBe(buildAppRoute.planStudio(id));
    expect(nav[8]?.to).toBe(buildAppRoute.plan(id));
    expect(nav[9]?.to).toBe(`/reports/${id}`);
  });

  it('buildConsultantNav keeps pipeline before timeline when timeline-first is off', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildConsultantNav(id, { planWorkspacePrimaryUx: false });
    expect(nav[5]?.to).toBe(`/pipeline/${id}`);
    expect(nav[6]?.to).toBe(`/audit/${id}`);
    expect(nav.some(i => i.to === buildAppRoute.plan(id))).toBe(true);
  });

  it('buildConsultantNav omits timeline when orchestration roadmap UI flag is off', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildConsultantNav(id, { planWorkspacePrimaryUx: true, orchestrationRoadmapUiEnabled: false });
    expect(nav[5]?.to).toBe(`/pipeline/${id}`);
    expect(nav[6]?.to).toBe(`/audit/${id}`);
    expect(nav[7]?.to).toBeNull();
    expect(nav[8]?.to).toBe(`/reports/${id}`);
    expect(nav.some(i => i.to === buildAppRoute.plan(id))).toBe(false);
  });

  it('buildMobileBottomNavItems takes first four linked consultant destinations', () => {
    const nav = buildConsultantNav(null);
    const bottom = buildMobileBottomNavItems(nav, { isClient: false, isGuest: false, roleUnknown: false });
    expect(bottom).toHaveLength(4);
    expect(bottom.map(i => i.to)).toEqual([
      '/dashboard',
      '/admin/audits',
      '/admin/requests',
      '/admin/snapshots',
    ]);
  });

  it('buildMobileBottomNavItems returns empty when role is unknown', () => {
    const nav = buildConsultantNav(null);
    expect(buildMobileBottomNavItems(nav, { isClient: false, isGuest: false, roleUnknown: true })).toEqual([]);
  });

  it('buildClientNav appends New audit tab when missing and caps at four', () => {
    const nav = buildClientNav(null, false);
    const bottom = buildMobileBottomNavItems(nav, { isClient: true, isGuest: false, roleUnknown: false });
    expect(bottom.map(i => i.to)).toEqual(['/portal', '/portal/audit/new']);
  });

  it('buildClientNav includes report link for selected audit (timeline-first)', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildClientNav(id, true, { planWorkspacePrimaryUx: true });
    expect(nav.map(i => i.to)).toEqual([
      '/portal',
      `/portal/audit/${id}`,
      buildAppRoute.portalPlanStudio(id),
      buildAppRoute.portalPlan(id),
      `/portal/pipeline/${id}`,
      `/portal/reports/${id}`,
    ]);
  });

  it('buildClientNav orders pipeline before timeline when timeline-first is off', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildClientNav(id, true, { planWorkspacePrimaryUx: false });
    expect(nav.map(i => i.to)).toEqual([
      '/portal',
      `/portal/audit/${id}`,
      buildAppRoute.portalPlanStudio(id),
      `/portal/pipeline/${id}`,
      buildAppRoute.portalPlan(id),
      `/portal/reports/${id}`,
    ]);
  });

  it('buildClientNav omits timeline when client timeline flag is off', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildClientNav(id, true, { planWorkspacePrimaryUx: true, clientPlanWorkspaceEnabled: false });
    expect(nav.map(i => i.to)).toEqual([
      '/portal',
      `/portal/audit/${id}`,
      null,
      `/portal/pipeline/${id}`,
      `/portal/reports/${id}`,
    ]);
  });

  it('buildGuestNav yields snapshot for mobile bar', () => {
    const nav = buildGuestNav();
    const bottom = buildMobileBottomNavItems(nav, { isClient: false, isGuest: true, roleUnknown: false });
    expect(bottom).toHaveLength(1);
    expect(bottom[0]?.to).toBe('/snapshot');
  });

  it('isNavItemActive matches exact path and audit prefix', () => {
    expect(isNavItemActive('/dashboard', '/dashboard')).toBe(true);
    expect(isNavItemActive('/audit/abc', '/audit/abc')).toBe(true);
    expect(isNavItemActive('/audit/abc/extra', '/audit/abc')).toBe(true);
    expect(isNavItemActive('/portal', '/portal')).toBe(true);
    expect(isNavItemActive('/admin/requests', '/admin/requests')).toBe(true);
    expect(isNavItemActive('/admin/snapshots', '/admin/requests')).toBe(false);
  });

  it('isNavItemActive highlights Strategy Lab nav on /lab and not Plan execute', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(isNavItemActive(`/lab/${id}`, buildAppRoute.planStudio(id), '')).toBe(true);
    expect(isNavItemActive(`/lab/${id}`, buildAppRoute.plan(id), '')).toBe(false);
  });

  it('isNavItemActive highlights default plan link on delivery path', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const planDefault = buildAppRoute.plan(id);
    expect(isNavItemActive(`/plan/${id}/board`, planDefault, '')).toBe(true);
  });

  it('isNavItemActive highlights default portal plan link when on /portal/lab', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(isNavItemActive(`/portal/lab/${id}`, buildAppRoute.portalPlanStudio(id), '')).toBe(true);
    expect(isNavItemActive(`/portal/lab/${id}`, buildAppRoute.portalPlan(id), '')).toBe(false);
  });

  it('isNavItemActive distinguishes plan views via path segment', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const planRoadmap = buildAppRoute.plan(id, 'roadmap');
    const planBoard = buildAppRoute.plan(id, 'board');
    expect(isNavItemActive(`/plan/${id}/roadmap`, planRoadmap, '')).toBe(true);
    expect(isNavItemActive(`/plan/${id}/roadmap`, planBoard, '')).toBe(false);
    expect(isNavItemActive(`/plan/${id}/board`, planBoard, '')).toBe(true);
    expect(isNavItemActive(`/plan/${id}/board`, planRoadmap, '')).toBe(false);
  });

  it('isNavItemActive treats legacy timeline path as active for canonical plan board target', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(isNavItemActive(`/timeline/${id}`, buildAppRoute.plan(id, 'board'), '')).toBe(true);
  });
});
