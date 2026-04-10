import { describe, it, expect } from 'vitest';
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
    const nav = buildConsultantNav(id);
    expect(nav[4]?.to).toBe(`/audit/${id}`);
    expect(nav[5]?.to).toBe(`/pipeline/${id}`);
    expect(nav[6]?.to).toBe(`/reports/${id}`);
    expect(nav[7]?.to).toBe(`/strategy/${id}`);
  });

  it('buildMobileBottomNavItems takes first four linked consultant destinations', () => {
    const nav = buildConsultantNav(null);
    const bottom = buildMobileBottomNavItems(nav, { isClient: false, isGuest: false, roleUnknown: false });
    expect(bottom).toHaveLength(4);
    expect(bottom.map(i => i.to)).toEqual([
      '/dashboard',
      '/admin/requests',
      '/admin/snapshots',
      '/admin/discovery',
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
});
