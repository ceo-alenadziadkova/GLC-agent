import { useMemo, useRef, useState } from 'react';

import { trackIntakeWordingReviewExported } from '../../lib/intake-workspace-telemetry';
import { INTAKE_TRACE_EDGE_GRAPH_UI_COPY } from './intake-trace-edge-graph/config/graph-copy';
import { INTAKE_TRACE_GRAPH_CONFIG } from './intake-trace-edge-graph/config/graph-config';
import { buildGraphModel } from './intake-trace-edge-graph/domain/graph-model';
import { buildGraphLayout } from './intake-trace-edge-graph/domain/layout';
import { statusFor } from './intake-trace-edge-graph/domain/node-status';
import { collectAncestors } from './intake-trace-edge-graph/domain/graph-traversal';
import {
  buildSections,
  deriveVisibleEdges,
  deriveVisibleLayers,
  deriveVisibleNodeSet,
} from './intake-trace-edge-graph/domain/filters';
import {
  buildWordingReviewItems,
  computeAverageWordingScore,
  filterVisibleWordingItems,
} from './intake-trace-edge-graph/domain/wording-review';
import { useAutoScrollToFocus } from './intake-trace-edge-graph/hooks/useAutoScrollToFocus';
import { useCanvasPan } from './intake-trace-edge-graph/hooks/useCanvasPan';
import { useGraphPreferences } from './intake-trace-edge-graph/hooks/useGraphPreferences';
import { GraphAdvancedControls } from './intake-trace-edge-graph/panels/GraphAdvancedControls';
import { GraphCanvas } from './intake-trace-edge-graph/panels/GraphCanvas';
import { GraphInspectorPanel } from './intake-trace-edge-graph/panels/GraphInspectorPanel';
import { GraphToolbar } from './intake-trace-edge-graph/panels/GraphToolbar';
import { exportGraphSvg, exportWordingReviewMarkdown } from './intake-trace-edge-graph/services/graph-export';
import type { IntakeTraceEdgeGraphProps, SelectedReason } from './intake-trace-edge-graph/types';

