import { useEffect } from 'react';

import { DOMAIN_KEYS } from '../data/auditTypes';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import { STRATEGY_LAB_PAGE_ANCHORS } from '../config/strategy-lab';
import type { StrategyLabPlanStudioScrollTarget } from '../pages/strategy-lab/StrategyLabPage';
import { resolvePlanFocusToPackGraphNodeId } from '../lib/plan-cross-nav';

type UseStrategyLabEmbeddedScrollArgs = {
  embedded: boolean;
  planStudioScrollTarget: StrategyLabPlanStudioScrollTarget | null;
  strategyPresent: boolean;
  focusToken: string | null;
  packView: GlcOrchestrationPackView | null;
  onSelectPackNode: (nodeId: string | null) => void;
};

/**
 * Handles embedded Strategy Lab anchor scrolling for mode (`define`/`shape`) and optional `?focus=...`.
 */
export function useStrategyLabEmbeddedScroll(args: UseStrategyLabEmbeddedScrollArgs) {
  const { embedded, planStudioScrollTarget, strategyPresent, focusToken, packView, onSelectPackNode } = args;

  useEffect(() => {
    if (!embedded || !planStudioScrollTarget || !strategyPresent) return;
    const anchorId =
      planStudioScrollTarget === 'define'
        ? STRATEGY_LAB_PAGE_ANCHORS.definePhase
        : planStudioScrollTarget === 'shape-pack'
          ? STRATEGY_LAB_PAGE_ANCHORS.shapePack
          : STRATEGY_LAB_PAGE_ANCHORS.planSetup;
    const el = typeof document !== 'undefined' ? document.getElementById(anchorId) : null;
    if (!el) return;
    const frame = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [embedded, planStudioScrollTarget, strategyPresent]);

  useEffect(() => {
    if (!embedded || !focusToken || !strategyPresent) return;
    const resolvedNodeId = resolvePlanFocusToPackGraphNodeId(focusToken, packView);
    const focusLooksLikeDomain = (DOMAIN_KEYS as readonly string[]).includes(focusToken);
    const targetAnchorId =
      planStudioScrollTarget === 'define'
        ? STRATEGY_LAB_PAGE_ANCHORS.definePhase
        : planStudioScrollTarget === 'shape-pack' || resolvedNodeId
          ? STRATEGY_LAB_PAGE_ANCHORS.shapePack
          : focusLooksLikeDomain
            ? STRATEGY_LAB_PAGE_ANCHORS.definePhase
            : null;
    if (!targetAnchorId) return;
    if (resolvedNodeId) onSelectPackNode(resolvedNodeId);
    const el = typeof document !== 'undefined' ? document.getElementById(targetAnchorId) : null;
    if (!el) return;
    const frame = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [embedded, focusToken, onSelectPackNode, packView, planStudioScrollTarget, strategyPresent]);
}
