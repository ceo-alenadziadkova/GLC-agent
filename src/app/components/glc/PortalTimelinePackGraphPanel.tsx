import { lazy, Suspense, useCallback, useId, useMemo, useState } from 'react';
import { Copy } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_UI_LIMITS } from '../../config/orchestration-ui-limits';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { buildOrchestrationPackDotExport } from '../../lib/build-orchestration-pack-dot-export';
import { buildOrchestrationPackFlowGraph } from '../../lib/build-orchestration-pack-flow-graph';
import type { PortalPackGraphSelection } from './PortalPackGraphFlowCanvas';
import { EvidenceDrilldownPanel } from './EvidenceDrilldownPanel';

const PortalPackGraphFlowCanvasLazy = lazy(() =>
  import('./PortalPackGraphFlowCanvas').then((m) => ({ default: m.PortalPackGraphFlowCanvas })),
);
import {
  OrchestrationEvidenceTaxonomyBadges,
  type OrchestrationEvidenceTaxonomy,
} from '../../lib/orchestration-node-badges';
import { orchestrationNodeTitleMap, prioritizeCrossLaneEdges } from '../../lib/orchestration-timeline-projection';

export function PortalTimelinePackGraphPanel({
  pack,
  headingTitle,
  headingHint,
  onConsultantSelectNode,
  graphPresentation = 'default',
}: {
  pack: GlcOrchestrationPackView;
  /** Overrides portal section title (e.g. Strategy Lab). */
  headingTitle?: string;
  headingHint?: string;
  /** Strategy Lab: keep graph highlight and `?node=` / detail card in sync. */
  onConsultantSelectNode?: (id: string | null) => void;
  /** `consultant_full` starts expanded and uses expanded node/edge budgets (Strategy Lab V5). */
  graphPresentation?: 'default' | 'consultant_full';
}) {
  const headingDomId = useId();
  const consultantFull = graphPresentation === 'consultant_full';
  const [mapExpanded, setMapExpanded] = useState(consultantFull);
  const [selection, setSelectionState] = useState<PortalPackGraphSelection | null>(null);

  const setSelection = useCallback(
    (next: PortalPackGraphSelection | null) => {
      setSelectionState(next);
      if (!onConsultantSelectNode) {
        return;
      }
      if (!next) {
        onConsultantSelectNode(null);
        return;
      }
      if (next.kind === 'node') {
        onConsultantSelectNode(next.id);
      } else {
        onConsultantSelectNode(next.to);
      }
    },
    [onConsultantSelectNode],
  );

  const titleById = useMemo(() => orchestrationNodeTitleMap(pack), [pack]);
  const evidenceTaxonomyByNodeId = useMemo(() => {
    const m = new Map<string, OrchestrationEvidenceTaxonomy>();
    for (const n of pack.graph.nodes) {
      if (n.evidence_taxonomy) m.set(n.id, n.evidence_taxonomy);
    }
    return m;
  }, [pack]);
  const allPrioritized = useMemo(() => prioritizeCrossLaneEdges(pack), [pack]);
  const edgeRows = useMemo(
    () => allPrioritized.slice(0, ORCHESTRATION_UI_LIMITS.portalTimelinePackGraphMaxEdgesDisplayed),
    [allPrioritized],
  );
  const edgesTruncated = allPrioritized.length > edgeRows.length;

  const dot = useMemo(
    () =>
      buildOrchestrationPackDotExport(pack, {
        maxEdges: ORCHESTRATION_UI_LIMITS.portalTimelinePackGraphExportMaxEdges,
      }),
    [pack],
  );

  const flowModel = useMemo(
    () =>
      buildOrchestrationPackFlowGraph(pack, {
        maxFlowEdges: consultantFull || mapExpanded
          ? ORCHESTRATION_UI_LIMITS.portalTimelinePackGraphFlowExpandedMaxEdges
          : ORCHESTRATION_UI_LIMITS.portalTimelinePackGraphFlowMaxEdges,
        maxFlowNodes: consultantFull || mapExpanded
          ? ORCHESTRATION_UI_LIMITS.portalTimelinePackGraphFlowExpandedMaxNodes
          : ORCHESTRATION_UI_LIMITS.portalTimelinePackGraphFlowMaxNodes,
      }),
    [pack, mapExpanded, consultantFull],
  );

  const flowLayoutKey = useMemo(
    () =>
      `${pack.manifest_snapshot_id}-${pack.version}-${pack.graph.edges.length}-${pack.critical_path.join('|')}-${consultantFull ? 'cf' : mapExpanded ? 'ex' : 'cmp'}`,
    [pack.manifest_snapshot_id, pack.version, pack.graph.edges.length, pack.critical_path, mapExpanded, consultantFull],
  );

  const listHighlightsNode = useCallback(
    (nodeId: string) =>
      selection?.kind === 'node'
        ? selection.id === nodeId
        : selection?.kind === 'edge'
          ? selection.from === nodeId || selection.to === nodeId
          : false,
    [selection],
  );

  const canvasMinHeightPx = consultantFull || mapExpanded
    ? ORCHESTRATION_UI_LIMITS.portalTimelinePackGraphCanvasExpandedMinHeightPx
    : ORCHESTRATION_UI_LIMITS.portalTimelinePackGraphCanvasMinHeightPx;

  const handleCopyDot = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(dot);
      toast.success(ORCHESTRATION_UI_COPY.timelinePackGraphCopyDotSuccess);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.timelinePackGraphCopyDotFailed);
    }
  }, [dot]);

  const sectionTitle = headingTitle ?? ORCHESTRATION_UI_COPY.timelinePackGraphSectionTitle;
  const sectionHint = headingHint ?? ORCHESTRATION_UI_COPY.timelinePackGraphSectionHint;

  return (
    <div
      role="region"
      aria-labelledby={headingDomId}
      className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4"
    >
      <h3 id={headingDomId} className="text-sm font-semibold ds-text-primary">
        {sectionTitle}
      </h3>
      <p className="mt-2 text-sm leading-relaxed ds-text-tertiary">
        {sectionHint}
      </p>
      {edgesTruncated ? (
        <p className="mt-2 text-[length:var(--text-2xs)] ds-text-tertiary">
          {ORCHESTRATION_UI_COPY.timelinePackGraphEdgesTruncated}
        </p>
      ) : null}

      {flowModel.nodes.length > 0 && !consultantFull ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={mapExpanded ? 'secondary' : 'outline'}
              size="sm"
              aria-pressed={mapExpanded}
              onClick={() => {
                setMapExpanded(v => !v);
                setSelection(null);
              }}
            >
              {mapExpanded
                ? ORCHESTRATION_UI_COPY.timelinePackGraphCollapseMap
                : ORCHESTRATION_UI_COPY.timelinePackGraphExpandMap}
            </Button>
            {selection ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelection(null)}>
                {ORCHESTRATION_UI_COPY.timelinePackGraphClearHighlight}
              </Button>
            ) : null}
          </div>
          {mapExpanded ? (
            <p className="text-[length:var(--text-2xs)] leading-relaxed ds-text-tertiary">
              {ORCHESTRATION_UI_COPY.timelinePackGraphExpandMapHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <Suspense
        fallback={
          <div className="text-muted-foreground mt-4 rounded-md border border-dashed px-3 py-6 text-center text-sm">
            {ORCHESTRATION_UI_COPY.timelinePackGraphCanvasLoading}
          </div>
        }
      >
        <PortalPackGraphFlowCanvasLazy
          flowLayoutKey={flowLayoutKey}
          nodes={flowModel.nodes}
          edges={flowModel.edges}
          flowEdgesTruncated={flowModel.flowEdgesTruncated}
          nodesDroppedFromBudget={flowModel.nodesDroppedFromBudget}
          selection={selection}
          onSelectionChange={setSelection}
          canvasMinHeightPx={canvasMinHeightPx}
        />
      </Suspense>
      {APP_FEATURE_FLAGS.evidenceDrilldownEnabled && selection?.kind === 'node' ? (
        <EvidenceDrilldownPanel pack={pack} nodeId={selection.id} />
      ) : null}

      <div className="mt-4">
        <div className="mb-1 text-[length:var(--text-xs)] font-medium ds-text-secondary">
          {ORCHESTRATION_UI_COPY.timelinePackGraphCriticalPathTitle}
        </div>
        {pack.critical_path.length === 0 ? (
          <p className="text-[length:var(--text-xs)] ds-text-secondary">{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</p>
        ) : (
          <ol className="list-inside list-decimal space-y-1 text-[length:var(--text-xs)] ds-text-primary">
            {pack.critical_path.map(id => (
              <li key={id}>
                <button
                  type="button"
                  className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded px-1 py-0.5 text-left transition-colors ds-portal-pack-graph-list-hit-target ${listHighlightsNode(id) ? 'ds-portal-pack-graph-list-hl' : ''}`}
                  onClick={() =>
                    setSelection(
                      selection?.kind === 'node' && selection.id === id ? null : { kind: 'node', id },
                    )
                  }
                  aria-pressed={selection?.kind === 'node' && selection.id === id}
                  aria-label={`${ORCHESTRATION_UI_COPY.timelinePackGraphListHighlightCpAria}: ${titleById.get(id) ?? id}`}
                >
                  <span>{titleById.get(id) ?? id}</span>
                  <OrchestrationEvidenceTaxonomyBadges taxonomy={evidenceTaxonomyByNodeId.get(id)} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[length:var(--text-xs)] font-medium ds-text-secondary">
          {ORCHESTRATION_UI_COPY.timelinePackGraphEdgesTitle}
        </div>
        <ul className="list-inside list-disc space-y-1 text-[length:var(--text-xs)] ds-text-secondary">
          {edgeRows.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineNoDeps}</li>}
          {edgeRows.map((e, i) => {
            const fromTitle = titleById.get(e.from) ?? e.from;
            const toTitle = titleById.get(e.to) ?? e.to;
            const edgeSelected =
              selection?.kind === 'edge' && selection.from === e.from && selection.to === e.to;
            const rowHl =
              edgeSelected || listHighlightsNode(e.from) || listHighlightsNode(e.to)
                ? 'ds-portal-pack-graph-list-hl'
                : '';
            return (
              <li key={`${e.from}-${e.to}-${i}`}>
                <button
                  type="button"
                  className={`inline-flex w-full max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded px-1 py-0.5 text-left transition-colors ds-portal-pack-graph-list-hit-target ${rowHl}`}
                  onClick={() =>
                    setSelection(
                      selection?.kind === 'edge' && selection.from === e.from && selection.to === e.to
                        ? null
                        : { kind: 'edge', from: e.from, to: e.to },
                    )
                  }
                  aria-pressed={Boolean(edgeSelected)}
                  aria-label={`${ORCHESTRATION_UI_COPY.timelinePackGraphListHighlightEdgeAria}: ${fromTitle} → ${toTitle}`}
                >
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <span className="ds-text-primary">{fromTitle}</span>
                    <OrchestrationEvidenceTaxonomyBadges taxonomy={evidenceTaxonomyByNodeId.get(e.from)} />
                  </span>
                  <span className="ds-text-tertiary">→</span>
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <span className="ds-text-primary">{toTitle}</span>
                    <OrchestrationEvidenceTaxonomyBadges taxonomy={evidenceTaxonomyByNodeId.get(e.to)} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void handleCopyDot()}>
          <Copy className="h-4 w-4" aria-hidden />
          {ORCHESTRATION_UI_COPY.timelinePackGraphCopyDot}
        </Button>
      </div>
    </div>
  );
}
