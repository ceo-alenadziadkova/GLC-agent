import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { type Node } from '@xyflow/react';
import type { IntakeSurface } from '@glc/intake-core';
import {
  getIntakeIntelligenceCoverageSummary,
  getIntakeIntelligenceSprint2CoverageSummary,
  QUESTION_BANK_V1_STUBS,
} from '@glc/intake-core';

import type { IntakeBriefCollectionMode, ProductMode } from '../../../data/auditTypes';
import { useGlcTheme } from '../../../hooks/useGlcTheme';
import { apiFetch } from '../../../data/api-http';
import { QUESTION_BANK_STUDIO_COPY_EN } from '../../../config/question-bank-studio-copy.en';
import {
  LEGEND_FONT_SIZE_PX,
  LEGEND_LINE_HEIGHT,
  LEGEND_TEXT_COLOR_VAR,
} from '../../../config/question-bank-studio-ui';
import { QUESTION_BANK_STUDIO_DEBOUNCE_MS } from '../../../config/question-bank-studio-defaults';
import {
  buildQuestionBankStudioGraph,
  type StudioAnyNodeData,
  type StudioLayoutSurfaceKey,
} from '../../../lib/question-bank-studio-graph';
import {
  computeStudioPolicyModeStats,
  type StudioPolicyMode,
} from '../../../lib/question-bank-studio-policy';
import { collectBranchFocusQuestionIds } from '../../intake/intake-trace-branch-links';
import { idsInIntakePlan, planTraceRoles, shortUserLabel } from '../selectors/trace';
import { computeCenterOnNodeId, computeNodeHiddenById, computeUserStepLanes } from '../selectors/visibility';
import { useDebouncedString } from '../hooks/useDebouncedString';
import { useQuestionBankStudioDiff } from '../hooks/useQuestionBankStudioDiff';
import { useQuestionBankStudioExport } from '../hooks/useQuestionBankStudioExport';
import { useQuestionBankStudioTrace } from '../hooks/useQuestionBankStudioTrace';
import { InspectorPanel } from '../panels/InspectorPanel';
import { ContextInputsPanel } from '../panels/ContextInputsPanel';
import { InspectorBodyRenderer } from '../panels/InspectorBodyRenderer';
import type { ViewMode } from '../types';
import { buildTraceStatusMap, getTraceStatusForId } from '../domain/trace-status';
import {
  buildBreadcrumbQuestionIds,
  buildSelectedQuestionDependencies,
  buildSelectedQuestionWhy,
  buildUserStepSimulation,
} from '../domain/simulation';
import { decorateStudioNode } from '../domain/node-decorators';
import { StudioUserFlowSection } from '../sections/StudioUserFlowSection';
import { StudioCanvasSection } from '../sections/StudioCanvasSection';
import { StudioHeaderSection } from '../sections/StudioHeaderSection';
import { StudioLegendSection } from '../sections/StudioLegendSection';
import { StudioDiffSection } from '../sections/StudioDiffSection';
import { StudioToolbarSection } from '../sections/StudioToolbarSection';
import { StudioModeSummarySection } from '../sections/StudioModeSummarySection';
import { StudioLogicMetaSection } from '../sections/StudioLogicMetaSection';
import {
  STUDIO_CARD_MIN_HEIGHT_PX,
  STUDIO_LEGEND_MARKER_SIZE_PX,
} from '../config/studio-layout.config';
import {
  STUDIO_LEGEND_DOMAIN_BORDER_COLOR,
  STUDIO_LEGEND_LAYOUT_BORDER_COLOR,
} from '../config/studio-legend.config';

