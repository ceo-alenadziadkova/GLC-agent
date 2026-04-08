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
  TreeStructure,
} from '@phosphor-icons/react';

export type AppShellNavItem = {
  to: string | null;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  badge: string | null;
};

export function buildConsultantNav(auditId: string | null): AppShellNavItem[] {
  return [
    { to: '/dashboard',                           icon: SquaresFour,    label: 'Dashboard',       badge: null },
    { to: '/admin/requests',                      icon: Tray,           label: 'Request queue',   badge: null },
    { to: '/admin/snapshots',                     icon: Lightning,      label: 'Snapshot queue',  badge: null },
    { to: '/admin/discovery',                     icon: MagnifyingGlass,label: 'Discovery queue', badge: null },
    { to: '/admin/intake-trace',                  icon: TreeStructure,  label: 'Intake trace',    badge: null },
    { to: auditId ? `/audit/${auditId}` : null,   icon: Briefcase,      label: 'Audit Workspace', badge: null },
    { to: auditId ? `/pipeline/${auditId}` : null,icon: Pulse,          label: 'Pipeline',        badge: null },
    { to: auditId ? `/reports/${auditId}` : null, icon: FileText,       label: 'Reports',         badge: null },
    { to: auditId ? `/strategy/${auditId}` : null,icon: Flask,          label: 'Strategy Lab',    badge: null },
  ];
}

export function buildClientNav(auditId: string | null, showPipelineInNav: boolean): AppShellNavItem[] {
  return [
    { to: '/portal',                                        icon: HouseSimple,   label: 'My Portal',    badge: null },
    { to: auditId ? `/portal/audit/${auditId}` : null,     icon: Eye,           label: 'Audit Status', badge: null },
    { to: auditId && showPipelineInNav ? `/portal/pipeline/${auditId}` : null,   icon: Pulse,         label: 'Pipeline',     badge: null },
  ];
}

export function buildGuestNav(): AppShellNavItem[] {
  return [{ to: '/snapshot', icon: Lightning, label: 'Free snapshot', badge: null }];
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
      out.push({ to: '/portal/audit/new', icon: PlusCircle, label: 'New audit', badge: null });
    }
    return out.slice(0, 4);
  }
  return withTo.slice(0, 4);
}
