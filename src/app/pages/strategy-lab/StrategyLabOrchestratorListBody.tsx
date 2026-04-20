import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_LIMITS } from '../../config/orchestration-ui-limits';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { cn } from '../../components/ui/utils';
import {
  orchestrationNodeTitleMap,
  partitionCriticalPathNodeIds,
  prioritizeCrossLaneEdges,
} from '../../lib/orchestration-timeline-projection';
import { OrchestrationNodeBadgesInline } from '../../lib/orchestration-node-badges';

export type StrategyLabOrchestratorTabId = 'now' | 'next' | 'dependencies' | 'risks';

export function StrategyLabOrchestratorListBody({
  pack,
  tab,
  selectedNodeId,
  onSelectNode,
}: {
  pack: GlcOrchestrationPackView;
  tab: StrategyLabOrchestratorTabId;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const titleById = orchestrationNodeTitleMap(pack);
  const { near, mid, far } = partitionCriticalPathNodeIds(pack);

  if (tab === 'now') {
    if (near.length === 0) {
      return (
        <div className="text-muted-foreground py-10 text-center text-sm">{STRATEGY_LAB_COPY.orchestratorTabs.emptyNow}</div>
      );
    }
    return (
      <ul className="space-y-2">
        {near.map(nodeId => (
          <li key={nodeId}>
            <button
              type="button"
              onClick={() => onSelectNode(nodeId)}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left text-sm transition-all',
                selectedNodeId === nodeId ? 'border-primary/40 bg-primary/10 ring-2 ring-primary/10' : 'border-border bg-card shadow-xs',
              )}
            >
              <span className="text-foreground font-medium">{titleById.get(nodeId) ?? nodeId}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1">
                <OrchestrationNodeBadgesInline pack={pack} nodeId={nodeId} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (tab === 'next') {
    const ids = [...mid, ...far];
    if (ids.length === 0) {
      return (
        <div className="text-muted-foreground py-10 text-center text-sm">{STRATEGY_LAB_COPY.orchestratorTabs.emptyNext}</div>
      );
    }
    return (
      <ul className="space-y-2">
        {ids.map(nodeId => (
          <li key={nodeId}>
            <button
              type="button"
              onClick={() => onSelectNode(nodeId)}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left text-sm transition-all',
                selectedNodeId === nodeId ? 'border-primary/40 bg-primary/10 ring-2 ring-primary/10' : 'border-border bg-card shadow-xs',
              )}
            >
              <span className="text-foreground font-medium">{titleById.get(nodeId) ?? nodeId}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1">
                <OrchestrationNodeBadgesInline pack={pack} nodeId={nodeId} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (tab === 'dependencies') {
    const edges = prioritizeCrossLaneEdges(pack).slice(0, ORCHESTRATION_UI_LIMITS.orchestratorDependenciesMaxEdges);
    if (edges.length === 0) {
      return (
        <div className="text-muted-foreground py-10 text-center text-sm">
          {STRATEGY_LAB_COPY.orchestratorTabs.emptyDependencies}
        </div>
      );
    }
    return (
      <ul className="text-muted-foreground space-y-2 text-xs">
        {edges.map((e, i) => (
          <li key={`${e.from}-${e.to}-${i}`} className="rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-foreground font-medium">{titleById.get(e.from) ?? e.from}</span>
            <span className="text-[var(--text-tertiary)]"> → </span>
            <span className="text-foreground font-medium">{titleById.get(e.to) ?? e.to}</span>
          </li>
        ))}
      </ul>
    );
  }

  const risks = pack.conflicts_resolved.slice(0, ORCHESTRATION_UI_LIMITS.orchestratorRisksMaxItems);
  if (risks.length === 0) {
    return (
      <div className="text-muted-foreground py-10 text-center text-sm">{STRATEGY_LAB_COPY.orchestratorTabs.emptyRisks}</div>
    );
  }
  return (
    <ul className="space-y-3">
      {risks.map(c => (
        <li key={c.id} className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <p className="text-foreground font-semibold">{c.summary}</p>
          <p className="text-muted-foreground mt-1">{c.resolution}</p>
        </li>
      ))}
    </ul>
  );
}
