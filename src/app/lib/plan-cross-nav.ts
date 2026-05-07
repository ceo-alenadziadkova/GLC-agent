import type { PortalPlanViewParam } from '../config/portal-plan';
import { PORTAL_PLAN_VIEW_QUERY_KEY } from '../config/portal-plan';
import { PLAN_WORKSPACE_MODE_QUERY_KEY, type PlanWorkspaceMode } from '../config/plan-workspace-mode';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../config/plan-delivery-board-ui';
import { buildAppRoute } from '../config/route-paths';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';

/** Shared deep-link parameter across Plan surfaces (Board / Roadmap / Table). */
export const PORTAL_PLAN_FOCUS_QUERY_KEY = 'focus' as const;

/** Comma-separated orchestration lane ids (`seo_digital,marketing_narrative`) for Board / Table filtering. */
export const PORTAL_PLAN_LANE_QUERY_KEY = 'lane' as const;

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
 * Absolute plan surface href with canonical `view` and optional `focus` (canonical node key / pack node id).
 * Preserves symmetry with roadmap → board linking in unified Plan shells.
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
 * Merges `mode` and/or `focus` onto a canonical plan href (`buildAppRoute.plan` / `portalPlan`).
 * Omits `mode=execute` so execute is the default when the param is absent.
 */
export function mergePlanWorkspaceQueryIntoHref(
  baseHref: string,
  patch: { mode?: PlanWorkspaceMode; focus?: string | null },
): string {
  const sharp = baseHref.indexOf('#');
  const pathPart = sharp === -1 ? baseHref : baseHref.slice(0, sharp);
  const hashPart = sharp === -1 ? '' : baseHref.slice(sharp);
  const q = pathPart.indexOf('?');
  const pathOnly = q === -1 ? pathPart : pathPart.slice(0, q);
  const rawQs = q === -1 ? '' : pathPart.slice(q + 1);
  const sp = new URLSearchParams(rawQs);
  if (patch.mode !== undefined) {
    if (patch.mode === 'execute') {
      sp.delete(PLAN_WORKSPACE_MODE_QUERY_KEY);
    } else {
      sp.set(PLAN_WORKSPACE_MODE_QUERY_KEY, patch.mode);
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
 * Adds or removes `focus` on a canonical plan href (`buildAppRoute.plan` / `portalPlan`).
 */
export function mergeFocusIntoPlanHref(baseHref: string, focus: string | null | undefined): string {
  return mergePlanWorkspaceQueryIntoHref(baseHref, { focus });
}

/**
 * Switches `view=` while preserving `focus` and any other foreign query pairs (toolbar deep-links).
 */
export function buildPlanUrlWithViewPreservingForeignParams(args: {
  pathname: string;
  currentSearch: string;
  nextView: PortalPlanViewParam;
}): string {
  const sp = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  const focus = sp.get(PORTAL_PLAN_FOCUS_QUERY_KEY);
  sp.set(PORTAL_PLAN_VIEW_QUERY_KEY, args.nextView);
  if (focus != null && focus.trim() !== '') {
    sp.set(PORTAL_PLAN_FOCUS_QUERY_KEY, focus.trim());
  } else {
    sp.delete(PORTAL_PLAN_FOCUS_QUERY_KEY);
  }
  const qs = sp.toString();
  return qs ? `${args.pathname}?${qs}` : args.pathname;
}

/** Sets `view=` and forces `mode=execute` (Board / Roadmap / Table strip). */
export function buildPlanExecuteViewHref(args: {
  pathname: string;
  currentSearch: string;
  nextView: PortalPlanViewParam;
}): string {
  const withView = buildPlanUrlWithViewPreservingForeignParams(args);
  return mergePlanWorkspaceQueryIntoHref(withView, { mode: 'execute' });
}

/**
 * Sets `mode=` while preserving `view`, `focus`, and other query pairs (toolbar deep-links).
 */
export function buildPlanUrlWithModePreservingForeignParams(args: {
  pathname: string;
  currentSearch: string;
  nextMode: PlanWorkspaceMode;
}): string {
  const sp = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  if (args.nextMode === 'execute') {
    sp.delete(PLAN_WORKSPACE_MODE_QUERY_KEY);
  } else {
    sp.set(PLAN_WORKSPACE_MODE_QUERY_KEY, args.nextMode);
  }
  const qs = sp.toString();
  return qs ? `${args.pathname}?${qs}` : args.pathname;
}

/**
 * Canonical `/plan` / `/portal/plan` href with `view`, optional `focus`, and workspace `mode`.
 */
export function buildPlanWorkspaceHref(args: {
  auditId: string;
  isClient: boolean;
  mode: PlanWorkspaceMode;
  view?: PortalPlanViewParam;
  focus?: string | null;
}): string {
  const view = args.view ?? primaryPlanWorkbenchViewForStrategyLinks();
  const base = args.isClient ? buildAppRoute.portalPlan(args.auditId, view) : buildAppRoute.plan(args.auditId, view);
  return mergePlanWorkspaceQueryIntoHref(base, { mode: args.mode, focus: args.focus });
}

/** ADR name — alias of {@link buildPlanWorkspaceHref}. */
export function buildPlanModeHrefWithFocus(args: Parameters<typeof buildPlanWorkspaceHref>[0]): string {
  return buildPlanWorkspaceHref(args);
}

/** True for consultant `/plan/:id` and client `/portal/plan/:id` workspace routes. */
export function isCanonicalPlanWorkspacePathname(pathname: string): boolean {
  return pathname.startsWith('/plan/') || pathname.startsWith('/portal/plan/');
}
