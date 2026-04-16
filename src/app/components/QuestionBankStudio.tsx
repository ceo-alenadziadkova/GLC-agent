import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  type Node,
} from '@xyflow/react';

import { TreeStructure } from '@phosphor-icons/react';
import type { IntakeSurface, QuestionReason } from '@glc/intake-core';
import {
  getQuestionBankReportUse,
  getQuestionBankSchemaMeta,
  QUESTION_BANK_V1_STUBS,
} from '@glc/intake-core';
import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import { useGlcTheme } from '../hooks/useGlcTheme';
import { QUESTION_BANK_STUDIO_COPY_EN } from '../config/question-bank-studio-copy.en';
import {
  LEGEND_FONT_SIZE_PX,
  LEGEND_LINE_HEIGHT,
  LEGEND_TEXT_COLOR_VAR,
} from '../config/question-bank-studio-ui';
import { useDebouncedString } from './question-bank-studio/hooks/useDebouncedString';
import { useQuestionBankStudioDiff } from './question-bank-studio/hooks/useQuestionBankStudioDiff';
import { useQuestionBankStudioExport } from './question-bank-studio/hooks/useQuestionBankStudioExport';
import { useQuestionBankStudioTrace } from './question-bank-studio/hooks/useQuestionBankStudioTrace';
import {
  buildQuestionBankStudioGraph,
  type StudioAnyNodeData,
  type StudioLayoutSurfaceKey,
} from '../lib/question-bank-studio-graph';
import {
  computeStudioPolicyModeStats,
  type StudioPolicyMode,
} from '../lib/question-bank-studio-policy';
// Policy stripe label mapping lives in question-bank-studio/config.ts
import {
  collectBranchFocusQuestionIds,
  computeBranchDownstreamIds,
  computeBranchUpstreamIds,
} from './intake/intake-trace-branch-links';
import { idsInIntakePlan, planTraceRoles, shortUserLabel, statusPill, traceRingColor } from './question-bank-studio/selectors/trace';
import { computeCenterOnNodeId, computeNodeHiddenById, computeUserStepLanes } from './question-bank-studio/selectors/visibility';
import { InspectorPanel } from './question-bank-studio/panels/InspectorPanel';
import { ContextInputsPanel } from './question-bank-studio/panels/ContextInputsPanel';
import type { TracePlanStatus, TraceRole, ViewMode } from './question-bank-studio/types';
import {
  LAYOUT_SURFACE_OPTIONS,
  POLICY_MODE_OPTIONS,
  POLICY_STRIPE_INSPECTOR,
} from './question-bank-studio/config';
import { QUESTION_BANK_STUDIO_DEBOUNCE_MS } from '../config/question-bank-studio-defaults';
import { Switch } from './ui/switch';

// UI config: options + trace/status presentation helpers live in separate modules.

