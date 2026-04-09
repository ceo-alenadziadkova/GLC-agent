import { useCallback, useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import {
  Background,
  Controls,
  MiniMap,
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
import { buildIntakePlan } from '../../../server/src/intake/core/build-intake-plan';
import type { IntakePlan } from '../../../server/src/intake/core/types';
import {
  getQuestionBankReportUse,
  getQuestionBankSchemaMeta,
} from '../../../server/src/intake/question-bank';
import type { IntakeTraceScenarioPreset } from '../lib/intake-trace-scenarios';
import { INTAKE_TRACE_SCENARIO_PRESETS } from '../lib/intake-trace-scenarios';
import {
  buildQuestionBankStudioGraph,
  type StudioAnyNodeData,
} from '../lib/question-bank-studio-graph';
import type { StudioPolicyMode } from '../lib/question-bank-studio-policy';
import { Switch } from './ui/switch';

const POLICY_MODE_OPTIONS: { value: StudioPolicyMode; label: string }[] = [
  { value: 'full', label: 'full' },
  { value: 'express', label: 'express' },
  { value: 'discovery', label: 'discover (discovery)' },
  { value: 'pre_brief', label: 'brief (pre_brief)' },
  { value: 'free_snapshot', label: 'free_snapshot' },
];

function studioRootNode({ data }: NodeProps<Node<StudioAnyNodeData>>) {
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
}

function studioSectionNode({ data }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'section') return null;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="rounded-lg px-3 py-2 text-xs font-semibold shadow-sm"
        style={{
          width: 220,
          backgroundColor: 'rgba(28,189,255,0.12)',
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
}

function studioQuestionNode({ data, selected }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'question') return null;
  const policyMuted = data.applyPolicyDim && !data.participatesPolicy;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="rounded-lg px-2 py-1.5 shadow-sm transition-opacity"
        style={{
          width: 260,
          minHeight: 72,
          backgroundColor: selected ? 'rgba(28,189,255,0.15)' : 'var(--bg-surface)',
          border: selected ? '2px solid var(--glc-blue)' : '1px solid var(--border-default)',
          borderLeft: data.domainAccent ? `4px solid ${data.domainAccent}` : undefined,
          color: 'var(--text-primary)',
          opacity: policyMuted ? 0.45 : 1,
        }}
      >
        <div className="font-mono text-[10px]" style={{ color: 'var(--glc-blue)' }}>
          {data.questionId}
        </div>
        <div className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
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
}

function studioIdentityNode({ data }: NodeProps<Node<StudioAnyNodeData>>) {
  if (data.kind !== 'identity') return null;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="rounded-lg px-2 py-2 text-xs shadow-sm"
        style={{
          width: 240,
          backgroundColor: 'rgba(242,79,29,0.08)',
          border: '1px dashed rgba(242,79,29,0.5)',
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
}

const nodeTypes = {
  studioRoot: studioRootNode,
  studioSection: studioSectionNode,
  studioQuestion: studioQuestionNode,
  studioIdentity: studioIdentityNode,
};

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
export function idsInIntakePlan(plan: IntakePlan): Set<string> {
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
  fitRequestId,
  centerOnNodeId,
}: {
  nodes: Node<StudioAnyNodeData>[];
  edges: Edge[];
  onNodeClick: (event: MouseEvent, node: Node<StudioAnyNodeData>) => void;
  /** When this changes, fit the entire graph (layout/policy/collapse). */
  layoutSignature: string;
  /** Increment to fit without changing layout. */
  fitRequestId: number;
  /** Focus a node by id (search); positions must match `nodes`. */
  centerOnNodeId: string | null;
}) {
  const { fitView, setCenter, getZoom, getNode } = useReactFlow();

  useEffect(() => {
    const t = window.setTimeout(() => {
      fitView({ padding: 0.18, duration: 260 });
    }, 40);
    return () => window.clearTimeout(t);
  }, [layoutSignature, fitRequestId, fitView]);

  useEffect(() => {
    if (!centerOnNodeId) return;
    const n = getNode(centerOnNodeId);
    if (!n) return;
    const dim =
      n.type === 'studioQuestion'
        ? { w: 260, h: 76 }
        : n.type === 'studioSection'
          ? { w: 220, h: 44 }
          : n.type === 'studioIdentity'
            ? { w: 240, h: 52 }
            : { w: 200, h: 40 };
    const cx = n.position.x + dim.w / 2;
    const cy = n.position.y + dim.h / 2;
    const z = Math.min(1.15, Math.max(getZoom(), 0.88));
    const t = window.setTimeout(() => setCenter(cx, cy, { zoom: z, duration: 280 }), 24);
    return () => window.clearTimeout(t);
  }, [centerOnNodeId, getNode, setCenter, getZoom]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      minZoom={0.08}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} color="var(--border-default)" />
      <Controls />
      <MiniMap
        pannable
        zoomable
        style={{ backgroundColor: 'var(--bg-canvas)' }}
        maskColor="rgba(0,0,0,0.12)"
      />
    </ReactFlow>
  );
}

export function QuestionBankStudio() {
  const [policyMode, setPolicyMode] = useState<StudioPolicyMode>('full');
  const [showBranchEdges, setShowBranchEdges] = useState(false);
  const [dimOutsidePolicy, setDimOutsidePolicy] = useState(true);
  const [colorByDomain, setColorByDomain] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [fitRequestId, setFitRequestId] = useState(0);
  /** Show only nodes that appear in the current trace preset's IntakePlan (runtime footprint). */
  const [planFootprintOnly, setPlanFootprintOnly] = useState(false);

  const [tracePresetId, setTracePresetId] = useState(INTAKE_TRACE_SCENARIO_PRESETS[0]?.id ?? '');
  const [tracePlan, setTracePlan] = useState<IntakePlan | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);

  useEffect(() => {
    if (!tracePlan) setPlanFootprintOnly(false);
  }, [tracePlan]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const layoutGraph = useMemo(
    () =>
      buildQuestionBankStudioGraph({
        policyMode,
        showBranchEdges,
        collapsedSectionKeys: collapsedSections,
        colorByDomain,
      }),
    [policyMode, showBranchEdges, collapsedSections, colorByDomain],
  );

  const layoutSignature = useMemo(
    () =>
      [policyMode, showBranchEdges, [...collapsedSections].sort().join(','), colorByDomain].join('|'),
    [policyMode, showBranchEdges, collapsedSections, colorByDomain],
  );

  const traceRoles = useMemo(() => (tracePlan ? planTraceRoles(tracePlan) : null), [tracePlan]);

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
      if (n.type === 'studioIdentity' && n.data.kind === 'identity') {
        if (n.data.questionId.toLowerCase().includes(q)) return n.id;
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
        (n.data.kind === 'identity' && n.data.questionId.toLowerCase().includes(searchLower));

      const searchDim = searchLower.length > 0 && !matched;

      let extraStyle: CSSProperties = {};
      if (traceRole) {
        extraStyle = {
          boxShadow: `0 0 0 3px ${traceRingColor(traceRole)}`,
        };
      }
      if (searchDim) {
        extraStyle = { ...extraStyle, opacity: 0.2 };
      }
      const nextData =
        n.data.kind === 'question'
          ? { ...n.data, applyPolicyDim: dimOutsidePolicy }
          : n.data;

      return {
        ...n,
        selected: n.id === selectedId,
        style: { ...(n.style ?? {}), ...extraStyle },
        data: nextData,
      } as Node<StudioAnyNodeData>;
    });
  }, [layoutGraph.nodes, traceRoles, searchLower, selectedId, dimOutsidePolicy]);

  const selectedNode = useMemo(
    () => layoutGraph.nodes.find(n => n.id === selectedId),
    [layoutGraph.nodes, selectedId],
  );

  const onNodeClick = useCallback((_: MouseEvent, node: Node<StudioAnyNodeData>) => {
    setSelectedId(node.id);
  }, []);

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
    const preset = INTAKE_TRACE_SCENARIO_PRESETS.find(p => p.id === tracePresetId);
    if (preset) applyPreset(preset);
  }, [tracePresetId, applyPreset]);

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
          <div>Section {d.sectionKey}</div>
          <div style={{ color: 'var(--text-quaternary)' }}>{d.questionCount} questions in canon</div>
        </div>
      );
    }
    if (d.kind === 'identity') {
      return (
        <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <div className="font-mono">{d.questionId}</div>
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
            <div style={{ color: 'var(--text-quaternary)' }}>Feeds: (none in §5 map)</div>
          )}
          <div style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
            Bank fixtures (repo):{' '}
            <span className="font-mono">server/src/tests/bank-brief-fixtures.ts</span>
          </div>
          {tracePlan ? (
            <div className="space-y-0.5" style={{ color: 'var(--text-quaternary)' }}>
              <div className="font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                Trace (preset)
              </div>
              <div>
                required: {tracePlan.required.includes(d.questionId) ? 'yes' : 'no'} · visible:{' '}
                {tracePlan.visible.includes(d.questionId) ? 'yes' : 'no'} · hidden:{' '}
                {tracePlan.hidden.includes(d.questionId) ? 'yes' : 'no'} · deferred:{' '}
                {tracePlan.deferred.includes(d.questionId) ? 'yes' : 'no'}
              </div>
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
        <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
          Internal map of every bank question, section nesting, optional branch edges from canon, and policy overlay
          by mode. Trace presets reuse the intake resolver — highlights are approximate complements to the graph (bank
          ids only on question nodes).
        </p>

        <div className="flex flex-wrap gap-2 items-center">
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
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={colorByDomain} onCheckedChange={setColorByDomain} />
            Color by feed domain
          </label>
          <button
            type="button"
            className="text-xs font-medium px-2 py-1.5 rounded-md"
            style={{
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-canvas)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            onClick={() => setFitRequestId(n => n + 1)}
          >
            Fit all
          </button>
        </div>

        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Legend
          </div>
          <div className="grid gap-1 mobile:grid-cols-2" style={legendStyle}>
            <span>Root: single entry · Sections: blue header · Questions: white cards</span>
            <span>Identity: orange dashed (pre_brief only)</span>
            <span>Solid gray edges: structure · Blue dashed: branch deps (canon)</span>
            <span>Trace ring: amber required · blue visible · purple deferred · gray hidden</span>
          </div>
        </div>

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
                    backgroundColor: on ? 'rgba(242,79,29,0.1)' : 'var(--bg-surface)',
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
                edges={layoutGraph.edges}
                onNodeClick={onNodeClick}
                layoutSignature={layoutSignature}
                fitRequestId={fitRequestId}
                centerOnNodeId={centerOnNodeId}
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
            {traceError ? (
              <p className="text-xs m-0 text-red-500">{traceError}</p>
            ) : (
              <p className="text-[10px] m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                Amber: required · Blue: visible · Purple: deferred · Gray: hidden (resolver output for preset JSON).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
