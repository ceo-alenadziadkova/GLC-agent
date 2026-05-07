import { useMemo } from 'react';

import { ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS } from '../config/orchestration-plan-governance';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { ORCHESTRATION_UI_LIMITS } from '../config/orchestration-ui-limits';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import type { OrchestrationCommercialOfferResponseDto, OrchestrationPlanGovernanceDto } from '../data/api/audits-orchestration';
import type { StrategyRoadmap } from '../data/audit/contracts/report/report-domain.types';

type UseOrchestrationAdvancedSectionStateOptions = {
  pack: GlcOrchestrationPackView | null;
  planGovernance: OrchestrationPlanGovernanceDto | null;
  revisionHistoryCount: number;
  selectedRevisionDiffPresent: boolean;
  roadmapVersionToShow: number;
  analysisDepthFilter: 'all' | 'baseline' | 'deep';
  manifestSnapshotsCount: number;
  commercialOffer: OrchestrationCommercialOfferResponseDto | null;
  strategy: StrategyRoadmap;
};

export function useOrchestrationAdvancedSectionState({
  pack,
  planGovernance,
  revisionHistoryCount,
  selectedRevisionDiffPresent,
  roadmapVersionToShow,
  analysisDepthFilter,
  manifestSnapshotsCount,
  commercialOffer,
  strategy,
}: UseOrchestrationAdvancedSectionStateOptions) {
  const synthesisConflicts = useMemo(() => {
    if (!pack?.conflicts_resolved?.length) return [];
    return pack.conflicts_resolved.filter(
      row => row.resolution === 'synthesis_applied' || row.resolution === 'synthesis_pending',
    );
  }, [pack]);

  const governanceHints = useMemo(() => {
    if (!planGovernance) return [];
    return planGovernance.reason_codes
      .map(code => ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS[code])
      .filter((hint): hint is string => Boolean(hint));
  }, [planGovernance]);

  const depthFilteredNodes = useMemo(() => {
    if (!pack?.graph?.nodes?.length) return [];
    return pack.graph.nodes
      .filter(n => {
        if (analysisDepthFilter === 'all') return true;
        const d = n.analysis_depth ?? 'baseline';
        return d === analysisDepthFilter;
      })
      .slice(0, ORCHESTRATION_UI_LIMITS.orchestratorRisksMaxItems);
  }, [pack, analysisDepthFilter]);

  const hasPlanDiagnostics = Boolean(planGovernance) || revisionHistoryCount > 0 || pack !== null;
  const showRevisionHistorySubsection =
    (APP_FEATURE_FLAGS.revisionHistoryPanelEnabled && revisionHistoryCount > 0) ||
    (selectedRevisionDiffPresent && roadmapVersionToShow > 1);

  const savedStage2Count = strategy.strategy_lab_context?.director_stage2_domains?.length ?? 0;
  const advancedPreviewStage2 =
    savedStage2Count > 0
      ? STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewStage2Count.replace('{count}', String(savedStage2Count))
      : STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewStage2None;
  const advancedPreviewSnapshots =
    manifestSnapshotsCount > 0
      ? STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewSnapshotsCount.replace('{count}', String(manifestSnapshotsCount))
      : STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewSnapshotsEmpty;
  const advancedPreviewOffers =
    (commercialOffer?.offers.length ?? 0) > 0
      ? STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewOffersReady
      : STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewOffersIdle;
  const advancedPreviewTokens = [
    APP_FEATURE_FLAGS.strategyLabDirectorStage2IntentEnabled ? advancedPreviewStage2 : null,
    advancedPreviewSnapshots,
    advancedPreviewOffers,
  ].filter((token): token is string => token !== null);

  return {
    synthesisConflicts,
    governanceHints,
    depthFilteredNodes,
    hasPlanDiagnostics,
    showRevisionHistorySubsection,
    advancedPreviewLine: advancedPreviewTokens.join(' · '),
  };
}
