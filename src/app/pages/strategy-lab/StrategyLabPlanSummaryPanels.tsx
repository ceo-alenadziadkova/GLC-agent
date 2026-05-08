import type { ReactNode } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router';

import { SectionLabel } from '../../components/glc/SectionLabel';
import { Button } from '../../components/ui/button';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { OrchestrationNodeDetailCard } from './OrchestrationNodeDetailCard';

type PlanSummaryDetailBlockProps = {
  glcPackView: GlcOrchestrationPackView | null;
  selectedPackNodeId: string | null;
  onClearSelectedNode: () => void;
};

/** Right-rail / sheet body: selected graph node details or empty state. */
export function StrategyLabPlanSummaryDetailBlock({
  glcPackView,
  selectedPackNodeId,
  onClearSelectedNode,
}: PlanSummaryDetailBlockProps) {
  if (!glcPackView) return null;
  return (
    <>
      {selectedPackNodeId ? (
        <OrchestrationNodeDetailCard
          pack={glcPackView}
          nodeId={selectedPackNodeId}
          onClear={onClearSelectedNode}
        />
      ) : null}
      {!selectedPackNodeId ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs leading-relaxed max-w-prose">
          {STRATEGY_LAB_COPY.orchestratorTabs.pickNode}
        </p>
      ) : null}
    </>
  );
}

type PlanSummaryFooterProps = {
  reportHref: string;
};

export function StrategyLabPlanSummaryFooter({ reportHref }: PlanSummaryFooterProps) {
  return (
    <div className="space-y-2 border-t border-border p-4">
      <Button asChild variant="ghost" className="w-full justify-center py-2">
        <Link to={reportHref}>
          {STRATEGY_LAB_COPY.panel.viewReport}{' '}
          <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

type PlanSummaryDesktopChromeProps = {
  detail: ReactNode;
  footer: ReactNode;
};

/** Desktop split-pane chrome for the plan summary column. */
export function StrategyLabPlanSummaryDesktopChrome({ detail, footer }: PlanSummaryDesktopChromeProps) {
  return (
    <>
      <div className="flex-1 space-y-5 p-5">
        <div>
          <SectionLabel>{STRATEGY_LAB_COPY.panel.yourRoadmap}</SectionLabel>
          <p className="text-muted-foreground mt-1 max-w-prose text-xs">{STRATEGY_LAB_COPY.panel.summaryHint}</p>
        </div>
        {detail}
      </div>
      {footer}
    </>
  );
}
