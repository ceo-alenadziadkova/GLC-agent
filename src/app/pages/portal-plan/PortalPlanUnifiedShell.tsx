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

export type PlanSurfaceBranch = 'roadmap' | 'timeline';

export type PlanShellPublication = {
  title: string;
  subtitle?: string | undefined;
};

const DEFAULT_ROADMAP_META: PlanShellPublication = {
  title: ORCHESTRATION_UI_COPY.planRoadmapShellTitle,
  subtitle: ORCHESTRATION_UI_COPY.planRoadmapShellSubtitle,
};

const DEFAULT_TIMELINE_SUBTITLE = APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled
  ? ORCHESTRATION_IA_COPY.timelinePageSubtitleWhenPrimary
  : ORCHESTRATION_UI_COPY.timelineHint;

const DEFAULT_TIMELINE_META: PlanShellPublication = {
  title: ORCHESTRATION_UI_COPY.timelineTitle,
  subtitle: DEFAULT_TIMELINE_SUBTITLE,
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
  const [timelineMeta, setTimelineMeta] = useState<PlanShellPublication | null>(null);

  const setPublication = useCallback((branch: PlanSurfaceBranch, value: PlanShellPublication | null) => {
    if (branch === 'roadmap') {
      setRoadmapMeta(value);
    } else {
      setTimelineMeta(value);
    }
  }, []);

  const registry = useMemo((): UnifiedRegistryApi => ({ activeView, setPublication }), [activeView, setPublication]);

  const display =
    activeView === 'timeline' ? timelineMeta ?? DEFAULT_TIMELINE_META : roadmapMeta ?? DEFAULT_ROADMAP_META;

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
  /** Omit on standalone roadmap/timeline routes. Pass active tab flags from canonical Plan page only. */
  tabActive?: boolean;
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
}) {
  const unified = useContext(PortalUnifiedShellRegistryContext);

  useLayoutEffect(() => {
    if (!unified) return undefined;
    if (!tabActive) {
      unified.setPublication(branch, null);
      return () => unified.setPublication(branch, null);
    }
    unified.setPublication(branch, { title, subtitle });
    return () => unified.setPublication(branch, null);
  }, [unified, branch, tabActive, title, subtitle]);

  if (!unified) {
    return (
      <AppShell title={title} subtitle={subtitle}>
        {children}
      </AppShell>
    );
  }

  return <>{children}</>;
}
