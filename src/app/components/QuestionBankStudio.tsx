import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TreeStructure } from '@phosphor-icons/react';
import bankBundledRaw from '@glc/intake-core/question-bank.v1.json';
import { buildIntakePlan } from '@glc/intake-core';
import type { IntakePlan, IntakeSurface, QuestionReason } from '@glc/intake-core';
import {
  getQuestionBankReportUse,
  getQuestionBankSchemaMeta,
  QUESTION_BANK_VERSION,
  QUESTION_BANK_V1_STUBS,
} from '@glc/intake-core';
import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import { useGlcTheme } from '../hooks/useGlcTheme';
import { diffQuestionBankIdSets, extractQuestionIdsFromBankJson } from '../lib/question-bank-revision-diff';
import {
  buildStudioMapSvg,
  downloadDataUrl,
  studioSvgToPngDataUrl,
} from '../lib/question-bank-studio-map-export';
import type { IntakeTraceScenarioPreset } from '../lib/intake-trace-scenarios';
import { INTAKE_TRACE_SCENARIO_PRESETS } from '../lib/intake-trace-scenarios';
import {
  buildQuestionBankStudioGraph,
  getStudioQuestionNodeDimensions,
  type StudioAnyNodeData,
  type StudioLayoutSurfaceKey,
} from '../lib/question-bank-studio-graph';
import {
  computeStudioPolicyModeStats,
  type StudioPolicyMode,
} from '../lib/question-bank-studio-policy';
import {
  studioPolicyBaseAccent,
  type StudioPolicyBaseVisualKind,
} from '../lib/question-bank-studio-node-style';
import { collectBranchFocusQuestionIds } from './intake/intake-trace-branch-links';
import { Switch } from './ui/switch';

const POLICY_STRIPE_INSPECTOR: Record<StudioPolicyBaseVisualKind, string> = {
  outside_policy: 'Outside policy slice (not in this product mode)',
  policy_required: 'Policy required or synthetic required (left stripe)',
  policy_if_visible: 'Required if visible when in express SLA (amber stripe)',
  canon_required: 'Canon required in bank JSON (blue stripe)',
  canon_recommended: 'Canon recommended (gray stripe)',
  canon_optional: 'Canon optional (light gray stripe)',
};

const POLICY_MODE_OPTIONS: { value: StudioPolicyMode; label: string }[] = [
  { value: 'full', label: 'full' },
  { value: 'express', label: 'express' },
  { value: 'discovery', label: 'discover (discovery)' },
  { value: 'pre_brief', label: 'brief (pre_brief)' },
  { value: 'free_snapshot', label: 'free_snapshot' },
];

const LAYOUT_SURFACE_OPTIONS: { value: '' | StudioLayoutSurfaceKey; label: string }[] = [
  { value: '', label: 'Flat (schema sections only)' },
  { value: 'consultant_interview', label: 'consultant_interview' },
  { value: 'public_discovery', label: 'public_discovery' },
  { value: 'client_form', label: 'client_form' },
  { value: 'client_portal', label: 'client_portal' },
];

const TRACE_PRODUCT_OPTIONS: { value: ProductMode; label: string }[] = [
  { value: 'full', label: 'full' },
  { value: 'express', label: 'express' },
  { value: 'free_snapshot', label: 'free_snapshot' },
];

const TRACE_COLLECTION_OPTIONS: { value: IntakeBriefCollectionMode | ''; label: string }[] = [
  { value: '', label: '(none)' },
  { value: 'discovery', label: 'discovery' },
  { value: 'pre_brief', label: 'pre_brief' },
  { value: 'interview', label: 'interview' },
  { value: 'self_serve', label: 'self_serve' },
];

const TRACE_SURFACE_OPTIONS: { value: IntakeSurface | ''; label: string }[] = [
  { value: '', label: '(none)' },
  { value: 'public_discovery', label: 'public_discovery' },
  { value: 'consultant_interview', label: 'consultant_interview' },
  { value: 'client_form', label: 'client_form' },
  { value: 'client_portal', label: 'client_portal' },
  { value: 'internal_review', label: 'internal_review' },
];

const StudioRootNode = memo(function StudioRootNode({ data }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'root') return null;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: 0 }} />
      <div
        className="rounded-lg px-3 py-2 text-center text-xs font-semibold shadow-sm"
        style={{
          width: 200,
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
});