export function IntakeTraceEdgeGraph({
  plan,
  resolveLabel,
  resolveCanonLabel,
  resolveDraftLabel,
  resolvePublishedLabel,
  focusId,
  onFocusIdChange,
  showWordingReview = false,
}: IntakeTraceEdgeGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { state: prefs, setState: setPrefs, reset: resetPreferences, clampDepth } = useGraphPreferences(showWordingReview);
  const [collapsedRoots, setCollapsedRoots] = useState<Set<string>>(() => new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pinnedFocusId, setPinnedFocusId] = useState<string | null>(null);
  const { onMouseDown, onMouseMove, onMouseUp } = useCanvasPan(containerRef);

  const ids = useMemo(() => {
    const set = new Set<string>([
      ...plan.eligible,
      ...plan.visible,
      ...plan.required,
      ...plan.hidden,
      ...plan.deferred,
    ]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [plan]);

  const { edges, layers, upstreamById, downstreamById } = useMemo(() => buildGraphModel(ids), [ids]);

  const pathSet = useMemo(
    () => (focusId ? collectAncestors(focusId, upstreamById) : new Set<string>(ids)),
    [focusId, upstreamById, ids],
  );

  const visibleNodeSet = useMemo(() => {
    return deriveVisibleNodeSet({
      ids,
      pathOnlyMode: prefs.pathOnlyMode,
      pathSet,
      collapsedRoots,
      pinnedFocusId,
      focusId,
      selectedIds,
      upstreamById,
      downstreamById,
      downstreamDepth: prefs.downstreamDepth,
      collapsedSections,
      searchQuery: prefs.searchQuery,
      resolveLabel,
    });
  }, [
    ids,
    prefs.pathOnlyMode,
    pathSet,
    collapsedRoots,
    focusId,
    upstreamById,
    downstreamById,
    prefs.downstreamDepth,
    collapsedSections,
    prefs.searchQuery,
    resolveLabel,
    selectedIds,
    pinnedFocusId,
  ]);

  const visibleEdges = useMemo(
    () => deriveVisibleEdges(edges, visibleNodeSet),
    [edges, visibleNodeSet],
  );

  const visibleLayers = useMemo(() => {
    return deriveVisibleLayers(layers, visibleNodeSet, ids);
  }, [layers, visibleNodeSet, ids]);

  const sections = useMemo(() => buildSections(ids), [ids]);

  const selectedReasons = useMemo(() => {
    const out: SelectedReason[] = [];
    const activeFocus = pinnedFocusId ?? focusId;
    const idsForPanel = selectedIds.size > 0 ? [...selectedIds] : activeFocus ? [activeFocus] : [];
    for (const id of idsForPanel) {
      const reasons = (plan.reasonsById?.[id] ?? []).map(r => ({
        layer: r.layer,
        state: r.state,
        code: r.code,
        detail: r.detail,
      }));
      out.push({
        id,
        status: statusFor(id, plan),
        reasons,
      });
    }
    return out;
  }, [selectedIds, pinnedFocusId, focusId, plan]);

  const baReviewItems = useMemo(() => {
    return buildWordingReviewItems({
      ids,
      resolveCanonLabel,
      resolveDraftLabel,
      resolvePublishedLabel,
      scoringMode: prefs.scoringMode,
    });
  }, [ids, resolveCanonLabel, resolveDraftLabel, resolvePublishedLabel, prefs.scoringMode]);

  const visibleBaItems = useMemo(
    () => filterVisibleWordingItems(baReviewItems, prefs.highOnly),
    [baReviewItems, prefs.highOnly],
  );

  const averageWordingScore = useMemo(() => computeAverageWordingScore(baReviewItems), [baReviewItems]);
  const layout = useMemo(() => buildGraphLayout(visibleLayers), [visibleLayers]);

  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    exportGraphSvg(svg, focusId);
  };

  const toggleCollapseFocused = () => {
    if (!focusId) return;
    setCollapsedRoots(prev => {
      const next = new Set(prev);
      if (next.has(focusId)) next.delete(focusId);
      else next.add(focusId);
      return next;
    });
  };

  const expandAll = () => setCollapsedRoots(new Set());
  const clearSelection = () => setSelectedIds(new Set());
  const pinOrUnpin = () => {
    if (!focusId) return;
    setPinnedFocusId(prev => (prev === focusId ? null : focusId));
  };

  const exportBaReviewMarkdown = () => {
    exportWordingReviewMarkdown({
      items: visibleBaItems,
      averageWordingScore,
      highOnly: prefs.highOnly,
      scoringMode: prefs.scoringMode,
      resolveLabel,
    });
    trackIntakeWordingReviewExported({
      route:
        typeof window !== 'undefined'
          ? window.location.pathname
          : INTAKE_TRACE_GRAPH_CONFIG.export.fallbackRoute,
    });
  };

  const toggleSection = (s: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  useAutoScrollToFocus(focusId, containerRef, layout);

  if (ids.length === 0) {
    return <p className="text-sm text-[var(--glc-muted)]">{INTAKE_TRACE_EDGE_GRAPH_UI_COPY.emptyGraph}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-[var(--glc-muted)]">{INTAKE_TRACE_EDGE_GRAPH_UI_COPY.intro}</div>
      <GraphToolbar
        pathOnlyMode={prefs.pathOnlyMode}
        onTogglePathOnlyMode={() => setPrefs(prev => ({ ...prev, pathOnlyMode: !prev.pathOnlyMode }))}
        isFocusedSubtreeCollapsed={collapsedRoots.has(focusId)}
        onToggleCollapseFocused={toggleCollapseFocused}
        canCollapseFocused={Boolean(focusId)}
        onExpandAll={expandAll}
        onExportSvg={exportSvg}
        onClearSelection={clearSelection}
        hasPinnedFocus={Boolean(pinnedFocusId)}
        isCurrentFocusPinned={pinnedFocusId === focusId}
        onTogglePin={pinOrUnpin}
        canPinFocused={Boolean(focusId)}
        showBeforeAfter={prefs.showBeforeAfter}
        onToggleShowBeforeAfter={() => setPrefs(prev => ({ ...prev, showBeforeAfter: !prev.showBeforeAfter }))}
      />
      <GraphAdvancedControls
        showWordingReview={showWordingReview}
        baReviewMode={prefs.baReviewMode}
        onToggleBaReviewMode={() => setPrefs(prev => ({ ...prev, baReviewMode: !prev.baReviewMode }))}
        onResetPreferences={resetPreferences}
        searchQuery={prefs.searchQuery}
        onSearchQueryChange={value => setPrefs(prev => ({ ...prev, searchQuery: value }))}
        downstreamDepth={prefs.downstreamDepth}
        onDownstreamDepthChange={value => setPrefs(prev => ({ ...prev, downstreamDepth: clampDepth(value) }))}
        sections={sections}
        collapsedSections={collapsedSections}
        onToggleSection={toggleSection}
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <GraphCanvas
          containerRef={containerRef}
          svgRef={svgRef}
          layout={layout}
          visibleEdges={visibleEdges}
          visibleNodeIds={[...visibleNodeSet]}
          plan={plan}
          focusId={focusId}
          pinnedFocusId={pinnedFocusId}
          selectedIds={selectedIds}
          showBeforeAfter={prefs.showBeforeAfter}
          resolveLabel={resolveLabel}
          resolveCanonLabel={resolveCanonLabel}
          resolveDraftLabel={resolveDraftLabel}
          resolvePublishedLabel={resolvePublishedLabel}
          onFocusIdChange={onFocusIdChange}
          onToggleSelected={id =>
            setSelectedIds(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        />
        <GraphInspectorPanel
          selectedReasons={selectedReasons}
          resolveLabel={resolveLabel}
          baReviewMode={prefs.baReviewMode}
          averageWordingScore={averageWordingScore}
          scoringMode={prefs.scoringMode}
          onScoringModeChange={mode => setPrefs(prev => ({ ...prev, scoringMode: mode }))}
          highOnly={prefs.highOnly}
          onToggleHighOnly={() => setPrefs(prev => ({ ...prev, highOnly: !prev.highOnly }))}
          onExportReviewMarkdown={exportBaReviewMarkdown}
          visibleBaItems={visibleBaItems}
          onFocusWordingItem={id => {
            onFocusIdChange(id);
            setSelectedIds(new Set([id]));
          }}
        />
      </div>
    </div>
  );
}
