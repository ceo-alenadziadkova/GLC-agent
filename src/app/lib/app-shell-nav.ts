import type { ComponentType, CSSProperties } from 'react';
import {
  Briefcase,
  SquaresFour,
  Pulse,
  FileText,
  Path,
  MagnifyingGlass,
  Lightning,
  HouseSimple,
  Eye,
  Tray,
  PlusCircle,
  Flask,
} from '@phosphor-icons/react';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { APP_SHELL_COPY } from '../config/app-shell-copy';
import { parsePortalPlanViewParam } from '../config/portal-plan';
import { APP_ROUTE_PATHS, buildAppRoute } from '../config/route-paths';

type NavPlanPrimaryOpts = {
  /** When omitted, uses `APP_FEATURE_FLAGS.orchestrationPlanWorkspacePrimaryUxEnabled`. */
  planWorkspacePrimaryUx?: boolean;
  /**
   * When omitted, uses `APP_FEATURE_FLAGS.clientPlanWorkspaceEnabled`.
   * (Tests may override without mutating module state.)
   */
  clientPlanWorkspaceEnabled?: boolean;
  /**
   * When omitted, uses `APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled`.
   * Hides consultant execution-timeline nav when roadmap/orchestration UI is off.
   */
  orchestrationRoadmapUiEnabled?: boolean;
};

function resolvePlanPrimaryUx(opts?: NavPlanPrimaryOpts): boolean {
  return opts?.planWorkspacePrimaryUx ?? APP_FEATURE_FLAGS.orchestrationPlanWorkspacePrimaryUxEnabled;
}

function resolveClientPlanWorkspaceEnabled(opts?: NavPlanPrimaryOpts): boolean {
  return opts?.clientPlanWorkspaceEnabled ?? APP_FEATURE_FLAGS.clientPlanWorkspaceEnabled;
}

function resolveConsultantPlanWorkspaceEnabled(opts?: NavPlanPrimaryOpts): boolean {
  return opts?.orchestrationRoadmapUiEnabled ?? APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled;
}

export type AppShellNavItem = {
  to: string | null;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  badge: string | null;
};

export function buildConsultantNav(auditId: string | null, opts?: NavPlanPrimaryOpts): AppShellNavItem[] {
  const n = APP_SHELL_COPY.nav.consultant;
  const consultantPlanWorkspaceEnabled = resolveConsultantPlanWorkspaceEnabled(opts);
  const strategyLabItem: AppShellNavItem = {
    to: auditId && consultantPlanWorkspaceEnabled ? buildAppRoute.planStudio(auditId) : null,
    icon: Flask,
    label: n.strategyLab,
    badge: null,
  };
  const planItem: AppShellNavItem = {
    to: auditId && consultantPlanWorkspaceEnabled ? buildAppRoute.plan(auditId) : null,
    icon: Path,
    label: n.timeline,
    badge: null,
  };
  const sequencingPair = consultantPlanWorkspaceEnabled ? [planItem] : [];
  return [
    { to: APP_ROUTE_PATHS.dashboard,                           icon: SquaresFour,    label: n.dashboard,       badge: null },
    { to: APP_ROUTE_PATHS.adminAudits,                        icon: Briefcase,      label: n.allAudits,      badge: null },
    { to: APP_ROUTE_PATHS.adminRequests,                      icon: Tray,           label: n.requestQueue,   badge: null },
    { to: APP_ROUTE_PATHS.adminSnapshots,                     icon: Lightning,      label: n.snapshotQueue,  badge: null },
    { to: APP_ROUTE_PATHS.adminDiscovery,                     icon: MagnifyingGlass,label: n.discoveryQueue, badge: null },
    { to: auditId ? buildAppRoute.pipeline(auditId) : null, icon: Pulse,          label: n.pipeline,       badge: null },
    // TODO(next iteration): restore Intake wording admin link
    // after refining owner workflows and usage criteria.
    { to: auditId ? buildAppRoute.audit(auditId) : null,    icon: Briefcase,      label: n.auditWorkspace, badge: null },
    strategyLabItem,
    ...sequencingPair,
    { to: auditId ? buildAppRoute.reports(auditId) : null, icon: FileText,       label: n.reports,         badge: null },
  ];
}

export function buildClientNav(
  auditId: string | null,
  showPipelineInNav: boolean,
  opts?: NavPlanPrimaryOpts,
): AppShellNavItem[] {
  const n = APP_SHELL_COPY.nav.client;
  const planFirst = resolvePlanPrimaryUx(opts);
  const clientPlanWorkspaceEnabled = resolveClientPlanWorkspaceEnabled(opts);
  const planItem: AppShellNavItem = {
    to: auditId && clientPlanWorkspaceEnabled ? buildAppRoute.portalPlan(auditId) : null,
    icon: Path,
    label: n.timeline,
    badge: null,
  };
  const strategyLabItem: AppShellNavItem = {
    to: auditId && clientPlanWorkspaceEnabled ? buildAppRoute.portalPlanStudio(auditId) : null,
    icon: Flask,
    label: n.strategyLab,
    badge: null,
  };
  const pipelineItem: AppShellNavItem = {
    to: auditId && showPipelineInNav ? buildAppRoute.portalPipeline(auditId) : null,
    icon: Pulse,
    label: n.pipeline,
    badge: null,
  };
  const sequencingPair = clientPlanWorkspaceEnabled
    ? planFirst
      ? [planItem, pipelineItem]
      : [pipelineItem, planItem]
    : [pipelineItem];
  return [
    { to: APP_ROUTE_PATHS.portal,                                        icon: HouseSimple,   label: n.myPortal,    badge: null },
    { to: auditId ? buildAppRoute.portalAudit(auditId) : null,     icon: Eye,           label: n.auditStatus, badge: null },
    strategyLabItem,
    ...sequencingPair,
    { to: auditId ? buildAppRoute.portalReports(auditId) : null, icon: FileText, label: n.reports, badge: null },
  ];
}

