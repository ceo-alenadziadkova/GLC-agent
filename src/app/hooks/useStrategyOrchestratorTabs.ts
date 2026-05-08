import { useMemo, useState } from 'react';

import type { StrategyLabOrchestratorTabId } from '../pages/strategy-lab/StrategyLabOrchestratorListBody';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import { useTablistKeyboardNavigation } from './useTablistKeyboardNavigation';

const ORCHESTRATOR_TAB_ORDER: readonly StrategyLabOrchestratorTabId[] = ['now', 'next', 'dependencies', 'risks'];

export function useStrategyOrchestratorTabs() {
  const [orchestratorTab, setOrchestratorTab] = useState<StrategyLabOrchestratorTabId>('now');
  const orchestratorPanelAnnouncement = useMemo(() => {
    const meta: Record<StrategyLabOrchestratorTabId, readonly [string, string]> = {
      now: [STRATEGY_LAB_COPY.orchestratorTabs.now, STRATEGY_LAB_COPY.orchestratorTabs.nowDesc],
      next: [STRATEGY_LAB_COPY.orchestratorTabs.next, STRATEGY_LAB_COPY.orchestratorTabs.nextDesc],
      dependencies: [
        STRATEGY_LAB_COPY.orchestratorTabs.dependencies,
        STRATEGY_LAB_COPY.orchestratorTabs.dependenciesDesc,
      ],
      risks: [STRATEGY_LAB_COPY.orchestratorTabs.risks, STRATEGY_LAB_COPY.orchestratorTabs.risksDesc],
    };
    const [title, desc] = meta[orchestratorTab];
    return STRATEGY_LAB_COPY.orchestratorTabs.tabPanelStatusTemplate
      .replace('{title}', title)
      .replace('{desc}', desc);
  }, [orchestratorTab]);

  const { setTabRef: setOrchestratorTabButtonRef, handleTablistKeyDown: onOrchestratorTablistKeyDown } =
    useTablistKeyboardNavigation<StrategyLabOrchestratorTabId>({
      order: ORCHESTRATOR_TAB_ORDER,
      activeKey: orchestratorTab,
      onChange: setOrchestratorTab,
    });

  return {
    orchestratorTab,
    setOrchestratorTab,
    orchestratorPanelAnnouncement,
    setOrchestratorTabButtonRef,
    onOrchestratorTablistKeyDown,
  };
}
