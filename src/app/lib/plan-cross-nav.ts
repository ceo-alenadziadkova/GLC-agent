import type { PortalPlanViewParam } from '../config/portal-plan';
import { PORTAL_PLAN_VIEW_QUERY_KEY, parsePortalPlanViewParam } from '../config/portal-plan';
import { PLAN_WORKSPACE_MODE_QUERY_KEY, type PlanWorkspaceMode } from '../config/plan-workspace-mode';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../config/plan-delivery-board-ui';
import { buildAppRoute } from '../config/route-paths';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';

/** Shared deep-link parameter across Plan surfaces (Board / Roadmap / Table). */
export const PORTAL_PLAN_FOCUS_QUERY_KEY = 'focus' as const;

/** Comma-separated orchestration lane ids (`seo_digital,marketing_narrative`) for Board / Table filtering. */
export const PORTAL_PLAN_LANE_QUERY_KEY = 'lane' as const;
export const PORTAL_PLAN_DOMAIN_QUERY_KEY = 'domain' as const;
export const PORTAL_PLAN_PRIORITY_QUERY_KEY = 'prio' as const;
export const PORTAL_PLAN_QUICK_WIN_QUERY_KEY = 'quick' as const;
export const PORTAL_PLAN_CRITICAL_QUERY_KEY = 'crit' as const;
export const PORTAL_PLAN_ASSIGNEE_QUERY_KEY = 'assignee' as const;
export const PORTAL_PLAN_DUE_STATE_QUERY_KEY = 'due' as const;

const LAB_PATH_RE = /^(\/portal)?\/lab\/(?<auditId>[^/]+)\/?$/;

const PLAN_PATH_RE =
  /^(?<portal>\/portal)?\/plan\/(?<auditId>[^/]+)(?:\/(?<surface>board|roadmap|table|studio))?$/;

export type PlanWorkspacePathContext = {
  auditId: string;
  isClient: boolean;
  /** `index` = `/plan/:id` with no child segment. */
  surface: 'board' | 'roadmap' | 'table' | 'studio' | 'index';
};

/**
 * Parses canonical plan workspace pathnames (`/plan/:id/...`, `/portal/plan/:id/...`) and Strategy Lab
 * studio (`/lab/:id`, `/portal/lab/:id`). Legacy `/plan/:id/studio` is still recognized until redirect.
 */
export function planWorkspacePathContext(pathname: string): PlanWorkspacePathContext | null {
  const lab = pathname.match(LAB_PATH_RE);
  if (lab?.groups?.auditId) {
    return { auditId: lab.groups.auditId, isClient: Boolean(lab[1]), surface: 'studio' };
  }
  const m = pathname.match(PLAN_PATH_RE);
  if (!m?.groups?.auditId) return null;
  const auditId = m.groups.auditId;
  const isClient = Boolean(m.groups.portal);
  const s = m.groups.surface;
  if (s === 'board' || s === 'roadmap' || s === 'table' || s === 'studio') {
    return { auditId, isClient, surface: s };
  }
  return { auditId, isClient, surface: 'index' };
}

/**
 * Parses `?lane=` as a comma-separated list of lane ids (trimmed, de-duplicated).
 */
export function readPlanLaneFilterKeys(search: string): readonly string[] {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = sp.get(PORTAL_PLAN_LANE_QUERY_KEY);
  if (raw == null || raw.trim() === '') return [];
  const set = new Set<string>();
  for (const part of raw.split(',')) {
    const t = part.trim();
    if (t !== '') set.add(t);
  }
  return [...set];
}

export type PlanCardMetricFilters = {
  domain: string;
  priority: 'all' | '7d' | '30d';
  quickOnly: boolean;
  criticalOnly: boolean;
  assignee: string;
  dueState: 'all' | 'overdue' | 'due_soon' | 'no_due';
};

export function readPlanCardMetricFilters(search: string): PlanCardMetricFilters {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const domain = (sp.get(PORTAL_PLAN_DOMAIN_QUERY_KEY) ?? 'all').trim() || 'all';
  const prio = (sp.get(PORTAL_PLAN_PRIORITY_QUERY_KEY) ?? 'all').trim();
  const priority: PlanCardMetricFilters['priority'] = prio === '7d' || prio === '30d' ? prio : 'all';
  const quickOnly = sp.get(PORTAL_PLAN_QUICK_WIN_QUERY_KEY) === '1';
  const criticalOnly = sp.get(PORTAL_PLAN_CRITICAL_QUERY_KEY) === '1';
  const assignee = (sp.get(PORTAL_PLAN_ASSIGNEE_QUERY_KEY) ?? 'all').trim() || 'all';
  const dueRaw = (sp.get(PORTAL_PLAN_DUE_STATE_QUERY_KEY) ?? 'all').trim();
  const dueState: PlanCardMetricFilters['dueState'] =
    dueRaw === 'overdue' || dueRaw === 'due_soon' || dueRaw === 'no_due' ? dueRaw : 'all';
  return { domain, priority, quickOnly, criticalOnly, assignee, dueState };
}

