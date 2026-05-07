import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import {
  PLAN_WORKSPACE_MODE_QUERY_KEY,
  type PlanWorkspaceMode,
  parsePlanWorkspaceModeParam,
} from '../config/plan-workspace-mode';
import { buildPlanUrlWithModePreservingForeignParams, planWorkspacePathContext } from '../lib/plan-cross-nav';

export type UsePlanWorkspaceModeResult = {
  mode: PlanWorkspaceMode;
  setMode: (next: PlanWorkspaceMode) => void;
};

function resolveModeFromLocation(pathname: string, searchParams: URLSearchParams): PlanWorkspaceMode {
  const ctx = planWorkspacePathContext(pathname);
  if (ctx?.surface === 'studio') {
    const raw = searchParams.get(PLAN_WORKSPACE_MODE_QUERY_KEY);
    return raw != null && String(raw).trim() !== '' ? parsePlanWorkspaceModeParam(raw) : 'shape';
  }
  if (ctx?.surface === 'index') {
    const raw = searchParams.get(PLAN_WORKSPACE_MODE_QUERY_KEY);
    if (raw != null && String(raw).trim() !== '') {
      const p = parsePlanWorkspaceModeParam(raw);
      if (p === 'define' || p === 'shape') return p;
    }
    return 'execute';
  }
  if (ctx && (ctx.surface === 'board' || ctx.surface === 'roadmap' || ctx.surface === 'table')) {
    return 'execute';
  }
  return 'execute';
}

/**
 * Plan workspace mode from path (`/lab/:id?mode=` or delivery path segments) plus `setMode` navigation.
 */
export function usePlanWorkspaceMode(): UsePlanWorkspaceModeResult {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = useMemo(
    () => resolveModeFromLocation(location.pathname, searchParams),
    [location.pathname, searchParams],
  );

  const setMode = useCallback(
    (next: PlanWorkspaceMode) => {
      navigate(
        buildPlanUrlWithModePreservingForeignParams({
          pathname: location.pathname,
          currentSearch: location.search,
          nextMode: next,
        }),
      );
    },
    [navigate, location.pathname, location.search],
  );

  return { mode, setMode };
}
