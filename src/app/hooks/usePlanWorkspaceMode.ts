import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

import {
  PLAN_WORKSPACE_MODE_QUERY_KEY,
  type PlanWorkspaceMode,
  defaultPlanWorkspaceMode,
  parsePlanWorkspaceModeParam,
} from '../config/plan-workspace-mode';

export type UsePlanWorkspaceModeResult = {
  mode: PlanWorkspaceMode;
  setMode: (next: PlanWorkspaceMode) => void;
};

/**
 * Read/write canonical `?mode=` for Plan workspace (Define / Shape / Execute).
 */
export function usePlanWorkspaceMode(): UsePlanWorkspaceModeResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(PLAN_WORKSPACE_MODE_QUERY_KEY);
  const mode = raw != null && String(raw).trim() !== '' ? parsePlanWorkspaceModeParam(raw) : defaultPlanWorkspaceMode();

  const setMode = useCallback(
    (next: PlanWorkspaceMode) => {
      setSearchParams(
        prev => {
          const n = new URLSearchParams(prev);
          if (next === 'execute') {
            n.delete(PLAN_WORKSPACE_MODE_QUERY_KEY);
          } else {
            n.set(PLAN_WORKSPACE_MODE_QUERY_KEY, next);
          }
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { mode, setMode };
}