const StudioSectionNode = memo(function StudioSectionNode({ data }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'section') return null;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="rounded-lg px-3 py-2 text-xs font-semibold shadow-sm"
        style={{
          width: 220,
          backgroundColor: 'var(--glc-blue-muted)',
          border: '1px solid var(--glc-blue)',
          color: 'var(--text-primary)',
        }}
      >
        {data.label}
        <span className="block font-normal opacity-80" style={{ fontSize: 10 }}>
          {data.collapsed ? `${data.questionCount} questions (hidden)` : `${data.questionCount} questions`}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
});

const StudioQuestionNode = memo(function StudioQuestionNode({ data, selected }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'question') return null;
  const policyMuted = data.applyPolicyDim && !data.participatesPolicy;
  const policyAccent = studioPolicyBaseAccent(data.policyBaseVisual);
  const { w, h } = data.layoutSize;
  const idSizeClass = w >= 270 ? 'text-[11px]' : 'text-[10px]';
  const bodySizeClass = w >= 270 ? 'text-[12px]' : 'text-[11px]';
  const defaultEdgeW = selected ? 2 : 1;
  const defaultEdgeColor = selected ? 'var(--glc-blue)' : 'var(--border-default)';
  const topW = data.domainAccent ? 3 : defaultEdgeW;
  const topColor = data.domainAccent ? data.domainAccent : defaultEdgeColor;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="rounded-lg px-2 py-1.5 shadow-sm transition-opacity"
        style={{
          width: w,
          minHeight: h,
          backgroundColor: selected ? 'var(--glc-blue-muted)' : 'var(--bg-surface)',
          borderLeftWidth: 5,
          borderLeftStyle: 'solid',
          borderLeftColor: policyAccent,
          borderTopWidth: topW,
          borderTopStyle: 'solid',
          borderTopColor: topColor,
          borderRightWidth: defaultEdgeW,
          borderRightStyle: 'solid',
          borderRightColor: defaultEdgeColor,
          borderBottomWidth: defaultEdgeW,
          borderBottomStyle: 'solid',
          borderBottomColor: defaultEdgeColor,
          color: 'var(--text-primary)',
          opacity: policyMuted ? 0.45 : 1,
        }}
      >
        <div className={`font-mono ${idSizeClass}`} style={{ color: 'var(--glc-blue)' }}>
          {data.questionId}
        </div>
        <div className={`${bodySizeClass} leading-snug`} style={{ color: 'var(--text-secondary)' }}>
          {data.shortLabel}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          <span
            className="rounded px-1 text-[9px] font-medium uppercase"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              color: 'var(--text-tertiary)',
            }}
          >
            {data.priority}
          </span>
          {data.branchCondition ? (
            <span
              className="rounded px-1 text-[9px]"
              style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-quaternary)' }}
            >
              branch
            </span>
          ) : null}
          {data.policyBadges.slice(0, 2).map(b => (
            <span
              key={b}
              className="rounded px-1 text-[9px]"
              style={{ backgroundColor: 'var(--glc-orange-muted)', color: 'var(--text-secondary)' }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
});

const StudioDomainClusterNode = memo(function StudioDomainClusterNode({ data }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'domainCluster') return null;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="rounded-lg px-3 py-2 text-xs font-semibold shadow-sm"
        style={{
          width: 220,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid color-mix(in oklab, #0891b2 55%, var(--border-default))',
          color: 'var(--text-primary)',
        }}
      >
        <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-quaternary)' }}>
          Feed domain (primary)
        </div>
        <div className="leading-snug">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
});

const StudioLayoutStepNode = memo(function StudioLayoutStepNode({ data }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'layoutStep') return null;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="rounded-lg px-2.5 py-1.5 text-xs shadow-sm"
        style={{
          width: 210,
          backgroundColor: 'var(--bg-surface)',
          border: '1px dashed color-mix(in oklab, #9333ea 50%, var(--border-default))',
          color: 'var(--text-primary)',
        }}
      >
        <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-quaternary)' }}>
          Layout · {data.surfaceKey}
        </div>
        <div className="leading-snug font-medium" style={{ fontSize: 11 }}>
          {data.label}
        </div>
        <div className="mt-0.5 font-normal opacity-80" style={{ fontSize: 10 }}>
          Sec {data.sectionKey} · {data.questionCount} ids
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
});

