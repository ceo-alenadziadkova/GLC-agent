import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { AppShell } from '../../components/AppShell';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import {
  ORCHESTRATION_IA_COPY,
  ORCHESTRATION_UI_COPY,
} from '../../config/orchestration-roadmap-ui-copy.en';
import { PLAN_BOARD_COPY } from '../../config/plan-board-copy.en';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';

export type PlanSurfaceBranch = 'roadmap' | 'board' | 'table';

export type PlanShellPublication = {
  title: string;
  subtitle?: string | undefined;
};

const DEFAULT_ROADMAP_META: PlanShellPublication = {
  title: ORCHESTRATION_UI_COPY.planRoadmapShellTitle,
  subtitle: ORCHESTRATION_UI_COPY.planRoadmapShellSubtitle,
};

const DEFAULT_BOARD_META: PlanShellPublication = {
  title: PLAN_BOARD_COPY.shellTitle,
  subtitle: PLAN_BOARD_COPY.shellSubtitleReadOnly,
};

const DEFAULT_TABLE_META: PlanShellPublication = {
  title: PLAN_WORKSPACE_UI_COPY.tableShellTitle,
  subtitle: PLAN_WORKSPACE_UI_COPY.tableShellSubtitle,
};

type UnifiedRegistryApi = {
  activeView: PlanSurfaceBranch;
  setPublication: (branch: PlanSurfaceBranch, value: PlanShellPublication | null) => void;
};

const PortalUnifiedShellRegistryContext = createContext<UnifiedRegistryApi | null>(null);

/**
 * Exactly one workspace shell around Plan surfaces on `/plan` so inactive (hidden + inert) panes do not
 * instantiate a second landmark tree.
 */
export function PortalPlanUnifiedShellCoordinator({
  activeView,
  children,
}: {
  activeView: PlanSurfaceBranch;
  children: ReactNode;
}) {
  const [roadmapMeta, setRoadmapMeta] = useState<PlanShellPublication | null>(null);
  const [boardMeta, setBoardMeta] = useState<PlanShellPublication | null>(null);
  const [tableMeta, setTableMeta] = useState<PlanShellPublication | null>(null);

  const setPublication = useCallback((branch: PlanSurfaceBranch, value: PlanShellPublication | null) => {
    if (branch === 'roadmap') {
      setRoadmapMeta(value);
      return;
    }
    if (branch === 'board') {
      setBoardMeta(value);
      return;
    }
    setTableMeta(value);
  }, []);

  const registry = useMemo((): UnifiedRegistryApi => ({ activeView, setPublication }), [activeView, setPublication]);

  const display =
    activeView === 'board'
      ? boardMeta ?? DEFAULT_BOARD_META
      : activeView === 'table'
        ? tableMeta ?? DEFAULT_TABLE_META
        : roadmapMeta ?? DEFAULT_ROADMAP_META;

  return (
    <PortalUnifiedShellRegistryContext.Provider value={registry}>
      <AppShell title={display.title} subtitle={display.subtitle}>
        {children}
      </AppShell>
    </PortalUnifiedShellRegistryContext.Provider>
  );
}

/**
 * When rendered under {@link PortalPlanUnifiedShellCoordinator}, forwards title/subtitle to the coordinator
 * (only while `tabActive`) and skips a nested {@link AppShell}. Otherwise behaves like `AppShell` alone.
 */
export function PortalPlanSurfaceChrome({
  branch,
  tabActive,
  title,
  subtitle,
  children,
}: {
  branch: PlanSurfaceBranch;
  /** Omit on standalone roadmap routes. Pass active tab flags from canonical Plan page only. */
  tabActive?: boolean;
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
}) {
  const unified = useContext(PortalUnifiedShellRegistryContext);
  const setPublication = unified?.setPublication;

  useLayoutEffect(() => {
    if (!setPublication) return undefined;
    if (!tabActive) {
      setPublication(branch, null);
      return () => setPublication(branch, null);
    }
    setPublication(branch, { title, subtitle });
    return () => setPublication(branch, null);
  }, [setPublication, branch, tabActive, title, subtitle]);

  if (!unified) {
    return (
      <AppShell title={title} subtitle={subtitle}>
        {children}
      </AppShell>
    );
  }

  return <>{children}</>;
}
