import { useCallback, useEffect, useState } from 'react';
import type { SetURLSearchParams } from 'react-router';

import type { PlanSummaryRailPresentation } from '../pages/strategy-lab/PlanSummaryRail';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';

type UseStrategyLabSummaryRailStateArgs = {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  isClient: boolean;
  packSummaryStackedLayout: boolean;
  isNarrowMobileLayout: boolean;
  rawPack: unknown;
};

type UseStrategyLabSummaryRailStateResult = {
  selectedPackNodeId: string | null;
  setSelectedPackNodeId: (nextId: string | null) => void;
  isSummarySheetOpen: boolean;
  setIsSummarySheetOpen: (open: boolean) => void;
  planSummaryPresentation: PlanSummaryRailPresentation;
};

export function useStrategyLabSummaryRailState(
  args: UseStrategyLabSummaryRailStateArgs,
): UseStrategyLabSummaryRailStateResult {
  const { searchParams, setSearchParams, isClient, packSummaryStackedLayout, isNarrowMobileLayout, rawPack } = args;

  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const selectedPackNodeId = searchParams.get('node');

  useEffect(() => {
    if (!packSummaryStackedLayout || isClient) return;
    if (!isGlcOrchestrationPackView(rawPack)) return;
    if (!selectedPackNodeId) return;
    setIsSummarySheetOpen(true);
  }, [isClient, packSummaryStackedLayout, rawPack, selectedPackNodeId]);

  const setSelectedPackNodeId = useCallback(
    (nextId: string | null) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (nextId) {
            next.set('node', nextId);
          } else {
            next.delete('node');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const consultantMobilePackSummarySheet = packSummaryStackedLayout && !isClient;
  const planSummaryPresentation: PlanSummaryRailPresentation = consultantMobilePackSummarySheet
    ? 'consultant-sheet'
    : isNarrowMobileLayout
      ? 'main-only'
      : 'split';

  return {
    selectedPackNodeId,
    setSelectedPackNodeId,
    isSummarySheetOpen,
    setIsSummarySheetOpen,
    planSummaryPresentation,
  };
}