export function buildGuestNav(): AppShellNavItem[] {
  return [{ to: APP_ROUTE_PATHS.snapshot, icon: Lightning, label: APP_SHELL_COPY.nav.guest.freeSnapshot, badge: null }];
}

function splitHrefPathQuery(href: string): { path: string; query: string } {
  const idx = href.indexOf('?');
  if (idx === -1) return { path: href, query: '' };
  return { path: href.slice(0, idx), query: href.slice(idx + 1) };
}

function planViewFromPlanNavTarget(toPath: string, toQueryRaw: string): ReturnType<typeof parsePortalPlanViewParam> {
  if (toQueryRaw) {
    const v = new URLSearchParams(toQueryRaw).get('view');
    if (v != null && String(v).trim() !== '') return parsePortalPlanViewParam(v);
  }
  const m = toPath.match(/^\/(?:portal\/)?plan\/[^/]+\/(board|roadmap|table)$/);
  if (m?.[1]) return parsePortalPlanViewParam(m[1]);
  return parsePortalPlanViewParam(null);
}

function navLocationPlanSurface(pathname: string, search: string): ReturnType<typeof parsePortalPlanViewParam> {
  const qs = search.startsWith('?') ? search.slice(1) : search;
  const fromQuery = new URLSearchParams(qs).get('view');
  if (fromQuery != null && String(fromQuery).trim() !== '') {
    return parsePortalPlanViewParam(fromQuery);
  }
  const m = pathname.match(/^\/(?:portal\/)?plan\/[^/]+\/(board|roadmap|table)$/);
  if (m?.[1]) return parsePortalPlanViewParam(m[1]);
  return parsePortalPlanViewParam(null);
}

function auditIdFromCanonicalPlanPath(path: string): string | null {
  const lab = path.match(/^\/(?:portal\/)?lab\/([^/]+)\/?$/);
  if (lab?.[1]) return lab[1];
  const main = path.match(/^\/plan\/([^/]+)(?:\/(?:board|roadmap|table|studio))?$/);
  const portal = path.match(/^\/portal\/plan\/([^/]+)(?:\/(?:board|roadmap|table|studio))?$/);
  return main?.[1] ?? portal?.[1] ?? null;
}

function legacyPlanRoute(pathname: string, auditId: string, portalSurface: boolean): 'roadmap' | 'timeline' | null {
  if (portalSurface) {
    if (pathname === `/portal/roadmap/${auditId}`) return 'roadmap';
    if (pathname === `/portal/timeline/${auditId}`) return 'timeline';
  }
  if (pathname === `/roadmap/${auditId}`) return 'roadmap';
  if (pathname === `/timeline/${auditId}`) return 'timeline';
  return null;
}

function legacyPlanSurface(
  pathname: string,
  auditId: string,
  portalSurface: boolean,
): 'roadmap' | 'legacy-board' | null {
  const route = legacyPlanRoute(pathname, auditId, portalSurface);
  if (route === 'roadmap') return 'roadmap';
  if (route === 'timeline') return 'legacy-board';
  return null;
}

export function isNavItemActive(pathname: string, to: string, search = ''): boolean {
  const { path: toPath, query: toQueryRaw } = splitHrefPathQuery(to);
  const toPlanView = planViewFromPlanNavTarget(toPath, toQueryRaw);

  const planAuditId = auditIdFromCanonicalPlanPath(toPath);
  if (planAuditId) {
    const locPlanView = navLocationPlanSurface(pathname, search);
    const portal = toPath.startsWith('/portal/');
    const legacy = legacyPlanSurface(pathname, planAuditId, portal);
    if (pathname === toPath) {
      return locPlanView === toPlanView;
    }
    /** Legacy `/timeline/:id` redirects to canonical board view. */
    if (legacy === 'legacy-board') {
      return toPlanView === locPlanView;
    }
    /** Legacy `/roadmap/:id` — highlight roadmap tab targets without requiring query parity on the old path. */
    if (legacy === 'roadmap') {
      return toPlanView === 'roadmap';
    }
    /** On Strategy Lab (`/lab`), do not highlight the Plan delivery nav item. */
    const labAuditId = pathname.match(/^\/(?:portal\/)?lab\/([^/]+)\/?$/)?.[1];
    if (labAuditId && labAuditId === planAuditId) {
      return false;
    }
    return false;
  }

  return (
    pathname === toPath ||
    (!to.startsWith('/admin/') &&
      toPath !== APP_ROUTE_PATHS.dashboard &&
      toPath !== APP_ROUTE_PATHS.portal &&
      pathname.startsWith(toPath.split('/').slice(0, 2).join('/')))
  );
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
