import { useEffect } from 'react';

import { PLAN_WORKSPACE_COMPILE_REQUEST_EVENT } from '../config/plan-workspace-mode';

type UsePlanWorkspaceCompileRequestArgs = {
  onCompileRequest: () => void;
};

/**
 * Handles global compile requests dispatched by the Plan workspace chrome.
 * Keeps event wiring out of page-level components.
 */
export function usePlanWorkspaceCompileRequest({ onCompileRequest }: UsePlanWorkspaceCompileRequestArgs): void {
  useEffect(() => {
    window.addEventListener(PLAN_WORKSPACE_COMPILE_REQUEST_EVENT, onCompileRequest);
    return () => window.removeEventListener(PLAN_WORKSPACE_COMPILE_REQUEST_EVENT, onCompileRequest);
  }, [onCompileRequest]);
}