export function QuestionBankStudio() {
  const { isDark } = useGlcTheme();
  /** `user` = consultant-focused swimlanes + trace; `logic` = full graph tooling (layout surface, export, bank diff). */
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
  /** Show only nodes that appear in the current trace preset's IntakePlan (runtime footprint). */
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
  const { bankDiffSummary, bankDiffError, runBankDiff } = useQuestionBankStudioDiff(bankDiffJson);

  useEffect(() => {
    if (!tracePlan) setPlanFootprintOnly(false);
  }, [tracePlan]);

  useEffect(() => {
    setPolicyMode(customProductMode);
  }, [customProductMode]);

  // search/customResponsesText debounce lives in `useDebouncedString` hooks.

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

  const nodes = useMemo(() => {
    return layoutGraph.nodes.map(n => {
      let traceRole: TraceRole | undefined;
      if (traceRoles && n.type === 'studioQuestion' && n.data.kind === 'question') {
        traceRole = traceRoles.get(n.data.questionId);
      }
      const matched =
        searchLower.length === 0 ||
        n.id.toLowerCase().includes(searchLower) ||
        (n.data.kind === 'question' &&
          (n.data.questionId.toLowerCase().includes(searchLower) ||
            n.data.fullLabel.toLowerCase().includes(searchLower) ||
            n.data.shortLabel.toLowerCase().includes(searchLower))) ||
        (n.data.kind === 'section' &&
          (n.data.sectionKey.toLowerCase().includes(searchLower) ||
            n.data.label.toLowerCase().includes(searchLower))) ||
        (n.data.kind === 'domainCluster' &&
          (n.data.domainKey.toLowerCase().includes(searchLower) ||
            n.data.label.toLowerCase().includes(searchLower))) ||
        (n.data.kind === 'identity' && n.data.questionId.toLowerCase().includes(searchLower)) ||
        (n.data.kind === 'layoutStep' &&
          (n.data.label.toLowerCase().includes(searchLower) ||
            n.data.surfaceKey.toLowerCase().includes(searchLower) ||
            n.data.sectionKey.toLowerCase().includes(searchLower)));

      const searchDim = searchLower.length > 0 && !matched;

      let extraStyle: CSSProperties = {};
      if (traceRole) {
        extraStyle = {
          boxShadow: `0 0 0 3px ${traceRingColor(traceRole)}`,
        };
      }
      if (searchLower.length > 0 && matched) {
        extraStyle = {
          ...extraStyle,
          outline: '2px solid var(--glc-orange)',
          outlineOffset: 2,
        };
      }
      if (searchDim) {
        extraStyle = { ...extraStyle, opacity: 0.2 };
      }
      const nextData =
        n.data.kind === 'question'
          ? { ...n.data, applyPolicyDim: dimOutsidePolicy }
          : n.data;

      const hidden = nodeHiddenById.get(n.id) ?? false;

      return {
        ...n,
        hidden,
        selected: n.id === selectedId,
        style: { ...(n.style ?? {}), ...extraStyle },
        data: nextData,
      } as Node<StudioAnyNodeData>;
    });
  }, [layoutGraph.nodes, traceRoles, searchLower, selectedId, dimOutsidePolicy, nodeHiddenById]);

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

  const simulation = useMemo(() => {
    if (!selectedQuestionId) {
      return { nextIds: [] as string[], addedNext: [] as string[], removedNext: [] as string[], nowVisible: [] as string[] };
    }
    const nextIds = computeBranchDownstreamIds(selectedQuestionId, QUESTION_BANK_V1_STUBS);
    if (!tracePlan) {
      return { nextIds, addedNext: [], removedNext: [], nowVisible: [] as string[] };
    }
    const nowVisibleSet = new Set([...tracePlan.required, ...tracePlan.visible]);
    const nowVisible = [...nowVisibleSet].sort((a, b) => a.localeCompare(b));
    const addedNext = nextIds.filter(id => tracePlan.required.includes(id) || tracePlan.visible.includes(id));
    const removedNext = nextIds.filter(id => tracePlan.hidden.includes(id) || tracePlan.deferred.includes(id));
    return { nextIds, addedNext, removedNext, nowVisible };
  }, [selectedQuestionId, tracePlan]);

  const selectedWhy = useMemo(() => {
    if (!selectedQuestionId || !tracePlan) return [];
    return tracePlan.reasonsById?.[selectedQuestionId] ?? [];
  }, [selectedQuestionId, tracePlan]);

  const breadcrumbs = useMemo(() => {
    if (!selectedQuestionId) return [];
    const upstream = computeBranchUpstreamIds(selectedQuestionId, QUESTION_BANK_V1_STUBS);
    return [...upstream, selectedQuestionId];
  }, [selectedQuestionId]);

  const selectedDependencies = useMemo(() => {
    if (!selectedQuestionId) return { dependsOn: [] as string[], enables: [] as string[] };
    const dependsOn = computeBranchUpstreamIds(selectedQuestionId, QUESTION_BANK_V1_STUBS);
    const enables = computeBranchDownstreamIds(selectedQuestionId, QUESTION_BANK_V1_STUBS);
    return { dependsOn, enables };
  }, [selectedQuestionId]);

  const allQuestionsForReview = useMemo(() => {
    const statusById = new Map<string, TracePlanStatus>();
    if (tracePlan) {
      for (const id of tracePlan.hidden) statusById.set(id, 'hidden');
      for (const id of tracePlan.deferred) statusById.set(id, 'deferred');
      for (const id of tracePlan.visible) statusById.set(id, 'visible');
      for (const id of tracePlan.required) statusById.set(id, 'required');
    }
    const ids = QUESTION_BANK_V1_STUBS.map(q => q.id).sort((a, b) => a.localeCompare(b));
    return ids.map(id => ({
      id,
      label: shortUserLabel(id),
      status: statusById.get(id) ?? 'unknown',
    }));
  }, [tracePlan]);

  const questionNodeIdByQuestionId = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nodes) {
      if (n.type === 'studioQuestion' && n.data.kind === 'question') {
        m.set(n.data.questionId, n.id);
      }
    }
    return m;
  }, [nodes]);

  const traceStatusByQuestionId = useMemo(() => {
    const m = new Map<string, 'required' | 'visible' | 'hidden' | 'deferred' | 'unknown'>();
    if (!tracePlan) return m;
    for (const id of tracePlan.hidden) m.set(id, 'hidden');
    for (const id of tracePlan.deferred) m.set(id, 'deferred');
    for (const id of tracePlan.visible) m.set(id, 'visible');
    for (const id of tracePlan.required) m.set(id, 'required');
    return m;
  }, [tracePlan]);

  const renderUserQuestionInline = useCallback((id: string) => {
    return `${shortUserLabel(id)} (${id})`;
  }, []);

  const inspectorBody = useMemo(() => {
    if (!selectedNode) {
      return (
        <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
          {QUESTION_BANK_STUDIO_COPY_EN.inspector.selectNodeOnCanvas}
        </p>
      );
    }
    const d = selectedNode.data;
    if (d.kind === 'root') {
      return <p className="text-xs m-0" style={{ color: 'var(--text-secondary)' }}>{d.label}</p>;
    }
    if (d.kind === 'section') {
      return (
        <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span>Section {d.sectionKey}</span>
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => void navigator.clipboard.writeText(d.sectionKey)}
            >
              Copy section key
            </button>
          </div>
          <div style={{ color: 'var(--text-quaternary)' }}>{d.questionCount} questions in canon</div>
          <div style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
            Schema grouping from the bank; wizard steps are a separate axis (toggle Layout surface above).
          </div>
        </div>
      );
    }
    if (d.kind === 'domainCluster') {
      return (
        <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              {d.domainKey}
            </span>
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => void navigator.clipboard.writeText(d.domainKey)}
            >
              Copy domain key
            </button>
          </div>
          <div>{d.label}</div>
          <div style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
            Primary slice from <span className="font-mono">question-feed-roles.ts</span> (agent/context consumer).
          </div>
        </div>
      );
    }
    if (d.kind === 'layoutStep') {
      return (
        <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Layout step ({d.surfaceKey})
          </div>
          <div>{d.label}</div>
          <div style={{ color: 'var(--text-quaternary)' }}>
            Section {d.sectionKey} · {d.questionCount} bank ids in this step
          </div>
          <div style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
            From <span className="font-mono">layout-rules</span> · presentation order only.
          </div>
        </div>
      );
    }
    if (d.kind === 'identity') {
      return (
        <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{d.questionId}</span>
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => void navigator.clipboard.writeText(d.questionId)}
            >
              Copy id
            </button>
          </div>
          <div style={{ color: 'var(--text-quaternary)' }}>Identity field for pre-brief flows.</div>
        </div>
      );
    }
    if (d.kind === 'question') {
      const reportUse = getQuestionBankReportUse(d.questionId);
      const meta = getQuestionBankSchemaMeta(d.questionId);
      return (
        <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div>
            <span className="font-mono font-semibold" style={{ color: 'var(--glc-blue)' }}>
              {d.questionId}
            </span>
            <button
              type="button"
              className="ml-2 underline-offset-2 hover:underline"
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => void navigator.clipboard.writeText(d.questionId)}
            >
              Copy id
            </button>
          </div>
          <p className="m-0 leading-relaxed">{d.fullLabel}</p>
          <div style={{ color: 'var(--text-quaternary)' }}>
            Canon priority: {meta?.priority ?? d.priority}
            {d.branchCondition ? ` · branch: ${d.branchCondition}` : ''}
          </div>
          <div style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
            {POLICY_STRIPE_INSPECTOR[d.policyBaseVisual]}
          </div>
          <div style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
            SLA gates use the same resolver via{' '}
            <span className="font-mono">brief-gates.ts</span> (e.g. resolveSlaRequiredIds for full/express).
          </div>
          {reportUse ? (
            <div style={{ color: 'var(--text-quaternary)' }}>
              reportUse: <span className="font-mono">{reportUse}</span>
            </div>
          ) : null}
          {d.feedDomains.length > 0 ? (
            <div style={{ color: 'var(--text-quaternary)' }}>
              Feeds:{' '}
              <span className="font-mono" style={{ fontSize: 10 }}>
                {d.feedDomains.join(', ')}
              </span>
            </div>
          ) : (
            <div style={{ color: 'var(--text-quaternary)' }}>Feeds: (none in bank doc map)</div>
          )}
          <div style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
            Bank fixtures (repo):{' '}
            <span className="font-mono">server/src/tests/bank-brief-fixtures.ts</span>
          </div>
          {tracePlan ? (
            <div className="space-y-0.5" style={{ color: 'var(--text-quaternary)' }}>
              <div className="font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                Trace
              </div>
              <div>
                required: {tracePlan.required.includes(d.questionId) ? 'yes' : 'no'} · visible:{' '}
                {tracePlan.visible.includes(d.questionId) ? 'yes' : 'no'} · hidden:{' '}
                {tracePlan.hidden.includes(d.questionId) ? 'yes' : 'no'} · deferred:{' '}
                {tracePlan.deferred.includes(d.questionId) ? 'yes' : 'no'}
              </div>
              {tracePlan.reasonsById?.[d.questionId]?.length ? (
                <ul className="mt-1 mb-0 pl-4 space-y-1" style={{ fontSize: 10 }}>
                  {tracePlan.reasonsById[d.questionId]!.map((r: QuestionReason, i: number) => (
                    <li key={`${r.code}-${i}`}>
                      <span className="font-mono">{r.layer}</span> · {r.state} · <span className="font-mono">{r.code}</span>
                      {r.detail ? ` — ${r.detail}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {d.policyBadges.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {d.policyBadges.map(b => (
                <span
                  key={b}
                  className="rounded px-1.5 py-0.5 text-[10px]"
                  style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-tertiary)' }}
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      );
    }
    return null;
  }, [selectedNode, tracePlan]);

  const { stats, sectionKeys } = layoutGraph;

  const legendStyle: CSSProperties = {
    fontSize: LEGEND_FONT_SIZE_PX,
    color: LEGEND_TEXT_COLOR_VAR,
    lineHeight: LEGEND_LINE_HEIGHT,
  };

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: 560 }}>
      <div
        className="flex flex-col gap-3 p-4 rounded-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex flex-wrap items-center gap-2 justify-between" style={{ color: 'var(--text-primary)' }}>
          <div className="flex items-center gap-2">
            <TreeStructure className="w-4 h-4" weight="bold" />
            <h2 className="text-sm font-semibold m-0">{QUESTION_BANK_STUDIO_COPY_EN.headerTitle}</h2>
          </div>
          <div
            className="inline-flex rounded-lg overflow-hidden text-[11px] font-medium"
            style={{ border: '1px solid var(--border-default)' }}
            role="group"
            aria-label="Studio view mode"
          >
            <button
              type="button"
              className="px-2.5 py-1.5"
              style={{
                backgroundColor: viewMode === 'user' ? 'var(--glc-blue-muted)' : 'var(--bg-canvas)',
                color: 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setViewMode('user')}
            >
              {QUESTION_BANK_STUDIO_COPY_EN.viewModeButtons.flowSimulator}
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5"
              style={{
                backgroundColor: viewMode === 'logic' ? 'var(--glc-blue-muted)' : 'var(--bg-canvas)',
                color: 'var(--text-secondary)',
                border: 'none',
                borderLeft: '1px solid var(--border-default)',
                cursor: 'pointer',
              }}
              onClick={() => setViewMode('logic')}
            >
              {QUESTION_BANK_STUDIO_COPY_EN.viewModeButtons.fullMap}
            </button>
          </div>
        </div>
        {viewMode === 'logic' ? (
          overviewUi ? (
            <p className="m-0 text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--text-quaternary)' }}>
              Overview UI: long help and bank diff are hidden. Turn off &quot;Overview UI&quot; below to restore the full guide.
            </p>
          ) : (
            <div
              className="rounded-lg px-3 py-2 space-y-2 text-xs leading-relaxed"
              style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
            >
              <p className="m-0" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Canon map (default):</strong> every bank id and section
                from <span className="font-mono">question-bank.v1.json</span> — this is the full semantic tree, not “what one
                product screen asks in one step”.
              </p>
              <p className="m-0" style={{ color: 'var(--text-quaternary)' }}>
                <strong style={{ color: 'var(--text-tertiary)' }}>Left stripe</strong> = policy + canon priority;{' '}
                <strong style={{ color: 'var(--text-tertiary)' }}>outer glow ring</strong> = trace result (answers +{' '}
                <span className="font-mono">buildIntakePlan</span>) when the trace runs. Inner stripe answers &quot;what the product mode expects&quot;; ring answers &quot;what this scenario shows&quot;.
              </p>
              <p className="m-0" style={{ color: 'var(--text-quaternary)' }}>
                <strong style={{ color: 'var(--text-tertiary)' }}>Policy mode</strong> adjusts participation / requiredness
                overlays; <strong style={{ color: 'var(--text-tertiary)' }}>full</strong> and{' '}
                <strong style={{ color: 'var(--text-tertiary)' }}>express</strong> are both <span className="font-mono">all_eligible</span>{' '}
                in policy, so the same ids appear — branch edges and trace show if-then differences.
              </p>
              <p className="m-0" style={{ color: 'var(--text-quaternary)' }}>
                <strong style={{ color: 'var(--text-tertiary)' }}>Layout surface</strong> adds wizard-step nodes from{' '}
                <span className="font-mono">layout-rules</span> between each section and its questions; ids not listed in
                that surface stay linked straight from the section.
              </p>
            </div>
          )
        ) : (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
          >
            Нажми на карточку вопроса на карте, чтобы увидеть эволюцию пути и что откроется дальше у клиента.
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            {QUESTION_BANK_STUDIO_COPY_EN.viewModeButtons.flowSimulator}
          </span>
          {viewMode === 'logic' && (
            <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              {QUESTION_BANK_STUDIO_COPY_EN.toolbar.layoutSurface}
              <select
                className="ml-1 block mt-1 px-2 py-1.5 text-xs rounded-md max-w-[200px]"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={layoutSurface}
                onChange={e => setLayoutSurface(e.target.value as '' | StudioLayoutSurfaceKey)}
              >
                {LAYOUT_SURFACE_OPTIONS.map(o => (
                  <option key={o.value || 'flat'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {viewMode === 'logic' && (
            <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              {QUESTION_BANK_STUDIO_COPY_EN.toolbar.orientation}
              <select
                className="ml-1 block mt-1 px-2 py-1.5 text-xs rounded-md"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={graphOrientation}
                onChange={e => setGraphOrientation(e.target.value as 'TB' | 'LR')}
              >
                <option value="TB">Vertical (top-bottom)</option>
                <option value="LR">Horizontal (left-right)</option>
              </select>
            </label>
          )}
          {viewMode === 'logic' && (
            <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              {QUESTION_BANK_STUDIO_COPY_EN.toolbar.policyMode}
              <select
                className="ml-1 block mt-1 px-2 py-1.5 text-xs rounded-md"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={policyMode}
                onChange={e => setPolicyMode(e.target.value as StudioPolicyMode)}
              >
                {POLICY_MODE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {viewMode === 'logic' && (
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Switch checked={showBranchEdges} onCheckedChange={setShowBranchEdges} />
              {QUESTION_BANK_STUDIO_COPY_EN.toolbar.branchEdges}
            </label>
          )}
          {viewMode === 'logic' && (
            <>
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Switch checked={dimOutsidePolicy} onCheckedChange={setDimOutsidePolicy} />
                {QUESTION_BANK_STUDIO_COPY_EN.toolbar.dimOutsidePolicyMode}
              </label>
              <label
                className="flex items-center gap-2 text-xs"
                style={{ color: 'var(--text-secondary)' }}
                title="Hide nodes that do not participate in the selected policy mode (strong effect for discovery / pre_brief)."
              >
                <Switch checked={policySliceOnly} onCheckedChange={setPolicySliceOnly} />
                {QUESTION_BANK_STUDIO_COPY_EN.toolbar.policySlice}
              </label>
            </>
          )}
          {viewMode === 'logic' && (
            <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              {QUESTION_BANK_STUDIO_COPY_EN.toolbar.density}
              <select
                className="ml-1 block mt-1 px-2 py-1.5 text-xs rounded-md"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={viewDensity}
                onChange={e => setViewDensity(e.target.value as 'comfortable' | 'compact')}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
          )}
          {viewMode === 'logic' && (
            <>
              <label
                className="flex items-center gap-2 text-xs"
                style={{ color: 'var(--text-secondary)' }}
                title="Collapse long help panels and bank diff for a quicker read."
              >
                <Switch checked={overviewUi} onCheckedChange={setOverviewUi} />
                {QUESTION_BANK_STUDIO_COPY_EN.toolbar.overviewUi}
              </label>
              <label
                className="flex items-center gap-2 text-xs"
                style={{ color: 'var(--text-secondary)' }}
                title="After selecting a question node, hide other bank ids outside its branch neighbourhood."
              >
                <Switch checked={branchFocusFromSelection} onCheckedChange={setBranchFocusFromSelection} />
                {QUESTION_BANK_STUDIO_COPY_EN.toolbar.branchFocus}
              </label>
            </>
          )}
          {viewMode === 'logic' && (
            <>
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Switch checked={colorByDomain} onCheckedChange={setColorByDomain} />
                {QUESTION_BANK_STUDIO_COPY_EN.toolbar.colorByFeedDomain}
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Switch checked={clusterByPrimaryDomain} onCheckedChange={setClusterByPrimaryDomain} />
                {QUESTION_BANK_STUDIO_COPY_EN.toolbar.clusterByPrimaryDomain}
              </label>
            </>
          )}
          {viewMode === 'logic' && (
            <>
              <label
                className={`flex items-center gap-2 text-xs ${!tracePlan ? 'opacity-50' : ''}`}
                style={{ color: 'var(--text-secondary)' }}
                title={
                  tracePlan
                    ? 'Hide nodes not referenced by the current trace preset plan.'
                    : 'Run a successful trace preset first.'
                }
              >
                <Switch
                  checked={planFootprintOnly}
                  disabled={!tracePlan}
                  onCheckedChange={setPlanFootprintOnly}
                />
                {QUESTION_BANK_STUDIO_COPY_EN.toolbar.planFootprint}
              </label>
              <div className="flex flex-wrap gap-1 items-center">
                <button
                  type="button"
                  disabled={exportBusy}
                  className="text-xs font-medium px-2 py-1.5 rounded-md"
                  style={{
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-canvas)',
                    color: 'var(--text-secondary)',
                    cursor: exportBusy ? 'wait' : 'pointer',
                    opacity: exportBusy ? 0.6 : 1,
                  }}
                  onClick={() => downloadSvgExport()}
                >
                  {QUESTION_BANK_STUDIO_COPY_EN.toolbar.exportSvg}
                </button>
                <button
                  type="button"
                  disabled={exportBusy}
                  className="text-xs font-medium px-2 py-1.5 rounded-md"
                  style={{
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-canvas)',
                    color: 'var(--text-secondary)',
                    cursor: exportBusy ? 'wait' : 'pointer',
                    opacity: exportBusy ? 0.6 : 1,
                  }}
                  onClick={() => void downloadPngExport()}
                >
                  {exportBusy ? QUESTION_BANK_STUDIO_COPY_EN.toolbar.pngBusy : QUESTION_BANK_STUDIO_COPY_EN.toolbar.exportPng}
                </button>
              </div>
            </>
          )}
        </div>

        <div
          className="rounded-lg px-3 py-2 space-y-1 text-xs leading-snug"
          style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>
            {QUESTION_BANK_STUDIO_COPY_EN.panels.currentMode}
          </div>
          <p className="m-0" style={{ color: 'var(--text-secondary)' }}>
            Policy <span className="font-mono">{policyMode}</span>
            {' · '}
            Bank in policy: <strong>{policyBannerStats.bankParticipating}</strong> / {policyBannerStats.bankTotal}
            {policyBannerStats.bankOutsidePolicy > 0 ? (
              <>
                {' '}
                (<span style={{ color: 'var(--text-quaternary)' }}>{policyBannerStats.bankOutsidePolicy} outside slice</span>)
              </>
            ) : null}
            {policyBannerStats.bankPolicyRequired > 0 ? (
              <>
                {' · '}
                Policy required: <strong style={{ color: 'var(--glc-orange)' }}>{policyBannerStats.bankPolicyRequired}</strong>
              </>
            ) : null}
            {policyBannerStats.bankPolicyIfVisible > 0 ? (
              <>
                {' · '}
                If visible: <strong>{policyBannerStats.bankPolicyIfVisible}</strong>
              </>
            ) : null}
          </p>
          <p className="m-0" style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
            Runtime trace
            {tracePlan ? (
              <>
                {' · '}
                Trace visible ids: <strong>{tracePlan.visible.length}</strong>
                {tracePlan.required.length > 0 ? (
                  <>
                    {' · '}
                    required in plan: <strong>{tracePlan.required.length}</strong>
                  </>
                ) : null}
              </>
            ) : (
              <> · Trace: {traceError ? 'error' : '—'}</>
            )}
            {branchFocusQuestionIds ? (
              <>
                {' · '}
                Branch focus: <strong>{branchFocusQuestionIds.size}</strong> ids
              </>
            ) : null}
          </p>
        </div>

        {viewMode === 'logic' && (
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {QUESTION_BANK_STUDIO_COPY_EN.legend.title}
          </div>
          <div className="grid gap-1.5 mobile:grid-cols-2" style={legendStyle}>
            <span className="flex items-center gap-2">
              <span className="inline-block rounded-sm shrink-0" style={{ width: 12, height: 12, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }} />
              Root
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block rounded-sm shrink-0" style={{ width: 12, height: 12, backgroundColor: 'var(--glc-blue-muted)', border: '1px solid var(--glc-blue)' }} />
              Section (schema)
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block rounded-sm shrink-0" style={{ width: 12, height: 12, backgroundColor: 'var(--bg-surface)', border: '1px dashed #0891b2' }} />
              Domain group (primary feed)
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block rounded-sm shrink-0" style={{ width: 12, height: 12, backgroundColor: 'var(--bg-surface)', border: '1px dashed #9333ea' }} />
              Layout group (wizard step)
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block rounded-sm shrink-0" style={{ width: 12, height: 12, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }} />
              Question
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block rounded-sm shrink-0" style={{ width: 12, height: 12, backgroundColor: 'var(--bg-surface)', border: '1px dashed color-mix(in oklab, var(--glc-orange) 55%, var(--border-default))' }} />
              Identity (pre_brief)
            </span>
            <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.solidEdges}</span>
            <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.questionLeftStripe}</span>
            <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.traceRingOuter}</span>
            <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.feedDomain}</span>
            <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.search}</span>
            {planFootprintOnly && planIdSet ? (
              <span>
                Plan footprint: <strong>{planIdSet.size}</strong> ids in trace plan.
              </span>
            ) : null}
          </div>
        </div>
        )}

        {viewMode === 'logic' && !overviewUi ? (
        <div
          className="rounded-lg px-3 py-2 space-y-2"
          style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>
            Bank revision diff (vs bundled <span className="font-mono">question-bank.v1.json</span>)
          </div>
          <p className="text-[10px] m-0" style={{ color: 'var(--text-quaternary)' }}>
            Paste another bank JSON with a <span className="font-mono">questions</span> array to list added / removed ids.
          </p>
          <textarea
            className="w-full min-h-[72px] px-2 py-1.5 text-[11px] font-mono rounded-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            value={bankDiffJson}
            onChange={e => setBankDiffJson(e.target.value)}
            spellCheck={false}
          />
          <button
            type="button"
            className="text-xs font-medium px-2 py-1.5 rounded-md"
            style={{
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            onClick={() => runBankDiff()}
          >
            Compare revisions
          </button>
          {bankDiffError ? (
            <p className="text-xs m-0 text-red-500">{bankDiffError}</p>
          ) : null}
          {bankDiffSummary ? (
            <div className="text-[10px] space-y-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
              <div style={{ color: 'var(--text-tertiary)' }}>
                Added ({bankDiffSummary.added.length}):{' '}
                {bankDiffSummary.added.length ? bankDiffSummary.added.join(', ') : '—'}
              </div>
              <div style={{ color: 'var(--text-tertiary)' }}>
                Removed ({bankDiffSummary.removed.length}):{' '}
                {bankDiffSummary.removed.length ? bankDiffSummary.removed.join(', ') : '—'}
              </div>
            </div>
          ) : null}
        </div>
        ) : null}

        {viewMode === 'logic' && (
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Collapse sections
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sectionKeys.map(key => {
              const on = collapsedSections.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  className="text-[10px] font-medium px-2 py-1 rounded-md"
                  style={{
                    border: on ? '1px solid var(--glc-orange)' : '1px solid var(--border-default)',
                    backgroundColor: on ? 'var(--glc-orange-muted)' : 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSectionCollapse(key)}
                >
                  {on ? `+ ${key}` : `− ${key}`}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {viewMode === 'logic' && (
        <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>Questions: {stats.questionCount}</span>
          <span>Sections: {stats.sectionCount}</span>
          <span>Structure edges: {stats.structureEdgeCount}</span>
          <span>Structure depth: {stats.structureMaxDepth}</span>
          <span>Structure leaves: {stats.structureLeafCount}</span>
          <span>Branch edges (graph): {stats.branchEdgeCount}</span>
          <span>Branch depth: {stats.branchMaxDepth}</span>
          <span>Branch roots: {stats.branchRootCount}</span>
          <span>Branch leaves: {stats.branchLeafCount}</span>
        </div>
        )}

        {viewMode === 'logic' && (
        <div className="flex flex-col gap-1 max-w-md">
          <input
            type="search"
              placeholder={QUESTION_BANK_STUDIO_COPY_EN.search.placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-md"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
          {debouncedSearch.length > 0 ? (
            <span className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
              {centerOnNodeId ? 'Centered on first match.' : 'No match in visible graph.'}
            </span>
          ) : null}
        </div>
        )}

        {viewMode === 'user' && (
          <div
            className="rounded-lg px-3 py-2 space-y-2 text-xs"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
          >
            <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>
              Breadcrumbs (current path)
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              {breadcrumbs.length > 0
                ? breadcrumbs.map(renderUserQuestionInline).join(' -> ')
                : 'Select a question node to start simulation path.'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="text-[11px] font-medium px-2 py-1 rounded-md"
                style={{
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: pathHistory.length > 1 ? 'pointer' : 'not-allowed',
                  opacity: pathHistory.length > 1 ? 1 : 0.5,
                }}
                onClick={() => {
                  if (pathHistory.length < 2) return;
                  const next = pathHistory.slice(0, -1);
                  setPathHistory(next);
                  setSelectedId(next[next.length - 1] ?? null);
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="text-[11px] font-medium px-2 py-1 rounded-md"
                style={{
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: simulation.nextIds.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: simulation.nextIds.length > 0 ? 1 : 0.5,
                }}
                onClick={() => {
                  if (simulation.nextIds.length === 0) return;
                  const nextQuestionId = simulation.nextIds[0];
                  const node = layoutGraph.nodes.find(
                    n => n.type === 'studioQuestion' && n.data.kind === 'question' && n.data.questionId === nextQuestionId,
                  );
                  if (!node) return;
                  setSelectedId(node.id);
                  setPathHistory(prev => (prev[prev.length - 1] === node.id ? prev : [...prev, node.id]));
                }}
              >
                Next preview
              </button>
              <button
                type="button"
                className="text-[11px] font-medium px-2 py-1 rounded-md"
                style={{
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setPathHistory([]);
                  setSelectedId(null);
                }}
              >
                Reset path
              </button>
            </div>
            {userStepLanes.length > 0 && (
              <div className="pt-1 border-t" style={{ borderColor: 'var(--border-default)' }}>
                <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Swimlanes by step
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="text-[11px] font-medium px-2 py-1 rounded-md"
                    style={{
                      border: '1px solid var(--border-default)',
                      backgroundColor: activeUserStep === null ? 'var(--glc-blue-muted)' : 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setActiveUserStep(null)}
                  >
                    All steps
                  </button>
                  {userStepLanes.map(step => (
                    <button
                      key={step.laneId}
                      type="button"
                      className="text-[11px] font-medium px-2 py-1 rounded-md"
                      style={{
                        border: '1px solid var(--border-default)',
                        backgroundColor:
                          activeUserStep === step.stepIndex ? 'var(--glc-blue-muted)' : 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                      onClick={() => setActiveUserStep(step.stepIndex)}
                      title={step.label}
                    >
                      {`Step ${step.stepIndex + 1} (${step.questionIds.length})`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
          <div
            className="flex-1 min-w-0 rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border-default)', height: 'calc(100vh - 260px)', minHeight: 620 }}
          >
            <div className="h-full overflow-auto p-3 space-y-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
              {userStepLanes.length === 0 ? (
                <div className="text-sm" style={{ color: 'var(--text-quaternary)' }}>
                  No step layout available for this scenario.
                </div>
              ) : (
                userStepLanes
                  .filter(step => activeUserStep === null || step.stepIndex === activeUserStep)
                  .map(step => (
                    <section
                      key={`flow-step-${step.laneId}`}
                      className="rounded-lg p-3"
                      style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-canvas)' }}
                    >
                      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        {`Step ${step.stepIndex + 1} — ${step.label}`}
                      </div>
                      <div className="grid gap-2">
                        {step.questionIds.length === 0 ? (
                          <div className="text-[11px]" style={{ color: 'var(--text-quaternary)' }}>
                            No questions in this step.
                          </div>
                        ) : (
                          step.questionIds.map(questionId => {
                            const nodeId = questionNodeIdByQuestionId.get(questionId);
                            const status = traceStatusByQuestionId.get(questionId) ?? 'unknown';
                            const pill = statusPill(status);
                            const active = selectedQuestionId === questionId;
                            return (
                              <button
                                key={`step-card-${step.laneId}-${questionId}`}
                                type="button"
                                className="w-full text-left rounded-md px-3 py-2"
                                style={{
                                  border: active ? `1px solid ${pill.border}` : `1px solid ${pill.border}`,
                                  backgroundColor: active ? pill.bg : 'var(--bg-surface)',
                                  color: 'var(--text-secondary)',
                                  cursor: nodeId ? 'pointer' : 'not-allowed',
                                  opacity: nodeId ? 1 : 0.6,
                                }}
                                disabled={!nodeId}
                                onClick={() => {
                                  if (!nodeId) return;
                                  setSelectedId(nodeId);
                                  setPathHistory(prev => (prev[prev.length - 1] === nodeId ? prev : [...prev, nodeId]));
                                }}
                              >
                                <div className="text-[12px] font-medium">{shortUserLabel(questionId)}</div>
                                <div className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--text-quaternary)' }}>
                                  id: <span className="font-mono">{questionId}</span> · status: {status}
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: pill.bg, color: pill.fg, border: `1px solid ${pill.border}` }}
                                  >
                                    {pill.label}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </section>
                  ))
              )}
            </div>
          </div>
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