const StudioIdentityNode = memo(function StudioIdentityNode({ data }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'identity') return null;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="rounded-lg px-2 py-2 text-xs shadow-sm"
        style={{
          width: 240,
          backgroundColor: 'var(--bg-surface)',
          border: '1px dashed color-mix(in oklab, var(--glc-orange) 55%, var(--border-default))',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="font-mono text-[10px]" style={{ color: 'var(--glc-orange)' }}>
          {data.questionId}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
          Pre-brief identity (not a bank v1 id)
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
});

/** Stable reference for React Flow — do not define inside a component. */
const studioNodeTypes = {
  studioRoot: StudioRootNode,
  studioSection: StudioSectionNode,
  studioDomainCluster: StudioDomainClusterNode,
  studioLayoutStep: StudioLayoutStepNode,
  studioQuestion: StudioQuestionNode,
  studioIdentity: StudioIdentityNode,
};

function studioMinimapNodeColor(n: Pick<Node, 'type'>): string {
  switch (n.type) {
    case 'studioSection':
      return '#1CBDFF';
    case 'studioDomainCluster':
      return '#0891b2';
    case 'studioLayoutStep':
      return '#9333ea';
    case 'studioQuestion':
      return '#94a3b8';
    case 'studioIdentity':
      return '#f24f1d';
    default:
      return '#64748b';
  }
}

type TraceRole = 'required' | 'visible' | 'deferred' | 'hidden';

function planTraceRoles(plan: IntakePlan): Map<string, TraceRole> {
  const m = new Map<string, TraceRole>();
  for (const id of plan.hidden) m.set(id, 'hidden');
  for (const id of plan.deferred) m.set(id, 'deferred');
  for (const id of plan.visible) if (!m.has(id)) m.set(id, 'visible');
  for (const id of plan.required) m.set(id, 'required');
  return m;
}

/** Bank / identity ids that appear anywhere in the resolver plan (for footprint view). */
function idsInIntakePlan(plan: IntakePlan): Set<string> {
  return new Set([
    ...plan.eligible,
    ...plan.visible,
    ...plan.required,
    ...plan.hidden,
    ...plan.deferred,
  ]);
}

function traceRingColor(role: TraceRole): string {
  switch (role) {
    case 'required':
      return '#f59e0b';
    case 'visible':
      return '#38bdf8';
    case 'deferred':
      return '#a78bfa';
    case 'hidden':
      return '#71717a';
    default:
      return 'transparent';
  }
}

function FlowCanvas({
  nodes,
  edges,
  onNodeClick,
  layoutSignature,
  centerOnNodeId,
  minimapMaskColor,
  viewDensity,
}: {
  nodes: Node<StudioAnyNodeData>[];
  edges: Edge[];
  onNodeClick: (event: MouseEvent, node: Node<StudioAnyNodeData>) => void;
  /** When this changes, fit the entire graph (layout/policy/collapse). */
  layoutSignature: string;
  /** Focus a node by id (search); positions must match `nodes`. */
  centerOnNodeId: string | null;
  minimapMaskColor: string;
  viewDensity: 'comfortable' | 'compact';
}) {
  const { fitView, setCenter, getZoom, getNode } = useReactFlow();
  const qDim = getStudioQuestionNodeDimensions(viewDensity);
  const fitPadding = viewDensity === 'compact' ? 0.14 : 0.18;

  const handleFitEntireMap = useCallback(() => {
    fitView({ padding: fitPadding, duration: 280 });
  }, [fitView, fitPadding]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      fitView({ padding: fitPadding, duration: 260 });
    }, 40);
    return () => window.clearTimeout(t);
  }, [layoutSignature, fitView, fitPadding]);

  useEffect(() => {
    if (!centerOnNodeId) return;
    const n = getNode(centerOnNodeId);
    if (!n) return;
    const dim =
      n.type === 'studioQuestion'
        ? { w: qDim.w, h: qDim.h }
        : n.type === 'studioSection'
          ? { w: 220, h: 44 }
          : n.type === 'studioDomainCluster'
            ? { w: 220, h: 44 }
            : n.type === 'studioLayoutStep'
              ? { w: 210, h: 48 }
              : n.type === 'studioIdentity'
                ? { w: 240, h: 52 }
                : { w: 200, h: 40 };
    const cx = n.position.x + dim.w / 2;
    const cy = n.position.y + dim.h / 2;
    const z = Math.min(1.15, Math.max(getZoom(), viewDensity === 'compact' ? 0.92 : 0.88));
    const t = window.setTimeout(() => setCenter(cx, cy, { zoom: z, duration: 280 }), 24);
    return () => window.clearTimeout(t);
  }, [centerOnNodeId, getNode, setCenter, getZoom, qDim.w, qDim.h, viewDensity]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={studioNodeTypes}
      onNodeClick={onNodeClick}
      fitView
      minZoom={0.08}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} color="var(--border-default)" />
      <Panel position="top-left">
        <button
          type="button"
          className="text-[10px] font-semibold px-2 py-1.5 rounded-md shadow-sm"
          style={{
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          onClick={handleFitEntireMap}
        >
          Fit entire map
        </button>
      </Panel>
      <Controls />
      <MiniMap
        pannable
        zoomable
        style={{ backgroundColor: 'var(--bg-canvas)' }}
        maskColor={minimapMaskColor}
        nodeColor={studioMinimapNodeColor}
      />
    </ReactFlow>
  );
}

