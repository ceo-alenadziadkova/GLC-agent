import { X } from '@phosphor-icons/react';

import { Button } from '../../components/ui/button';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { DOMAIN_LABELS } from '../../data/auditTypes';
import type { DomainKey } from '../../data/auditTypes';
import { ORCHESTRATION_LANE_LABELS, ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationLaneId } from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { OrchestrationNodeBadgesInline } from '../../lib/orchestration-node-badges';

export function OrchestrationNodeDetailCard({
  pack,
  nodeId,
  onClear,
}: {
  pack: GlcOrchestrationPackView;
  nodeId: string;
  onClear: () => void;
}) {
  const node = pack.graph.nodes.find(n => n.id === nodeId);
  if (!node) {
    return (
      <div className="bg-background rounded-lg border p-3 text-xs text-[var(--text-secondary)]">
        {STRATEGY_LAB_COPY.orchestratorTabs.unknownNode}
        <Button type="button" variant="ghost" size="sm" className="mt-2 h-8" onClick={onClear}>
          {STRATEGY_LAB_COPY.orchestratorTabs.clearSelection}
        </Button>
      </div>
    );
  }

  const laneKey = node.lane as OrchestrationLaneId;
  const laneLabel = ORCHESTRATION_LANE_LABELS[laneKey] ?? node.lane;
  const domainKey = node.domain as DomainKey;
  const domainLabel = DOMAIN_LABELS[domainKey] ?? node.domain;

  return (
    <div className="bg-background rounded-lg border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold leading-snug">{node.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <OrchestrationNodeBadgesInline pack={pack} nodeId={nodeId} />
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClear} aria-label={STRATEGY_LAB_COPY.orchestratorTabs.clearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <dl className="space-y-2 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-[var(--text-tertiary)]">{STRATEGY_LAB_COPY.orchestratorTabs.laneLabel}</dt>
          <dd className="font-medium text-[var(--text-primary)]">{laneLabel}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-[var(--text-tertiary)]">{STRATEGY_LAB_COPY.orchestratorTabs.domainLabel}</dt>
          <dd className="font-medium text-[var(--text-primary)]">{domainLabel}</dd>
        </div>
        {node.analysis_depth ? (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-[var(--text-tertiary)]">{STRATEGY_LAB_COPY.orchestratorTabs.analysisDepth}</dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {node.analysis_depth === 'deep' ? ORCHESTRATION_UI_COPY.nodeBadgeDeep : ORCHESTRATION_UI_COPY.nodeBadgeBaseline}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