export function mergePlanCardMetricFiltersIntoLocationSearch(args: {
  pathname: string;
  currentSearch: string;
  patch: Partial<PlanCardMetricFilters>;
}): string {
  const prev = readPlanCardMetricFilters(args.currentSearch);
  const next: PlanCardMetricFilters = {
    domain: args.patch.domain ?? prev.domain,
    priority: args.patch.priority ?? prev.priority,
    quickOnly: args.patch.quickOnly ?? prev.quickOnly,
    criticalOnly: args.patch.criticalOnly ?? prev.criticalOnly,
    assignee: args.patch.assignee ?? prev.assignee,
    dueState: args.patch.dueState ?? prev.dueState,
  };
  const sp = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  if (next.domain !== 'all') sp.set(PORTAL_PLAN_DOMAIN_QUERY_KEY, next.domain);
  else sp.delete(PORTAL_PLAN_DOMAIN_QUERY_KEY);
  if (next.priority !== 'all') sp.set(PORTAL_PLAN_PRIORITY_QUERY_KEY, next.priority);
  else sp.delete(PORTAL_PLAN_PRIORITY_QUERY_KEY);
  if (next.quickOnly) sp.set(PORTAL_PLAN_QUICK_WIN_QUERY_KEY, '1');
  else sp.delete(PORTAL_PLAN_QUICK_WIN_QUERY_KEY);
  if (next.criticalOnly) sp.set(PORTAL_PLAN_CRITICAL_QUERY_KEY, '1');
  else sp.delete(PORTAL_PLAN_CRITICAL_QUERY_KEY);
  if (next.assignee !== 'all') sp.set(PORTAL_PLAN_ASSIGNEE_QUERY_KEY, next.assignee);
  else sp.delete(PORTAL_PLAN_ASSIGNEE_QUERY_KEY);
  if (next.dueState !== 'all') sp.set(PORTAL_PLAN_DUE_STATE_QUERY_KEY, next.dueState);
  else sp.delete(PORTAL_PLAN_DUE_STATE_QUERY_KEY);
  const qs = sp.toString();
  return qs ? `${args.pathname}?${qs}` : args.pathname;
}

/**
 * Toggles a lane id in `?lane=` (comma-separated) and returns the next pathname + query for `navigate`.
 */
export function mergeLaneFilterToggleIntoLocationSearch(args: {
  pathname: string;
  currentSearch: string;
  laneId: string;
}): string {
  const sp = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  const set = new Set(readPlanLaneFilterKeys(args.currentSearch));
  if (set.has(args.laneId)) set.delete(args.laneId);
  else set.add(args.laneId);
  const arr = [...set].sort();
  if (arr.length === 0) sp.delete(PORTAL_PLAN_LANE_QUERY_KEY);
  else sp.set(PORTAL_PLAN_LANE_QUERY_KEY, arr.join(','));
  const qs = sp.toString();
  return qs ? `${args.pathname}?${qs}` : args.pathname;
}

/** Removes `?lane=` while preserving other query pairs. */
export function mergeClearLaneFilterIntoLocationSearch(args: { pathname: string; currentSearch: string }): string {
  const sp = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  sp.delete(PORTAL_PLAN_LANE_QUERY_KEY);
  const qs = sp.toString();
  return qs ? `${args.pathname}?${qs}` : args.pathname;
}

/**
 * Absolute plan surface href with path segment `view` and optional `focus` (canonical node key / pack node id).
 */
export function buildPlanSurfaceHrefWithFocus(args: {
  auditId: string;
  isClient: boolean;
  view: PortalPlanViewParam;
  focusCanonicalKey: string | null | undefined;
}): string {
  const base = args.isClient ? buildAppRoute.portalPlan(args.auditId, args.view) : buildAppRoute.plan(args.auditId, args.view);
  return mergeFocusIntoPlanHref(base, args.focusCanonicalKey ?? null);
}

export function readPlanFocusCanonicalKey(search: string): string | null {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = sp.get(PORTAL_PLAN_FOCUS_QUERY_KEY);
  return raw != null && raw.trim() !== '' ? raw.trim() : null;
}

/**
 * Maps `?focus=` (board canonical key or graph node id) to a pack graph node id for Roadmap timeline tasks.
 */
