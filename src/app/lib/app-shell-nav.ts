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
} from '@phosphor-icons/react';
import { APP_SHELL_COPY } from '../config/app-shell-copy';

export type AppShellNavItem = {
  to: string | null;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  badge: string | null;
};

export function buildConsultantNav(auditId: string | null): AppShellNavItem[] {
  const n = APP_SHELL_COPY.nav.consultant;
  return [
    { to: '/dashboard',                           icon: SquaresFour,    label: n.dashboard,       badge: null },
    { to: '/admin/requests',                      icon: Tray,           label: n.requestQueue,   badge: null },
    { to: '/admin/snapshots',                     icon: Lightning,      label: n.snapshotQueue,  badge: null },
    { to: '/admin/discovery',                     icon: MagnifyingGlass,label: n.discoveryQueue, badge: null },
    // TODO(next iteration): restore Intake trace / Intake wording admin links
    // after refining owner workflows and usage criteria.
    { to: auditId ? `/audit/${auditId}` : null,   icon: Briefcase,      label: n.auditWorkspace, badge: null },
    { to: auditId ? `/pipeline/${auditId}` : null,icon: Pulse,          label: n.pipeline,        badge: null },
    { to: auditId ? `/reports/${auditId}` : null, icon: FileText,       label: n.reports,         badge: null },
    { to: auditId ? `/strategy/${auditId}` : null,icon: Flask,          label: n.strategyLab,    badge: null },
  ];
}

export function buildClientNav(auditId: string | null, showPipelineInNav: boolean): AppShellNavItem[] {
  const n = APP_SHELL_COPY.nav.client;
  return [
    { to: '/portal',                                        icon: HouseSimple,   label: n.myPortal,    badge: null },
    { to: auditId ? `/portal/audit/${auditId}` : null,     icon: Eye,           label: n.auditStatus, badge: null },
    { to: auditId && showPipelineInNav ? `/portal/pipeline/${auditId}` : null,   icon: Pulse,         label: n.pipeline,     badge: null },
  ];
}

export function buildGuestNav(): AppShellNavItem[] {
  return [{ to: '/snapshot', icon: Lightning, label: APP_SHELL_COPY.nav.guest.freeSnapshot, badge: null }];
}

export function isNavItemActive(pathname: string, to: string): boolean {
  return pathname === to ||
    (!to.startsWith('/admin/') && to !== '/dashboard' && to !== '/portal' &&
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
    if (!urls.has('/portal/audit/new')) {
      out.push({ to: '/portal/audit/new', icon: PlusCircle, label: APP_SHELL_COPY.sidebar.newAudit, badge: null });
    }
    return out.slice(0, 4);
  }
  return withTo.slice(0, 4);
}