export function QuestionBankStudioContainer() {
  const { isDark } = useGlcTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('user');
  const [graphOrientation, setGraphOrientation] = useState<'TB' | 'LR'>('TB');
  const [policyMode, setPolicyMode] = useState<StudioPolicyMode>('full');
  const [showBranchEdges, setShowBranchEdges] = useState(false);
  const [dimOutsidePolicy, setDimOutsidePolicy] = useState(true);
  const [policySliceOnly, setPolicySliceOnly] = useState(false);
  const [viewDensity, setViewDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [overviewUi, setOverviewUi] = useState(false);
  const [branchFocusFromSelection, setBranchFocusFromSelection] = useState(false);
  const [colorByDomain, setColorByDomain] = useState(false);
  const [clusterByPrimaryDomain, setClusterByPrimaryDomain] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedString(search.trim(), QUESTION_BANK_STUDIO_DEBOUNCE_MS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [activeUserStep, setActiveUserStep] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [planFootprintOnly, setPlanFootprintOnly] = useState(false);
  const [layoutSurface, setLayoutSurface] = useState<'' | StudioLayoutSurfaceKey>('');
  const [customResponsesText, setCustomResponsesText] = useState('{\n}\n');
  const [customProductMode, setCustomProductMode] = useState<ProductMode>('full');
  const [customCollectionMode, setCustomCollectionMode] = useState<IntakeBriefCollectionMode | ''>('');
  const [customSurface, setCustomSurface] = useState<IntakeSurface | ''>('');
  const debouncedCustomJson = useDebouncedString(customResponsesText, QUESTION_BANK_STUDIO_DEBOUNCE_MS);
  const { tracePlan, traceError } = useQuestionBankStudioTrace({
    debouncedCustomJson,
    customProductMode,
    customCollectionMode,
    customSurface,
  });
  const [bankDiffJson, setBankDiffJson] = useState('{\n  "version": "0.0.0",\n  "questions": []\n}\n');
  const [kpiDashboard, setKpiDashboard] = useState<{
    sessions: number;
    questionShown: number;
    dropOff: number;
    dropOffRate: number;
    medianQuestionsToReadiness: number;
    confidenceMovedRate: number | null;
    sessionFunnel: {
      started: number;
      withQuestionShown: number;
      droppedOff: number;
      reachedAuditReady: number;
    };
    topDropOffHotspots: Array<{
      questionId: string;
      shownCount: number;
      dropOffCount: number;
      dropOffRate: number;
    }>;
  } | null>(null);
  const { bankDiffSummary, bankDiffError, runBankDiff } = useQuestionBankStudioDiff(bankDiffJson);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await apiFetch<{ ok: true; dashboard: NonNullable<typeof kpiDashboard> }>(
          '/api/intake/intelligence-kpi/dashboard',
        );
        if (!cancelled) setKpiDashboard(result.dashboard);
      } catch {
        if (!cancelled) setKpiDashboard(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tracePlan) setPlanFootprintOnly(false);
  }, [tracePlan]);
  useEffect(() => {
    setPolicyMode(customProductMode);
  }, [customProductMode]);

  const effectiveOrientation: 'TB' | 'LR' = viewMode === 'user' ? 'TB' : graphOrientation;
  const effectiveLayoutSurface: '' | StudioLayoutSurfaceKey =
    viewMode === 'user' ? (layoutSurface || 'consultant_interview') : layoutSurface;
  const effectiveShowBranchEdges = viewMode === 'user' ? true : showBranchEdges;

  const layoutGraph = useMemo(
    () =>
      buildQuestionBankStudioGraph({
        policyMode,
        showBranchEdges: effectiveShowBranchEdges,
        orientation: effectiveOrientation,
        collapsedSectionKeys: collapsedSections,
        colorByDomain,
        layoutSurface: effectiveLayoutSurface || null,
        clusterByPrimaryDomain,
        viewDensity,
      }),
    [
      policyMode,
      effectiveShowBranchEdges,
      effectiveOrientation,
      collapsedSections,
      colorByDomain,
      effectiveLayoutSurface,
      clusterByPrimaryDomain,
      viewDensity,
    ],
  );

  const { exportBusy, downloadSvgExport, downloadPngExport } = useQuestionBankStudioExport({
    layoutNodes: layoutGraph.nodes,
    layoutEdges: layoutGraph.edges,
    isDark,
    effectiveShowBranchEdges,
  });

  const policyBannerStats = useMemo(() => computeStudioPolicyModeStats(policyMode), [policyMode]);
  const intelligenceMetrics = useMemo(() => {
    const cov = getIntakeIntelligenceCoverageSummary();
    const s2 = getIntakeIntelligenceSprint2CoverageSummary();
    return {
      fullyCoveredQuestions: cov.fullyCoveredQuestions,
      totalQuestions: cov.totalQuestions,
      sprint2Complete: s2.sprint2CompleteQuestions,
      sprint2GateTotal: s2.gateQuestionCount,
    };
  }, []);
  const branchFocusQuestionIds = useMemo(() => {
    if (!branchFocusFromSelection || !selectedId) return null;
    const n = layoutGraph.nodes.find(x => x.id === selectedId);
    if (!n || n.type !== 'studioQuestion' || n.data.kind !== 'question') return null;
    return collectBranchFocusQuestionIds(n.data.questionId, QUESTION_BANK_V1_STUBS);
  }, [branchFocusFromSelection, selectedId, layoutGraph.nodes]);
  const traceRoles = useMemo(() => (tracePlan ? planTraceRoles(tracePlan) : null), [tracePlan]);
  const planIdSet = useMemo(() => (tracePlan ? idsInIntakePlan(tracePlan) : null), [tracePlan]);
  const userStepLanes = useMemo(
    () => computeUserStepLanes(layoutGraph.nodes, layoutGraph.edges),
    [layoutGraph.nodes, layoutGraph.edges],
  );
  const nodeHiddenById = useMemo(
    () =>
      computeNodeHiddenById({
        nodes: layoutGraph.nodes,
        edges: layoutGraph.edges,
        viewMode,
        activeUserStep,
        userStepLanes,
        planFootprintOnly,
        planIdSet,
        policySliceOnly,
        branchFocusQuestionIds,
      }),
    [
      layoutGraph.nodes,
      layoutGraph.edges,
      planFootprintOnly,
      planIdSet,
      policySliceOnly,
      branchFocusQuestionIds,
      viewMode,
      activeUserStep,
      userStepLanes,
    ],
  );

  const searchLower = search.trim().toLowerCase();
  const centerOnNodeId = useMemo(
    () => computeCenterOnNodeId(layoutGraph.nodes, debouncedSearch),
    [layoutGraph.nodes, debouncedSearch],
  );
  const toggleSectionCollapse = useCallback((sectionKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }, []);

  const nodes = useMemo(
    () =>
      layoutGraph.nodes.map(n => {
        const traceRole =
          traceRoles && n.type === 'studioQuestion' && n.data.kind === 'question'
            ? traceRoles.get(n.data.questionId)
            : undefined;
        return decorateStudioNode({
          node: n,
          searchLower,
          selectedId,
          dimOutsidePolicy,
          hidden: nodeHiddenById.get(n.id) ?? false,
          traceRole,
        }) as Node<StudioAnyNodeData>;
      }),
    [layoutGraph.nodes, traceRoles, searchLower, selectedId, dimOutsidePolicy, nodeHiddenById],
  );

  const selectedNode = useMemo(
    () => layoutGraph.nodes.find(n => n.id === selectedId),
    [layoutGraph.nodes, selectedId],
  );
  const selectedQuestionId = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'studioQuestion' || selectedNode.data.kind !== 'question') return null;
    return selectedNode.data.questionId;
  }, [selectedNode]);
  const selectedQuestionRole = useMemo(() => {
    if (!selectedQuestionId || !tracePlan) return null;
    if (tracePlan.required.includes(selectedQuestionId)) return 'required';
    if (tracePlan.visible.includes(selectedQuestionId)) return 'visible';
    if (tracePlan.deferred.includes(selectedQuestionId)) return 'deferred';
    if (tracePlan.hidden.includes(selectedQuestionId)) return 'hidden';
    return 'other';
  }, [selectedQuestionId, tracePlan]);

  const simulation = useMemo(() => buildUserStepSimulation(selectedQuestionId, tracePlan), [selectedQuestionId, tracePlan]);
  const selectedWhy = useMemo(() => buildSelectedQuestionWhy(selectedQuestionId, tracePlan), [selectedQuestionId, tracePlan]);
  const breadcrumbs = useMemo(() => buildBreadcrumbQuestionIds(selectedQuestionId), [selectedQuestionId]);
  const selectedDependencies = useMemo(() => buildSelectedQuestionDependencies(selectedQuestionId), [selectedQuestionId]);
  const allQuestionsForReview = useMemo(() => {
    const statusById = buildTraceStatusMap(tracePlan);
    const ids = QUESTION_BANK_V1_STUBS.map(q => q.id).sort((a, b) => a.localeCompare(b));
    return ids.map(id => ({ id, label: shortUserLabel(id), status: getTraceStatusForId(statusById, id) }));
  }, [tracePlan]);
  const questionNodeIdByQuestionId = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nodes) {
      if (n.type === 'studioQuestion' && n.data.kind === 'question') m.set(n.data.questionId, n.id);
    }
    return m;
  }, [nodes]);
  const traceStatusByQuestionId = useMemo(() => buildTraceStatusMap(tracePlan), [tracePlan]);
  const inspectorBody = useMemo(
    () => InspectorBodyRenderer({ selectedNode, tracePlan, emptyStateText: QUESTION_BANK_STUDIO_COPY_EN.inspector.selectNodeOnCanvas }),
    [selectedNode, tracePlan],
  );

  const { stats, sectionKeys } = layoutGraph;
  const legendStyle: CSSProperties = {
    fontSize: LEGEND_FONT_SIZE_PX,
    color: LEGEND_TEXT_COLOR_VAR,
    lineHeight: LEGEND_LINE_HEIGHT,
  };

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: STUDIO_CARD_MIN_HEIGHT_PX }}>
      <div className="flex flex-col gap-3 p-4 rounded-xl ds-panel-surface" >
        <StudioHeaderSection viewMode={viewMode} overviewUi={overviewUi} onViewModeChange={setViewMode} />
        <StudioToolbarSection
          viewMode={viewMode}
          layoutSurface={layoutSurface}
          graphOrientation={graphOrientation}
          policyMode={policyMode}
          showBranchEdges={showBranchEdges}
          dimOutsidePolicy={dimOutsidePolicy}
          policySliceOnly={policySliceOnly}
          viewDensity={viewDensity}
          overviewUi={overviewUi}
          branchFocusFromSelection={branchFocusFromSelection}
          colorByDomain={colorByDomain}
          clusterByPrimaryDomain={clusterByPrimaryDomain}
          planFootprintOnly={planFootprintOnly}
          tracePlanReady={Boolean(tracePlan)}
          exportBusy={exportBusy}
          onLayoutSurfaceChange={setLayoutSurface}
          onGraphOrientationChange={setGraphOrientation}
          onPolicyModeChange={setPolicyMode}
          onShowBranchEdgesChange={setShowBranchEdges}
          onDimOutsidePolicyChange={setDimOutsidePolicy}
          onPolicySliceOnlyChange={setPolicySliceOnly}
          onViewDensityChange={setViewDensity}
          onOverviewUiChange={setOverviewUi}
          onBranchFocusFromSelectionChange={setBranchFocusFromSelection}
          onColorByDomainChange={setColorByDomain}
          onClusterByPrimaryDomainChange={setClusterByPrimaryDomain}
          onPlanFootprintOnlyChange={setPlanFootprintOnly}
          onExportSvg={downloadSvgExport}
          onExportPng={() => void downloadPngExport()}
        />
        <StudioModeSummarySection
          policyMode={policyMode}
          policyBannerStats={policyBannerStats}
          tracePlan={tracePlan}
          traceError={traceError}
          branchFocusSize={branchFocusQuestionIds ? branchFocusQuestionIds.size : null}
          intelligenceMetrics={intelligenceMetrics}
        />
        {kpiDashboard ? (
          <div className="rounded-xl border border-[var(--ds-border-subtle)] p-3">
            <p className="text-xs font-semibold mb-2">KPI Dashboard</p>
            <p className="text-xs m-0">Sessions: {kpiDashboard.sessions}</p>
            <p className="text-xs m-0">Question shown: {kpiDashboard.questionShown}</p>
            <p className="text-xs m-0">Drop-off: {kpiDashboard.dropOff}</p>
            <p className="text-xs m-0">Drop-off rate: {(kpiDashboard.dropOffRate * 100).toFixed(1)}%</p>
            <p className="text-xs m-0">
              Median questions to readiness: {kpiDashboard.medianQuestionsToReadiness.toFixed(1)}
            </p>
            <p className="text-xs m-0">
              Funnel: {kpiDashboard.sessionFunnel.started} started / {kpiDashboard.sessionFunnel.withQuestionShown} shown /{' '}
              {kpiDashboard.sessionFunnel.reachedAuditReady} ready / {kpiDashboard.sessionFunnel.droppedOff} dropped
            </p>
            <p className="text-xs mt-2 mb-1 font-medium">Top hotspots</p>
            <div className="flex flex-wrap gap-2">
              {kpiDashboard.topDropOffHotspots.map(item => (
                <span key={item.questionId} className="text-xs px-2 py-1 rounded-md border">
                  {item.questionId}: {item.dropOffCount}/{item.shownCount} ({(item.dropOffRate * 100).toFixed(0)}%)
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {viewMode === 'logic' && (
          <StudioLegendSection
            legendStyle={legendStyle}
            markerSizePx={STUDIO_LEGEND_MARKER_SIZE_PX}
            domainBorderColor={STUDIO_LEGEND_DOMAIN_BORDER_COLOR}
            layoutBorderColor={STUDIO_LEGEND_LAYOUT_BORDER_COLOR}
            planFootprintSize={planFootprintOnly && planIdSet ? planIdSet.size : null}
          />
        )}
        {viewMode === 'logic' && !overviewUi ? (
          <StudioDiffSection
            bankDiffJson={bankDiffJson}
            bankDiffError={bankDiffError}
            bankDiffSummary={bankDiffSummary}
            onBankDiffJsonChange={setBankDiffJson}
            onRunBankDiff={runBankDiff}
          />
        ) : null}
        {viewMode === 'logic' && (
          <StudioLogicMetaSection
            sectionKeys={sectionKeys}
            collapsedSections={collapsedSections}
            stats={stats}
            search={search}
            debouncedSearch={debouncedSearch}
            centerOnNodeId={centerOnNodeId}
            onToggleSection={toggleSectionCollapse}
            onSearchChange={setSearch}
          />
        )}
        {viewMode === 'user' && (
          <StudioUserFlowSection
            breadcrumbs={breadcrumbs}
            pathHistory={pathHistory}
            nextIdsCount={simulation.nextIds.length}
            userStepLanes={userStepLanes}
            activeUserStep={activeUserStep}
            onBack={() => {
              if (pathHistory.length < 2) return;
              const next = pathHistory.slice(0, -1);
              setPathHistory(next);
              setSelectedId(next[next.length - 1] ?? null);
            }}
            onNextPreview={() => {
              if (simulation.nextIds.length === 0) return;
              const nextQuestionId = simulation.nextIds[0];
              const node = layoutGraph.nodes.find(
                n => n.type === 'studioQuestion' && n.data.kind === 'question' && n.data.questionId === nextQuestionId,
              );
              if (!node) return;
              setSelectedId(node.id);
              setPathHistory(prev => (prev[prev.length - 1] === node.id ? prev : [...prev, node.id]));
            }}
            onResetPath={() => {
              setPathHistory([]);
              setSelectedId(null);
            }}
            onSetActiveStep={setActiveUserStep}
          />
        )}
        <div className={viewMode === 'user' ? 'grid gap-3 items-start lg:grid-cols-[280px_1fr_320px]' : 'flex flex-wrap gap-3 items-start'}>
          {viewMode === 'user' ? (
            <ContextInputsPanel
              customProductMode={customProductMode}
              onCustomProductModeChange={next => setCustomProductMode(next)}
              customCollectionMode={customCollectionMode}
              onCustomCollectionModeChange={next => setCustomCollectionMode(next)}
              customSurface={customSurface}
              onCustomSurfaceChange={next => setCustomSurface(next)}
              customResponsesText={customResponsesText}
              onCustomResponsesTextChange={next => setCustomResponsesText(next)}
              policyMode={policyMode}
              effectiveLayoutSurface={effectiveLayoutSurface}
              onShowAllSteps={() => setActiveUserStep(null)}
            />
          ) : null}
          <StudioCanvasSection
            userStepLanes={userStepLanes}
            activeUserStep={activeUserStep}
            selectedQuestionId={selectedQuestionId}
            questionNodeIdByQuestionId={questionNodeIdByQuestionId}
            traceStatusByQuestionId={traceStatusByQuestionId}
            layoutGraphNodes={layoutGraph.nodes}
            onSelectNode={nodeId => {
              setSelectedId(nodeId);
              setPathHistory(prev => (prev[prev.length - 1] === nodeId ? prev : [...prev, nodeId]));
            }}
          />
          <InspectorPanel
            viewMode={viewMode}
            selectedQuestionRole={selectedQuestionRole}
            selectedDependencies={selectedDependencies}
            selectedWhy={selectedWhy}
            simulation={simulation}
            tracePlan={tracePlan}
            traceError={traceError}
            allQuestionsForReview={allQuestionsForReview}
            inspectorBody={inspectorBody}
            layoutGraphNodes={layoutGraph.nodes}
            setSelectedId={setSelectedId}
            setPathHistory={setPathHistory}
          />
        </div>
      </div>
    </div>
  );
}