export function resolvePlanFocusToPackGraphNodeId(
  focus: string | null | undefined,
  pack: GlcOrchestrationPackView | null | undefined,
): string | null {
  const f = typeof focus === 'string' ? focus.trim() : '';
  if (!f) return null;
  const nodes = pack?.graph?.nodes;
  if (!nodes?.length) return f;
  if (nodes.some(n => n.id === f)) return f;
  const byBoardKey = nodes.find(n => typeof n.board_identity_key === 'string' && n.board_identity_key === f);
  return byBoardKey?.id ?? f;
}

/**
 * Merges `mode` and/or `focus` onto a plan workspace href (path-first `/plan/:id/...`).
 * Omits `mode=execute` in the query string; execute is implied by delivery path segments.
 */
export function mergePlanWorkspaceQueryIntoHref(
  baseHref: string,
  patch: { mode?: PlanWorkspaceMode; focus?: string | null },
): string {
  const sharp = baseHref.indexOf('#');
  const pathPart = sharp === -1 ? baseHref : baseHref.slice(0, sharp);
  const hashPart = sharp === -1 ? '' : baseHref.slice(sharp);
  const q = pathPart.indexOf('?');
  let pathOnly = q === -1 ? pathPart : pathPart.slice(0, q);
  const rawQs = q === -1 ? '' : pathPart.slice(q + 1);
  const sp = new URLSearchParams(rawQs);

  const ctx = planWorkspacePathContext(pathOnly);

  if (patch.mode !== undefined) {
    if (patch.mode === 'execute') {
      sp.delete(PLAN_WORKSPACE_MODE_QUERY_KEY);
      const viewFromQuery = sp.get(PORTAL_PLAN_VIEW_QUERY_KEY);
      const view =
        viewFromQuery != null && String(viewFromQuery).trim() !== ''
          ? parsePortalPlanViewParam(viewFromQuery)
          : primaryPlanWorkbenchViewForStrategyLinks();
      sp.delete(PORTAL_PLAN_VIEW_QUERY_KEY);
      if (ctx) {
        pathOnly = ctx.isClient ? buildAppRoute.portalPlan(ctx.auditId, view) : buildAppRoute.plan(ctx.auditId, view);
      }
    } else {
      sp.set(PLAN_WORKSPACE_MODE_QUERY_KEY, patch.mode);
      sp.delete(PORTAL_PLAN_VIEW_QUERY_KEY);
      if (ctx) {
        pathOnly = ctx.isClient ? buildAppRoute.portalPlanStudio(ctx.auditId) : buildAppRoute.planStudio(ctx.auditId);
      }
    }
  }

  if (patch.focus !== undefined) {
    if (patch.focus != null && String(patch.focus).trim() !== '') {
      sp.set(PORTAL_PLAN_FOCUS_QUERY_KEY, String(patch.focus).trim());
    } else {
      sp.delete(PORTAL_PLAN_FOCUS_QUERY_KEY);
    }
  }

  const qs = sp.toString();
  return `${pathOnly}${qs ? `?${qs}` : ''}${hashPart}`;
}

/**
 * Adds or removes `focus` on a canonical plan href (`buildAppRoute.plan` / `portalPlan` / studio).
 */
export function mergeFocusIntoPlanHref(baseHref: string, focus: string | null | undefined): string {
  return mergePlanWorkspaceQueryIntoHref(baseHref, { focus });
}

/**
 * Switches delivery surface while preserving `focus`, `lane`, and other query pairs (toolbar deep-links).
 * Strips legacy `view=` from the output query — the surface is encoded in the pathname.
 */
export function buildPlanUrlWithViewPreservingForeignParams(args: {
  pathname: string;
  currentSearch: string;
  nextView: PortalPlanViewParam;
}): string {
  const sp = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  sp.delete(PORTAL_PLAN_VIEW_QUERY_KEY);
  sp.delete(PLAN_WORKSPACE_MODE_QUERY_KEY);
  const qs = sp.toString();
  const ctx = planWorkspacePathContext(args.pathname);
  if (ctx) {
    const path = ctx.isClient ? buildAppRoute.portalPlan(ctx.auditId, args.nextView) : buildAppRoute.plan(ctx.auditId, args.nextView);
    return qs ? `${path}?${qs}` : path;
  }
  const legacy = args.pathname.match(/^(\/portal)?\/plan\/([^/]+)$/);
  if (legacy?.[2]) {
    const isClient = legacy[1] === '/portal';
    const path = isClient ? buildAppRoute.portalPlan(legacy[2], args.nextView) : buildAppRoute.plan(legacy[2], args.nextView);
    return qs ? `${path}?${qs}` : path;
  }
  /** Fallback: pathname not recognized — preserve old query mutation (should not happen on canonical routes). */
  const sp2 = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  const focus = sp2.get(PORTAL_PLAN_FOCUS_QUERY_KEY);
  sp2.set(PORTAL_PLAN_VIEW_QUERY_KEY, args.nextView);
  if (focus != null && focus.trim() !== '') {
    sp2.set(PORTAL_PLAN_FOCUS_QUERY_KEY, focus.trim());
  } else {
    sp2.delete(PORTAL_PLAN_FOCUS_QUERY_KEY);
  }
  const qs2 = sp2.toString();
  return qs2 ? `${args.pathname}?${qs2}` : args.pathname;
}

