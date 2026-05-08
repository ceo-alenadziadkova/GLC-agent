import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { usePlanCommandSurfaceCommands } from '../context/PlanCommandRegistryContext';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { PLAN_WORKSPACE_COMPILE_REQUEST_EVENT } from '../config/plan-workspace-mode';
import type { PortalPlanViewParam } from '../config/portal-plan';
import { PLAN_WORKSPACE_UI_COPY } from '../config/plan-workspace-ui-copy.en';
import {
  buildPlanExecuteViewHref,
  buildPlanUrlWithModePreservingForeignParams,
  isCanonicalPlanWorkspacePathname,
} from './plan-cross-nav';

export type PlanWorkspacePaletteCommand = {
  id: string;
  label: string;
  keywords: string;
  run: () => void;
};

/**
 * Built-in Cmd/Ctrl+K commands (modes, views, compile) for canonical Plan workspace routes.
 */
function usePlanWorkspaceBasePaletteCommands(): PlanWorkspacePaletteCommand[] {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { id: auditId } = useParams<{ id: string }>();

  return useMemo(() => {
    if (!auditId || !isCanonicalPlanWorkspacePathname(pathname)) return [];
    const base = { pathname, currentSearch: search };
    const c = PLAN_WORKSPACE_UI_COPY;

    const viewCmd = (id: string, label: string, keywords: string, nextView: PortalPlanViewParam): PlanWorkspacePaletteCommand => ({
      id,
      label,
      keywords,
      run: () => navigate(buildPlanExecuteViewHref({ ...base, nextView })),
    });

    return [
      {
        id: 'mode-define',
        label: c.commandPaletteModeDefine,
        keywords: 'define constraints benchmarks',
        run: () => navigate(buildPlanUrlWithModePreservingForeignParams({ ...base, nextMode: 'define' })),
      },
      {
        id: 'mode-shape',
        label: c.commandPaletteModeShape,
        keywords: 'shape manifest pack compile orchestration',
        run: () => navigate(buildPlanUrlWithModePreservingForeignParams({ ...base, nextMode: 'shape' })),
      },
      {
        id: 'mode-execute',
        label: c.commandPaletteModeExecute,
        keywords: 'execute delivery workbench',
        run: () => navigate(buildPlanUrlWithModePreservingForeignParams({ ...base, nextMode: 'execute' })),
      },
      viewCmd('view-board', c.commandPaletteViewBoard, 'board delivery', 'board'),
      viewCmd('view-roadmap', c.commandPaletteViewRoadmap, 'roadmap gantt schedule', 'roadmap'),
      viewCmd('view-table', c.commandPaletteViewTable, 'table rows tasks', 'table'),
      {
        id: 'compile',
        label: c.commandPaletteRunCompile,
        keywords: `${ORCHESTRATION_UI_COPY.compilePlan} pack snapshot`,
        run: () => window.dispatchEvent(new Event(PLAN_WORKSPACE_COMPILE_REQUEST_EVENT)),
      },
    ];
  }, [auditId, navigate, pathname, search]);
}

/**
 * Cmd/Ctrl+K command list: built-in modes/views/compile plus surface-registered commands (Board, Table, Shape).
 */
export function usePlanWorkspacePaletteCommands(): PlanWorkspacePaletteCommand[] {
  const base = usePlanWorkspaceBasePaletteCommands();
  const surface = usePlanCommandSurfaceCommands();
  return useMemo(() => [...base, ...surface], [base, surface]);
}
