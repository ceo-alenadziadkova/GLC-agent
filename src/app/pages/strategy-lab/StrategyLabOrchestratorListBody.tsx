import { useEffect, useState } from 'react';

import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_LIMITS } from '../../config/orchestration-ui-limits';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { Button } from '../../components/ui/button';
import { PackGraphConsultantCanvas } from './PackGraphConsultantCanvas';
import { PortalTimelinePackGraphPanel } from '../../components/glc/PortalTimelinePackGraphPanel';
import { cn } from '../../components/ui/utils';
import {
  orchestrationNodeTitleMap,
  partitionCriticalPathNodeIds,
  prioritizeCrossLaneEdges,
} from '../../lib/orchestration-timeline-projection';
import {
  OrchestrationEvidenceTaxonomyBadgesInline,
  OrchestrationNodeBadgesInline,
} from '../../lib/orchestration-node-badges';

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
  const [risksExpanded, setRisksExpanded] = useState(false);
  useEffect(() => {
    if (tab !== 'risks') setRisksExpanded(false);
  }, [tab]);
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
                <OrchestrationEvidenceTaxonomyBadgesInline pack={pack} nodeId={nodeId} />
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
                <OrchestrationEvidenceTaxonomyBadgesInline pack={pack} nodeId={nodeId} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (tab === 'dependencies') {
    const allEdges = prioritizeCrossLaneEdges(pack);
    const edgeRows = allEdges.slice(0, ORCHESTRATION_UI_LIMITS.orchestratorDependenciesMaxEdges);
    const showPackGraph = pack.graph.nodes.length > 0;

    return (
      <div className="space-y-4">
        {showPackGraph ? (
          APP_FEATURE_FLAGS.packGraphConsultantCanvasEnabled ? (
            <PackGraphConsultantCanvas
              pack={pack}
              headingTitle={STRATEGY_LAB_COPY.packDependencyMap.sectionTitle}
              headingHint={STRATEGY_LAB_COPY.packDependencyMap.sectionHint}
              onConsultantSelectNode={onSelectNode}
            />
          ) : (
            <div className="space-y-2" role="status" aria-live="polite">
              <p className="text-muted-foreground text-xs leading-relaxed">{STRATEGY_LAB_COPY.packDependencyMap.graphCanvasFallbackNote}</p>
              <p className="text-muted-foreground text-[length:var(--text-2xs)] leading-relaxed">{STRATEGY_LAB_COPY.packDependencyMap.graphCanvasFallbackAriaDetail}</p>
              <PortalTimelinePackGraphPanel
                pack={pack}
                graphPresentation="default"
                headingTitle={STRATEGY_LAB_COPY.packDependencyMap.sectionTitle}
                headingHint={STRATEGY_LAB_COPY.packDependencyMap.sectionHint}
                onConsultantSelectNode={onSelectNode}
              />
            </div>
          )
        ) : null}
        {allEdges.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
            {STRATEGY_LAB_COPY.orchestratorTabs.emptyDependencies}
          </div>
        ) : (
          <div>
            <div className="text-foreground mb-2 text-xs font-semibold">
              {STRATEGY_LAB_COPY.orchestratorTabs.dependenciesListTitle}
            </div>
            <ul className="text-muted-foreground space-y-2 text-xs">
              {edgeRows.map((e, i) => {
                const fromTitle = titleById.get(e.from) ?? e.from;
                const toTitle = titleById.get(e.to) ?? e.to;
                return (
                  <li key={`${e.from}-${e.to}-${i}`}>
                    <button
                      type="button"
                      onClick={() => onSelectNode(e.to)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left transition-all',
                        selectedNodeId === e.to
                          ? 'border-primary/40 bg-primary/10 ring-2 ring-primary/10'
                          : 'border-border bg-card',
                      )}
                      aria-pressed={selectedNodeId === e.to}
                      aria-label={`${ORCHESTRATION_UI_COPY.timelinePackGraphListHighlightEdgeAria}: ${fromTitle} → ${toTitle}`}
                    >
                      <span className="inline-flex flex-wrap items-center gap-1">
                        <span className="text-foreground font-medium">{fromTitle}</span>
                        <OrchestrationEvidenceTaxonomyBadgesInline pack={pack} nodeId={e.from} />
                      </span>
                      <span className="text-[var(--text-tertiary)]"> → </span>
                      <span className="inline-flex flex-wrap items-center gap-1">
                        <span className="text-foreground font-medium">{toTitle}</span>
                        <OrchestrationEvidenceTaxonomyBadgesInline pack={pack} nodeId={e.to} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const allRisks = pack.conflicts_resolved;
  if (allRisks.length === 0) {
    return (
      <div className="text-muted-foreground py-10 text-center text-sm">{STRATEGY_LAB_COPY.orchestratorTabs.emptyRisks}</div>
    );
  }
  const max = ORCHESTRATION_UI_LIMITS.orchestratorRisksMaxItems;
  const isTruncated = allRisks.length > max && !risksExpanded;
  const risks = risksExpanded ? allRisks : allRisks.slice(0, max);
  const shownCount = risks.length;
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs leading-relaxed">{ORCHESTRATION_UI_COPY.conflictSynthesisNote}</p>
      {isTruncated ? (
        <p className="text-muted-foreground text-xs" role="status">
          {STRATEGY_LAB_COPY.orchestratorTabs.risksShownOfTotal
            .replace('{shown}', String(shownCount))
            .replace('{total}', String(allRisks.length))}
        </p>
      ) : null}
      <ul className="space-y-3">
        {risks.map(c => (
          <li key={c.id} className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <p className="text-foreground font-semibold">{c.summary}</p>
            <p className="text-muted-foreground mt-1">{c.resolution}</p>
          </li>
        ))}
      </ul>
      {allRisks.length > max ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          aria-expanded={risksExpanded}
          onClick={() => setRisksExpanded(e => !e)}
        >
          {risksExpanded ? STRATEGY_LAB_COPY.orchestratorTabs.risksShowFewer : STRATEGY_LAB_COPY.orchestratorTabs.risksShowAll}
        </Button>
      ) : null}
    </div>
  );
}