/** Navigates to another delivery surface; drops studio `mode` from the query when present. */
export function buildPlanExecuteViewHref(args: {
  pathname: string;
  currentSearch: string;
  nextView: PortalPlanViewParam;
}): string {
  return buildPlanUrlWithViewPreservingForeignParams(args);
}

/**
 * Sets workspace `mode` while preserving `focus` and other query pairs; rewrites pathname for studio vs delivery.
 */
export function buildPlanUrlWithModePreservingForeignParams(args: {
  pathname: string;
  currentSearch: string;
  nextMode: PlanWorkspaceMode;
}): string {
  const sp = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  const ctx = planWorkspacePathContext(args.pathname);

  if (args.nextMode === 'execute') {
    sp.delete(PLAN_WORKSPACE_MODE_QUERY_KEY);
    sp.delete(PORTAL_PLAN_VIEW_QUERY_KEY);
    const qs = sp.toString();
    if (ctx) {
      const view = primaryPlanWorkbenchViewForStrategyLinks();
      const path = ctx.isClient ? buildAppRoute.portalPlan(ctx.auditId, view) : buildAppRoute.plan(ctx.auditId, view);
      return qs ? `${path}?${qs}` : path;
    }
    const legacy = args.pathname.match(/^(\/portal)?\/plan\/([^/]+)$/);
    if (legacy?.[2]) {
      const isClient = legacy[1] === '/portal';
      const view = primaryPlanWorkbenchViewForStrategyLinks();
      const path = isClient ? buildAppRoute.portalPlan(legacy[2], view) : buildAppRoute.plan(legacy[2], view);
      return qs ? `${path}?${qs}` : path;
    }
    const qsFallback = sp.toString();
    return qsFallback ? `${args.pathname}?${qsFallback}` : args.pathname;
  }

  sp.delete(PORTAL_PLAN_VIEW_QUERY_KEY);
  sp.set(PLAN_WORKSPACE_MODE_QUERY_KEY, args.nextMode);
  const qs = sp.toString();
  if (ctx) {
    const path = ctx.isClient ? buildAppRoute.portalPlanStudio(ctx.auditId) : buildAppRoute.planStudio(ctx.auditId);
    return qs ? `${path}?${qs}` : path;
  }
  const legacy = args.pathname.match(/^(\/portal)?\/plan\/([^/]+)$/);
  if (legacy?.[2]) {
    const isClient = legacy[1] === '/portal';
    const path = isClient ? buildAppRoute.portalPlanStudio(legacy[2]) : buildAppRoute.planStudio(legacy[2]);
    return qs ? `${path}?${qs}` : path;
  }
  const qs2 = sp.toString();
  return qs2 ? `${args.pathname}?${qs2}` : args.pathname;
}

/**
 * Canonical `/plan` / `/portal/plan` href with delivery `view`, optional `focus`, and workspace `mode`.
 */
export function buildPlanWorkspaceHref(args: {
  auditId: string;
  isClient: boolean;
  mode: PlanWorkspaceMode;
  view?: PortalPlanViewParam;
  focus?: string | null;
}): string {
  const view = args.view ?? primaryPlanWorkbenchViewForStrategyLinks();
  if (args.mode === 'execute') {
    const base = args.isClient ? buildAppRoute.portalPlan(args.auditId, view) : buildAppRoute.plan(args.auditId, view);
    return mergeFocusIntoPlanHref(base, args.focus ?? undefined);
  }
  const studioBase = args.isClient ? buildAppRoute.portalPlanStudio(args.auditId) : buildAppRoute.planStudio(args.auditId);
  return mergePlanWorkspaceQueryIntoHref(studioBase, { mode: args.mode, focus: args.focus });
}

/** ADR name — alias of {@link buildPlanWorkspaceHref}. */
export function buildPlanModeHrefWithFocus(args: Parameters<typeof buildPlanWorkspaceHref>[0]): string {
  return buildPlanWorkspaceHref(args);
}

/** True for consultant/client plan delivery, studio (`/lab` or legacy `/plan/.../studio`), and plan index. */
export function isCanonicalPlanWorkspacePathname(pathname: string): boolean {
  return planWorkspacePathContext(pathname) != null;
}
