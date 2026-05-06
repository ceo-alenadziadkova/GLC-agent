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
    ]);
  });

  it('buildConsultantNav fills audit-scoped links when auditId is set', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildConsultantNav(id, { timelinePrimaryUx: true });
    expect(nav[5]?.to).toBe(`/pipeline/${id}`);
    expect(nav[6]?.to).toBe(`/audit/${id}`);
    expect(nav[7]?.to).toBe(buildAppRoute.plan(id, 'timeline'));
    expect(nav[8]?.to).toBe(`/reports/${id}`);
  });

  it('buildConsultantNav keeps pipeline before timeline when timeline-first is off', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildConsultantNav(id, { timelinePrimaryUx: false });
    expect(nav[5]?.to).toBe(`/pipeline/${id}`);
    expect(nav[6]?.to).toBe(`/audit/${id}`);
    expect(nav.some(i => i.to === buildAppRoute.plan(id, 'timeline'))).toBe(true);
  });

  it('buildConsultantNav omits timeline when orchestration roadmap UI flag is off', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildConsultantNav(id, { timelinePrimaryUx: true, orchestrationRoadmapUiEnabled: false });
    expect(nav[5]?.to).toBe(`/pipeline/${id}`);
    expect(nav[6]?.to).toBe(`/audit/${id}`);
    expect(nav[7]?.to).toBe(`/reports/${id}`);
    expect(nav.some(i => i.to === buildAppRoute.plan(id, 'timeline'))).toBe(false);
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
    const nav = buildClientNav(id, true, { timelinePrimaryUx: true });
    expect(nav.map(i => i.to)).toEqual([
      '/portal',
      `/portal/audit/${id}`,
      buildAppRoute.portalPlan(id, 'timeline'),
      `/portal/pipeline/${id}`,
      `/portal/reports/${id}`,
    ]);
  });

  it('buildClientNav orders pipeline before timeline when timeline-first is off', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildClientNav(id, true, { timelinePrimaryUx: false });
    expect(nav.map(i => i.to)).toEqual([
      '/portal',
      `/portal/audit/${id}`,
      `/portal/pipeline/${id}`,
      buildAppRoute.portalPlan(id, 'timeline'),
      `/portal/reports/${id}`,
    ]);
  });

  it('buildClientNav omits timeline when client timeline flag is off', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const nav = buildClientNav(id, true, { timelinePrimaryUx: true, clientTimelineEnabled: false });
    expect(nav.map(i => i.to)).toEqual([
      '/portal',
      `/portal/audit/${id}`,
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

  it('isNavItemActive distinguishes plan roadmap vs timeline tab via search', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const plan = buildAppRoute.plan(id, 'roadmap');
    const planTl = buildAppRoute.plan(id, 'timeline');
    expect(isNavItemActive(`/plan/${id}`, planTl, '?view=timeline')).toBe(true);
    expect(isNavItemActive(`/plan/${id}`, planTl, '')).toBe(false);
    expect(isNavItemActive(`/plan/${id}`, plan, '')).toBe(true);
    expect(isNavItemActive(`/plan/${id}`, plan, '?view=timeline')).toBe(false);
  });

  it('isNavItemActive treats legacy timeline path as timeline tab nav target', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(isNavItemActive(`/timeline/${id}`, buildAppRoute.plan(id, 'timeline'), '')).toBe(true);
  });
});
