import { Navigate, useLocation, useParams } from 'react-router';

import { STRATEGY_LAB_PAGE_ANCHORS } from '../../config/strategy-lab';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../../config/plan-delivery-board-ui';
import type { PlanWorkspaceMode } from '../../config/plan-workspace-mode';
import { APP_ROUTE_PATHS, buildAppRoute } from '../../config/route-paths';
import { mergePlanWorkspaceQueryIntoHref } from '../../lib/plan-cross-nav';

function hashToPlanWorkspaceMode(hash: string): PlanWorkspaceMode {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (h === STRATEGY_LAB_PAGE_ANCHORS.definePhase) return 'define';
  if (h === STRATEGY_LAB_PAGE_ANCHORS.planSetup || h === STRATEGY_LAB_PAGE_ANCHORS.shapePack) return 'shape';
  return 'shape';
}

/**
 * Merges foreign query pairs from `/strategy/:id` onto the canonical plan URL, maps hash anchors to `?mode=`,
 * and drops the legacy hash (ADR Plan Workspace Phase 2).
 */
export function canonicalPlanHrefFromStrategyLegacy(
  canonicalPlanBase: string,
  legacySearch: string,
  mode: PlanWorkspaceMode,
): string {
  const qsIdx = canonicalPlanBase.indexOf('?');
  const pathOnly = qsIdx === -1 ? canonicalPlanBase : canonicalPlanBase.slice(0, qsIdx);
  const canonQs = qsIdx === -1 ? '' : canonicalPlanBase.slice(qsIdx + 1);
  const out = new URLSearchParams(canonQs);
  const leg = new URLSearchParams(legacySearch.startsWith('?') ? legacySearch.slice(1) : legacySearch);
  leg.forEach((value, key) => {
    if (key === 'view' || key === 'mode') return;
    out.set(key, value);
  });
  const serialized = out.toString();
  const pathWithQs = serialized ? `${pathOnly}?${serialized}` : pathOnly;
  return mergePlanWorkspaceQueryIntoHref(pathWithQs, { mode });
}

export type LegacyStrategyPathRedirectProps = {
  variant: 'consultant' | 'portal';
};

/**
 * Redirects `/strategy/:id` (and portal equivalent) to `/plan/:id` with `?mode=` derived from the legacy hash.
 */
export function LegacyStrategyPathRedirect({ variant }: LegacyStrategyPathRedirectProps) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  if (!id) {
    return <Navigate to={variant === 'portal' ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard} replace />;
  }

  const primary = primaryPlanWorkbenchViewForStrategyLinks();
  const canonicalBase =
    variant === 'portal' ? buildAppRoute.portalPlan(id, primary) : buildAppRoute.plan(id, primary);
  const mode = hashToPlanWorkspaceMode(location.hash ?? '');
  const to = canonicalPlanHrefFromStrategyLegacy(canonicalBase, location.search ?? '', mode);
  return <Navigate to={to} replace />;
}
