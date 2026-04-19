import type { ComponentType, CSSProperties } from 'react';
import {
  Briefcase,
  SquaresFour,
  Pulse,
  FileText,
  Flask,
  MagnifyingGlass,
  Lightning,
  HouseSimple,
  Eye,
  Tray,
  PlusCircle,
  Palette,
} from '@phosphor-icons/react';
import { APP_SHELL_COPY } from '../config/app-shell-copy';
import { APP_ROUTE_PATHS, buildAppRoute } from '../config/route-paths';

export type AppShellNavItem = {
  to: string | null;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  badge: string | null;
};

export function buildConsultantNav(auditId: string | null): AppShellNavItem[] {
  const n = APP_SHELL_COPY.nav.consultant;
  return [
    { to: APP_ROUTE_PATHS.dashboard,                           icon: SquaresFour,    label: n.dashboard,       badge: null },
    { to: APP_ROUTE_PATHS.adminRequests,                      icon: Tray,           label: n.requestQueue,   badge: null },
    { to: APP_ROUTE_PATHS.adminSnapshots,                     icon: Lightning,      label: n.snapshotQueue,  badge: null },
    { to: APP_ROUTE_PATHS.adminDiscovery,                     icon: MagnifyingGlass,label: n.discoveryQueue, badge: null },
    { to: APP_ROUTE_PATHS.adminDesignSystem,                 icon: Palette,        label: n.designSystem,   badge: null },
    // TODO(next iteration): restore Intake wording admin link
    // after refining owner workflows and usage criteria.
    { to: auditId ? buildAppRoute.audit(auditId) : null,   icon: Briefcase,      label: n.auditWorkspace, badge: null },
    { to: auditId ? buildAppRoute.pipeline(auditId) : null,icon: Pulse,          label: n.pipeline,        badge: null },
    { to: auditId ? buildAppRoute.reports(auditId) : null, icon: FileText,       label: n.reports,         badge: null },
    { to: auditId ? buildAppRoute.strategy(auditId) : null,icon: Flask,          label: n.strategyLab,    badge: null },
  ];
}

export function buildClientNav(auditId: string | null, showPipelineInNav: boolean): AppShellNavItem[] {
  const n = APP_SHELL_COPY.nav.client;
  return [
    { to: APP_ROUTE_PATHS.portal,                                        icon: HouseSimple,   label: n.myPortal,    badge: null },
    { to: auditId ? buildAppRoute.portalAudit(auditId) : null,     icon: Eye,           label: n.auditStatus, badge: null },
    { to: auditId && showPipelineInNav ? buildAppRoute.portalPipeline(auditId) : null,   icon: Pulse,         label: n.pipeline,     badge: null },
    { to: auditId ? buildAppRoute.portalReports(auditId) : null, icon: FileText, label: n.reports, badge: null },
    { to: auditId ? buildAppRoute.portalStrategy(auditId) : null, icon: Flask, label: n.strategyLab, badge: null },
  ];
}

export function buildGuestNav(): AppShellNavItem[] {
  return [{ to: APP_ROUTE_PATHS.snapshot, icon: Lightning, label: APP_SHELL_COPY.nav.guest.freeSnapshot, badge: null }];
}

export function isNavItemActive(pathname: string, to: string): boolean {
  return pathname === to ||
    (!to.startsWith('/admin/') && to !== APP_ROUTE_PATHS.dashboard && to !== APP_ROUTE_PATHS.portal &&
      pathname.startsWith(to.split('/').slice(0, 2).join('/')));
}

/**
 * Primary destinations for the fixed mobile tab bar (max 4). Full nav remains in the menu drawer.
 */
export function buildMobileBottomNavItems(
  nav: AppShellNavItem[],
  opts: { isClient: boolean; isGuest: boolean; roleUnknown: boolean },
): AppShellNavItem[] {
  if (opts.roleUnknown) return [];
  const withTo = nav.filter((i): i is AppShellNavItem & { to: string } => Boolean(i.to));
  if (opts.isGuest) return withTo.slice(0, 4);
  if (opts.isClient) {
    const urls = new Set(withTo.map(i => i.to));
    const out: AppShellNavItem[] = [...withTo];
    if (!urls.has(APP_ROUTE_PATHS.portalAuditNew)) {
      out.push({ to: APP_ROUTE_PATHS.portalAuditNew, icon: PlusCircle, label: APP_SHELL_COPY.sidebar.newAudit, badge: null });
    }
    return out.slice(0, 4);
  }
  return withTo.slice(0, 4);
}