export function QuestionBankStudio() {
  const { isDark } = useGlcTheme();
  const [policyMode, setPolicyMode] = useState<StudioPolicyMode>('full');
  const [showBranchEdges, setShowBranchEdges] = useState(false);
  const [dimOutsidePolicy, setDimOutsidePolicy] = useState(true);
  const [policySliceOnly, setPolicySliceOnly] = useState(false);
  const [viewDensity, setViewDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [overviewUi, setOverviewUi] = useState(false);
  const [branchFocusFromSelection, setBranchFocusFromSelection] = useState(false);
  const [autoFootprintOnScenario, setAutoFootprintOnScenario] = useState(false);
  const tracePresetPrevRef = useRef<string | null>(null);
  const [colorByDomain, setColorByDomain] = useState(false);
  const [clusterByPrimaryDomain, setClusterByPrimaryDomain] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [exportBusy, setExportBusy] = useState(false);
  /** Show only nodes that appear in the current trace preset's IntakePlan (runtime footprint). */
  const [planFootprintOnly, setPlanFootprintOnly] = useState(false);

  const [tracePresetId, setTracePresetId] = useState(INTAKE_TRACE_SCENARIO_PRESETS[0]?.id ?? '');
  const [tracePlan, setTracePlan] = useState<IntakePlan | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [layoutSurface, setLayoutSurface] = useState<'' | StudioLayoutSurfaceKey>('');
  const [useCustomTrace, setUseCustomTrace] = useState(false);
  const [customResponsesText, setCustomResponsesText] = useState('{\n}\n');
  const [debouncedCustomJson, setDebouncedCustomJson] = useState('{\n}\n');
  const [customProductMode, setCustomProductMode] = useState<ProductMode>('full');
  const [customCollectionMode, setCustomCollectionMode] = useState<IntakeBriefCollectionMode | ''>('');
  const [customSurface, setCustomSurface] = useState<IntakeSurface | ''>('');
  const [bankDiffJson, setBankDiffJson] = useState('{\n  "version": "0.0.0",\n  "questions": []\n}\n');
  const [bankDiffError, setBankDiffError] = useState<string | null>(null);
  const [bankDiffSummary, setBankDiffSummary] = useState<{
    added: string[];
    removed: string[];
  } | null>(null);

  useEffect(() => {
    if (!tracePlan) setPlanFootprintOnly(false);
  }, [tracePlan]);

  useEffect(() => {
    if (!useCustomTrace) {
      const preset = INTAKE_TRACE_SCENARIO_PRESETS.find(p => p.id === tracePresetId);
      if (preset?.studioPolicyMode) setPolicyMode(preset.studioPolicyMode);
      if (
        autoFootprintOnScenario &&
        tracePresetPrevRef.current !== null &&
        tracePresetPrevRef.current !== tracePresetId &&
        preset?.autoEnableFootprint !== false
      ) {
        setPlanFootprintOnly(true);
      }
    }
    tracePresetPrevRef.current = tracePresetId;
  }, [tracePresetId, useCustomTrace, autoFootprintOnScenario]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!useCustomTrace) return;
    const t = window.setTimeout(() => setDebouncedCustomJson(customResponsesText), 400);
    return () => window.clearTimeout(t);
  }, [customResponsesText, useCustomTrace]);

  const layoutGraph = useMemo(
    () =>
      buildQuestionBankStudioGraph({
        policyMode,
        showBranchEdges,
        collapsedSectionKeys: collapsedSections,
        colorByDomain,
        layoutSurface: layoutSurface || null,
        clusterByPrimaryDomain,
        viewDensity,
      }),
    [policyMode, showBranchEdges, collapsedSections, colorByDomain, layoutSurface, clusterByPrimaryDomain, viewDensity],
  );

  const policyBannerStats = useMemo(() => computeStudioPolicyModeStats(policyMode), [policyMode]);

  const branchFocusQuestionIds = useMemo(() => {
    if (!branchFocusFromSelection || !selectedId) return null;
    const n = layoutGraph.nodes.find(x => x.id === selectedId);
    if (!n || n.type !== 'studioQuestion' || n.data.kind !== 'question') return null;
    return collectBranchFocusQuestionIds(n.data.questionId, QUESTION_BANK_V1_STUBS);
  }, [branchFocusFromSelection, selectedId, layoutGraph.nodes]);

  const layoutSignature = useMemo(
    () =>
      [
        policyMode,
        showBranchEdges,
        [...collapsedSections].sort().join(','),
        colorByDomain,
        clusterByPrimaryDomain,
        layoutSurface,
        planFootprintOnly,
        policySliceOnly,
        branchFocusFromSelection,
        selectedId ?? '',
        viewDensity,
        tracePresetId,
        useCustomTrace,
        tracePlan ? tracePlan.eligible.length + tracePlan.hidden.length : 0,
      ].join('|'),
    [
      policyMode,
      showBranchEdges,
      collapsedSections,
      colorByDomain,
      clusterByPrimaryDomain,
      layoutSurface,
      planFootprintOnly,
      policySliceOnly,
      branchFocusFromSelection,
      selectedId,
      viewDensity,
      tracePresetId,
      useCustomTrace,
      tracePlan,
    ],
  );

  const traceRoles = useMemo(() => (tracePlan ? planTraceRoles(tracePlan) : null), [tracePlan]);

  const planIdSet = useMemo(() => (tracePlan ? idsInIntakePlan(tracePlan) : null), [tracePlan]);

  const nodeHiddenById = useMemo(() => {
    const flags = new Map<string, boolean>();
    for (const n of layoutGraph.nodes) flags.set(n.id, false);

    const hideQuestion = (questionId: string, participatesPolicy: boolean) => {
      let h = false;
      if (planFootprintOnly && planIdSet && !planIdSet.has(questionId)) h = true;
      if (policySliceOnly && !participatesPolicy) h = true;
      if (branchFocusQuestionIds && !branchFocusQuestionIds.has(questionId)) h = true;
      return h;
    };

    for (const n of layoutGraph.nodes) {
      if (n.type === 'studioRoot') {
        flags.set(n.id, false);
        continue;
      }
      if (n.type === 'studioQuestion' && n.data.kind === 'question') {
        flags.set(n.id, hideQuestion(n.data.questionId, n.data.participatesPolicy));
        continue;
      }
      if (n.type === 'studioIdentity' && n.data.kind === 'identity') {
        let h = false;
        if (planFootprintOnly && planIdSet && !planIdSet.has(n.data.questionId)) h = true;
        if (policySliceOnly && !n.data.participatesPolicy) h = true;
        flags.set(n.id, h);
        continue;
      }
      if (n.type === 'studioLayoutStep' || n.type === 'studioDomainCluster') {
        flags.set(n.id, false);
        continue;
      }
      if (n.type === 'studioSection' && n.data.kind === 'section') {
        flags.set(n.id, false);
        continue;
      }
    }

    for (const n of layoutGraph.nodes) {
      if (n.type !== 'studioSection' || n.data.kind !== 'section') continue;
      const sectionKey = n.data.sectionKey;
      const qs = layoutGraph.nodes.filter(
        x => x.type === 'studioQuestion' && x.data.kind === 'question' && x.data.sectionKey === sectionKey,
      );
      if (qs.length === 0) continue;
      const anyVisible = qs.some(q => !flags.get(q.id));
      flags.set(n.id, !anyVisible);
    }

    for (const n of layoutGraph.nodes) {
      if (n.type !== 'studioLayoutStep') continue;
      const childQEdges = layoutGraph.edges.filter(
        e => e.source === n.id && String(e.target).startsWith('qbs-q-'),
      );
      if (childQEdges.length === 0) {
        flags.set(n.id, true);
        continue;
      }
      const allChildrenHidden = childQEdges.every(e => flags.get(e.target));
      flags.set(n.id, allChildrenHidden);
    }
    for (const n of layoutGraph.nodes) {
      if (n.type !== 'studioDomainCluster') continue;
      const sectionEdges = layoutGraph.edges.filter(
        e => e.source === n.id && e.target.startsWith('qbs-section-'),
      );
      if (sectionEdges.length === 0) {
        flags.set(n.id, true);
        continue;
      }
      const allSectionsHidden = sectionEdges.every(e => flags.get(e.target));
      flags.set(n.id, allSectionsHidden);
    }
    return flags;
  }, [
    layoutGraph.nodes,
    layoutGraph.edges,
    planFootprintOnly,
    planIdSet,
    policySliceOnly,
    branchFocusQuestionIds,
  ]);

  const searchLower = search.trim().toLowerCase();

  const centerOnNodeId = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (q.length === 0) return null;
    for (const n of layoutGraph.nodes) {
      if (n.type === 'studioQuestion' && n.data.kind === 'question') {
        const d = n.data;
        if (d.questionId.toLowerCase().includes(q) || d.fullLabel.toLowerCase().includes(q)) {
          return n.id;
        }
      }
      if (n.type === 'studioSection' && n.data.kind === 'section') {
        const d = n.data;
        if (d.sectionKey.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)) {
          return n.id;
        }
      }
      if (n.type === 'studioDomainCluster' && n.data.kind === 'domainCluster') {
        const d = n.data;
        if (d.domainKey.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)) {
          return n.id;
        }
      }
      if (n.type === 'studioIdentity' && n.data.kind === 'identity') {
        if (n.data.questionId.toLowerCase().includes(q)) return n.id;
      }
      if (n.type === 'studioLayoutStep' && n.data.kind === 'layoutStep') {
        const d = n.data;
        if (
          d.label.toLowerCase().includes(q) ||
          d.surfaceKey.toLowerCase().includes(q) ||
          d.sectionKey.toLowerCase().includes(q)
        ) {
          return n.id;
        }
      }
    }
    return null;
  }, [layoutGraph.nodes, debouncedSearch]);

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

  const displayEdges = useMemo(() => {
    return layoutGraph.edges.map((e): Edge => {
      const srcHidden = nodeHiddenById.get(e.source) ?? false;
      const tgtHidden = nodeHiddenById.get(e.target) ?? false;
      return {
        ...e,
        hidden: srcHidden || tgtHidden,
      };
    });
  }, [layoutGraph.edges, nodeHiddenById]);

  const selectedNode = useMemo(
    () => layoutGraph.nodes.find(n => n.id === selectedId),
    [layoutGraph.nodes, selectedId],
  );

  const onNodeClick = useCallback((_: MouseEvent, node: Node<StudioAnyNodeData>) => {
    setSelectedId(node.id);
  }, []);

  const runBankDiff = useCallback(() => {
    try {
      const bundled = extractQuestionIdsFromBankJson(bankBundledRaw);
      const other = extractQuestionIdsFromBankJson(JSON.parse(bankDiffJson));
      const d = diffQuestionBankIdSets(bundled, other);
      setBankDiffSummary({ added: d.added, removed: d.removed });
      setBankDiffError(null);
    } catch (e) {
      setBankDiffSummary(null);
      setBankDiffError(e instanceof Error ? e.message : String(e));
    }
  }, [bankDiffJson]);

  const downloadSvgExport = useCallback(() => {
    const svg = buildStudioMapSvg(layoutGraph.nodes, layoutGraph.edges, {
      title: `Question Bank Studio · v${QUESTION_BANK_VERSION}`,
      theme: isDark ? 'dark' : 'light',
      includeBranchEdges: showBranchEdges,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question-bank-studio-v${QUESTION_BANK_VERSION}.svg`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [layoutGraph.nodes, layoutGraph.edges, isDark, showBranchEdges]);

  const downloadPngExport = useCallback(async () => {
    setExportBusy(true);
    try {
      const svg = buildStudioMapSvg(layoutGraph.nodes, layoutGraph.edges, {
        title: `Question Bank Studio · v${QUESTION_BANK_VERSION}`,
        theme: isDark ? 'dark' : 'light',
        includeBranchEdges: showBranchEdges,
      });
      const png = await studioSvgToPngDataUrl(svg, 2);
      downloadDataUrl(png, `question-bank-studio-v${QUESTION_BANK_VERSION}.png`);
    } finally {
      setExportBusy(false);
    }
  }, [layoutGraph.nodes, layoutGraph.edges, isDark, showBranchEdges]);

  const applyPreset = useCallback((preset: IntakeTraceScenarioPreset) => {
    try {
      const responses = JSON.parse(preset.responsesText) as Record<string, unknown>;
      const plan = buildIntakePlan({
        responses,
        productMode: preset.productMode,
        collectionMode: preset.collectionMode || undefined,
        surface: preset.surface || undefined,
      });
      setTracePlan(plan);
      setTraceError(null);
    } catch (e) {
      setTracePlan(null);
      setTraceError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (useCustomTrace) {
      try {
        const responses = JSON.parse(debouncedCustomJson) as Record<string, unknown>;
        const plan = buildIntakePlan({
          responses,
          productMode: customProductMode,
          collectionMode: customCollectionMode || undefined,
          surface: customSurface || undefined,
        });
        setTracePlan(plan);
        setTraceError(null);
      } catch (e) {
        setTracePlan(null);
        setTraceError(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    const preset = INTAKE_TRACE_SCENARIO_PRESETS.find(p => p.id === tracePresetId);
    if (preset) applyPreset(preset);
  }, [
    useCustomTrace,
    debouncedCustomJson,
    customProductMode,
    customCollectionMode,
    customSurface,
    tracePresetId,
    applyPreset,
  ]);

  const inspectorBody = useMemo(() => {
    if (!selectedNode) {
      return <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>Select a node on the canvas.</p>;
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

  const activeTraceScenarioLabel = useMemo(() => {
    if (useCustomTrace) return 'Custom JSON trace';
    return INTAKE_TRACE_SCENARIO_PRESETS.find(p => p.id === tracePresetId)?.label ?? tracePresetId;
  }, [useCustomTrace, tracePresetId]);

  const { stats, sectionKeys } = layoutGraph;

  const legendStyle: CSSProperties = {
    fontSize: 10,
    color: 'var(--text-quaternary)',
    lineHeight: 1.5,
  };

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: 560 }}>
      <div
        className="flex flex-col gap-3 p-4 rounded-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <TreeStructure className="w-4 h-4" weight="bold" />
          <h2 className="text-sm font-semibold m-0">Question Bank Studio</h2>
        </div>
        {overviewUi ? (
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
              <strong style={{ color: 'var(--text-tertiary)' }}>free_snapshot</strong> uses <span className="font-mono">requiredness: none</span>{' '}
              in policy — the map still shows the full canon; card stripes follow bank priorities.
            </p>
            <p className="m-0" style={{ color: 'var(--text-quaternary)' }}>
              Use <strong style={{ color: 'var(--text-tertiary)' }}>Plan footprint</strong> or <strong style={{ color: 'var(--text-tertiary)' }}>Policy slice</strong> to hide noise; scenario presets can sync policy mode and optionally auto-enable footprint.
            </p>
            <p className="m-0" style={{ color: 'var(--text-quaternary)' }}>
              <strong style={{ color: 'var(--text-tertiary)' }}>Layout surface</strong> adds wizard-step nodes from{' '}
              <span className="font-mono">layout-rules</span> between each section and its questions; ids not listed in
              that surface stay linked straight from the section.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Layout surface
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
          <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Policy mode
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
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={showBranchEdges} onCheckedChange={setShowBranchEdges} />
            Branch edges
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={dimOutsidePolicy} onCheckedChange={setDimOutsidePolicy} />
            Dim outside policy mode
          </label>
          <label
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--text-secondary)' }}
            title="Hide nodes that do not participate in the selected policy mode (strong effect for discovery / pre_brief)."
          >
            <Switch checked={policySliceOnly} onCheckedChange={setPolicySliceOnly} />
            Policy slice
          </label>
          <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Density
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
          <label
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--text-secondary)' }}
            title="Collapse long help panels and bank diff for a quicker read."
          >
            <Switch checked={overviewUi} onCheckedChange={setOverviewUi} />
            Overview UI
          </label>
          <label
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--text-secondary)' }}
            title="After selecting a question node, hide other bank ids outside its branch neighbourhood."
          >
            <Switch checked={branchFocusFromSelection} onCheckedChange={setBranchFocusFromSelection} />
            Branch focus
          </label>
          <label
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--text-secondary)' }}
            title="When you change the scenario preset, turn on plan footprint automatically."
          >
            <Switch checked={autoFootprintOnScenario} onCheckedChange={setAutoFootprintOnScenario} />
            Auto footprint on scenario
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={colorByDomain} onCheckedChange={setColorByDomain} />
            Color by feed domain
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={clusterByPrimaryDomain} onCheckedChange={setClusterByPrimaryDomain} />
            Cluster by primary domain
          </label>
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
            Plan footprint
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
              Export SVG
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
              {exportBusy ? 'PNG…' : 'Export PNG'}
            </button>
          </div>
        </div>

        <div
          className="rounded-lg px-3 py-2 space-y-1 text-xs leading-snug"
          style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>
            Current mode
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
            Scenario: {activeTraceScenarioLabel}
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

        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Legend (node types)
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
            <span>Solid edges: structure · Blue dashed: branch (canon)</span>
            <span>Question left stripe: orange policy req · amber if-visible · blue canon req · gray rec/opt</span>
            <span>Trace ring (outer): amber req · blue vis · purple def · gray hid</span>
            <span>Feed domain: thin top color when &quot;Color by feed domain&quot; is on</span>
            <span>Search: orange outline on matches · minimap bottom · Fit top-left on canvas</span>
            {planFootprintOnly && planIdSet ? (
              <span>
                Plan footprint: <strong>{planIdSet.size}</strong> ids in trace plan.
              </span>
            ) : null}
          </div>
        </div>

        {!overviewUi ? (
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

        <div className="flex flex-col gap-1 max-w-md">
          <input
            type="search"
            placeholder="Search id or label (debounced center on first match)…"
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

        <div className="flex flex-wrap gap-3 items-start">
          <div
            className="flex-1 min-w-0 rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border-default)', height: 480 }}
          >
            <ReactFlowProvider>
              <FlowCanvas
                nodes={nodes}
                edges={displayEdges}
                onNodeClick={onNodeClick}
                layoutSignature={layoutSignature}
                centerOnNodeId={centerOnNodeId}
                minimapMaskColor={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)'}
                viewDensity={viewDensity}
              />
            </ReactFlowProvider>
          </div>
          <div
            className="w-full mobile:w-80 shrink-0 p-3 rounded-lg text-left"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
          >
            <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Inspector
            </div>
            {inspectorBody}
            <div
              className="mt-4 pt-3 text-[10px] font-semibold uppercase mb-2 border-t"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-tertiary)' }}
            >
              Interactive trace
            </div>
            <label className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Switch checked={useCustomTrace} onCheckedChange={setUseCustomTrace} />
              Custom responses JSON
            </label>
            {!useCustomTrace ? (
              <>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-quaternary)' }}>
                  Scenario preset
                </label>
                <select
                  className="w-full px-2 py-1.5 text-xs rounded-md mb-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  value={tracePresetId}
                  onChange={e => setTracePresetId(e.target.value)}
                >
                  {INTAKE_TRACE_SCENARIO_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="space-y-2 mb-2">
                <label className="block text-[10px] uppercase" style={{ color: 'var(--text-quaternary)' }}>
                  Responses JSON
                </label>
                <textarea
                  className="w-full min-h-[120px] px-2 py-1.5 text-[11px] font-mono rounded-md"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  value={customResponsesText}
                  onChange={e => setCustomResponsesText(e.target.value)}
                  spellCheck={false}
                />
                <div className="grid grid-cols-1 gap-1.5">
                  <label className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                    Product mode
                    <select
                      className="block w-full mt-0.5 px-2 py-1 text-xs rounded-md"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      value={customProductMode}
                      onChange={e => setCustomProductMode(e.target.value as ProductMode)}
                    >
                      {TRACE_PRODUCT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                    Collection mode
                    <select
                      className="block w-full mt-0.5 px-2 py-1 text-xs rounded-md"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      value={customCollectionMode}
                      onChange={e =>
                        setCustomCollectionMode(e.target.value as IntakeBriefCollectionMode | '')
                      }
                    >
                      {TRACE_COLLECTION_OPTIONS.map(o => (
                        <option key={o.value || 'none'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                    Surface
                    <select
                      className="block w-full mt-0.5 px-2 py-1 text-xs rounded-md"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      value={customSurface}
                      onChange={e => setCustomSurface(e.target.value as IntakeSurface | '')}
                    >
                      {TRACE_SURFACE_OPTIONS.map(o => (
                        <option key={o.value || 'none'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-[10px] m-0" style={{ color: 'var(--text-quaternary)' }}>
                  Live session replay from analytics storage is not wired here yet; this JSON path matches how presets
                  call <span className="font-mono">buildIntakePlan</span>.
                </p>
              </div>
            )}
            {traceError ? (
              <p className="text-xs m-0 text-red-500">{traceError}</p>
            ) : (
              <p className="text-[10px] m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                Card left stripe = policy + canon; outer ring = trace outcome. Ring: amber required · blue visible · purple
                deferred · gray hidden ({useCustomTrace ? 'custom' : 'preset'} JSON + resolver).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
