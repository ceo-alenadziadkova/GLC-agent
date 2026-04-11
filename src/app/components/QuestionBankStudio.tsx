import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  type Node,
} from '@xyflow/react';

import { TreeStructure } from '@phosphor-icons/react';
import bankBundledRaw from '@glc/intake-core/question-bank.v1.json';
import { buildIntakePlan } from '@glc/intake-core';
import type { IntakePlan, IntakeSurface, QuestionReason } from '@glc/intake-core';
import {
  getQuestionBankPromptLabel,
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
import {
  buildQuestionBankStudioGraph,
  type StudioAnyNodeData,
  type StudioLayoutStepNodeData,
  type StudioLayoutSurfaceKey,
} from '../lib/question-bank-studio-graph';
import {
  computeStudioPolicyModeStats,
  type StudioPolicyMode,
} from '../lib/question-bank-studio-policy';
import {
  type StudioPolicyBaseVisualKind,
} from '../lib/question-bank-studio-node-style';
import {
  collectBranchFocusQuestionIds,
  computeBranchDownstreamIds,
  computeBranchUpstreamIds,
} from './intake/intake-trace-branch-links';
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


type TraceRole = 'required' | 'visible' | 'deferred' | 'hidden';

/** Trace role from `buildIntakePlan`, or `unknown` when the id is not in the current plan footprint. */
type TracePlanStatus = TraceRole | 'unknown';

function isStudioLayoutStepNode(n: Node<StudioAnyNodeData>): n is Node<StudioLayoutStepNodeData> {
  return n.type === 'studioLayoutStep' && n.data.kind === 'layoutStep';
}

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

function shortUserLabel(questionId: string): string {
  const raw = getQuestionBankPromptLabel(questionId) ?? questionId;
  const trimmed = raw.trim();
  if (trimmed.length <= 78) return trimmed;
  return `${trimmed.slice(0, 75)}...`;
}

function statusPill(status: TracePlanStatus): { label: string; fg: string; bg: string; border: string } {
  switch (status) {
    case 'required':
      return { label: 'Required', fg: '#b91c1c', bg: '#fee2e2', border: '#ef4444' };
    case 'visible':
      return { label: 'Visible', fg: '#1d4ed8', bg: '#dbeafe', border: '#60a5fa' };
    case 'deferred':
      return { label: 'Deferred', fg: '#6d28d9', bg: '#ede9fe', border: '#a78bfa' };
    case 'hidden':
      return { label: 'Hidden', fg: '#374151', bg: '#f3f4f6', border: '#9ca3af' };
    default:
      return { label: 'Unknown', fg: '#334155', bg: '#e2e8f0', border: '#94a3b8' };
  }
}

export function QuestionBankStudio() {
  const { isDark } = useGlcTheme();
  /** `user` = consultant-focused swimlanes + trace; `logic` = full graph tooling (layout surface, export, bank diff). */
  const [viewMode, setViewMode] = useState<'user' | 'logic'>('user');
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [activeUserStep, setActiveUserStep] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [exportBusy, setExportBusy] = useState(false);
  /** Show only nodes that appear in the current trace preset's IntakePlan (runtime footprint). */
  const [planFootprintOnly, setPlanFootprintOnly] = useState(false);

  const [tracePlan, setTracePlan] = useState<IntakePlan | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [layoutSurface, setLayoutSurface] = useState<'' | StudioLayoutSurfaceKey>('');
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
    setPolicyMode(customProductMode);
  }, [customProductMode]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedCustomJson(customResponsesText), 400);
    return () => window.clearTimeout(t);
  }, [customResponsesText]);

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

  const policyBannerStats = useMemo(() => computeStudioPolicyModeStats(policyMode), [policyMode]);

  const branchFocusQuestionIds = useMemo(() => {
    if (!branchFocusFromSelection || !selectedId) return null;
    const n = layoutGraph.nodes.find(x => x.id === selectedId);
    if (!n || n.type !== 'studioQuestion' || n.data.kind !== 'question') return null;
    return collectBranchFocusQuestionIds(n.data.questionId, QUESTION_BANK_V1_STUBS);
  }, [branchFocusFromSelection, selectedId, layoutGraph.nodes]);

  const traceRoles = useMemo(() => (tracePlan ? planTraceRoles(tracePlan) : null), [tracePlan]);

  const planIdSet = useMemo(() => (tracePlan ? idsInIntakePlan(tracePlan) : null), [tracePlan]);

  const userStepLanes = useMemo(() => {
    const stepNodes = layoutGraph.nodes.filter(isStudioLayoutStepNode).sort((a, b) => a.data.stepIndex - b.data.stepIndex);
    return stepNodes.map(stepNode => {
      const questionEdges = layoutGraph.edges.filter(
        e => e.source === stepNode.id && String(e.target).startsWith('qbs-q-'),
      );
      const questionIds = questionEdges
        .map(e => {
          const qNode = layoutGraph.nodes.find(n => n.id === e.target);
          return qNode && qNode.type === 'studioQuestion' && qNode.data.kind === 'question'
            ? qNode.data.questionId
            : null;
        })
        .filter((v): v is string => Boolean(v));
      return {
        laneId: stepNode.id,
        stepIndex: stepNode.data.stepIndex,
        label: stepNode.data.label,
        questionIds,
      };
    });
  }, [layoutGraph.nodes, layoutGraph.edges]);

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

    if (viewMode === 'user' && activeUserStep !== null) {
      const lane = userStepLanes.find(s => s.stepIndex === activeUserStep);
      const allowedQuestions = new Set(lane?.questionIds ?? []);
      for (const n of layoutGraph.nodes) {
        if (n.type === 'studioQuestion' && n.data.kind === 'question') {
          if (!allowedQuestions.has(n.data.questionId)) flags.set(n.id, true);
        }
      }
      for (const n of layoutGraph.nodes) {
        if (n.type === 'studioLayoutStep' && n.data.kind === 'layoutStep') {
          if (n.data.stepIndex !== activeUserStep) flags.set(n.id, true);
        }
      }
    }
    return flags;
  }, [
    layoutGraph.nodes,
    layoutGraph.edges,
    planFootprintOnly,
    planIdSet,
    policySliceOnly,
    branchFocusQuestionIds,
    viewMode,
    activeUserStep,
    userStepLanes,
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
      includeBranchEdges: effectiveShowBranchEdges,
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
  }, [layoutGraph.nodes, layoutGraph.edges, isDark, effectiveShowBranchEdges]);

  const downloadPngExport = useCallback(async () => {
    setExportBusy(true);
    try {
      const svg = buildStudioMapSvg(layoutGraph.nodes, layoutGraph.edges, {
        title: `Question Bank Studio · v${QUESTION_BANK_VERSION}`,
        theme: isDark ? 'dark' : 'light',
        includeBranchEdges: effectiveShowBranchEdges,
      });
      const png = await studioSvgToPngDataUrl(svg, 2);
      downloadDataUrl(png, `question-bank-studio-v${QUESTION_BANK_VERSION}.png`);
    } finally {
      setExportBusy(false);
    }
  }, [layoutGraph.nodes, layoutGraph.edges, isDark, effectiveShowBranchEdges]);

  useEffect(() => {
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
  }, [
    debouncedCustomJson,
    customProductMode,
    customCollectionMode,
    customSurface,
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
        <div className="flex flex-wrap items-center gap-2 justify-between" style={{ color: 'var(--text-primary)' }}>
          <div className="flex items-center gap-2">
            <TreeStructure className="w-4 h-4" weight="bold" />
            <h2 className="text-sm font-semibold m-0">Question Bank Studio</h2>
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
              Flow simulator
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
              Full map
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
            Flow simulator
          </span>
          {viewMode === 'logic' && (
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
          )}
          {viewMode === 'logic' && (
            <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Orientation
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
          )}
          {viewMode === 'logic' && (
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Switch checked={showBranchEdges} onCheckedChange={setShowBranchEdges} />
              Branch edges
            </label>
          )}
          {viewMode === 'logic' && (
            <>
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
            </>
          )}
          {viewMode === 'logic' && (
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
          )}
          {viewMode === 'logic' && (
            <>
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
            </>
          )}
          {viewMode === 'logic' && (
            <>
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Switch checked={colorByDomain} onCheckedChange={setColorByDomain} />
                Color by feed domain
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Switch checked={clusterByPrimaryDomain} onCheckedChange={setClusterByPrimaryDomain} />
                Cluster by primary domain
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
            </>
          )}
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
            <div
              className="w-full p-3 rounded-lg text-left"
              style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
            >
              <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Context inputs
              </div>
              <div className="space-y-2 mb-2">
                <label className="text-[10px] block" style={{ color: 'var(--text-quaternary)' }}>
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
                <label className="text-[10px] block" style={{ color: 'var(--text-quaternary)' }}>
                  Collection mode
                  <select
                    className="block w-full mt-0.5 px-2 py-1 text-xs rounded-md"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    value={customCollectionMode}
                    onChange={e => setCustomCollectionMode(e.target.value as IntakeBriefCollectionMode | '')}
                  >
                    {TRACE_COLLECTION_OPTIONS.map(o => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] block" style={{ color: 'var(--text-quaternary)' }}>
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
                <label className="text-[10px] block" style={{ color: 'var(--text-quaternary)' }}>
                  Responses JSON
                </label>
                <textarea
                  className="w-full min-h-[110px] px-2 py-1.5 text-[11px] font-mono rounded-md"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  value={customResponsesText}
                  onChange={e => setCustomResponsesText(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Policy mode: <span className="font-mono">{policyMode}</span>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Surface: <span className="font-mono">{effectiveLayoutSurface || 'flat'}</span>
              </div>
              <p className="mt-2 mb-0 text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                User view fixes orientation to vertical and keeps branch edge labels visible for business conditions.
              </p>
              <button
                type="button"
                className="mt-2 text-[11px] font-medium px-2 py-1 rounded-md"
                style={{
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveUserStep(null)}
              >
                Show all steps
              </button>
            </div>
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
          <div
            className="w-full mobile:w-80 shrink-0 p-3 rounded-lg text-left"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
          >
            <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Inspector
            </div>
            {viewMode === 'user' && (
              <div className="mb-3 space-y-2">
                <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  State delta
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Current role: <span className="font-mono">{selectedQuestionRole ?? '—'}</span>
                </div>
                <div>
                  <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Now visible
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {simulation.nowVisible.length > 0 ? (
                      simulation.nowVisible.slice(0, 8).map(id => (
                        <li key={`now-visible-${id}`}>{renderUserQuestionInline(id)}</li>
                      ))
                    ) : (
                      <li>—</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Added next
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {simulation.addedNext.length > 0 ? (
                      simulation.addedNext.map(id => <li key={`added-next-${id}`}>{renderUserQuestionInline(id)}</li>)
                    ) : (
                      <li>—</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Removed next
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {simulation.removedNext.length > 0 ? (
                      simulation.removedNext.map(id => (
                        <li key={`removed-next-${id}`}>{renderUserQuestionInline(id)}</li>
                      ))
                    ) : (
                      <li>—</li>
                    )}
                  </ul>
                </div>
                <details
                  className="rounded-md px-2 py-1.5"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  <summary className="cursor-pointer text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    Next options cards
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {simulation.nextIds.length === 0 ? (
                      <div className="text-[11px]" style={{ color: 'var(--text-quaternary)' }}>
                        No direct next options from current question.
                      </div>
                    ) : (
                      simulation.nextIds.map(id => {
                        const node = layoutGraph.nodes.find(
                          n => n.type === 'studioQuestion' && n.data.kind === 'question' && n.data.questionId === id,
                        );
                        const status =
                          tracePlan && tracePlan.required.includes(id)
                            ? 'required'
                            : tracePlan && tracePlan.visible.includes(id)
                              ? 'visible'
                              : tracePlan && tracePlan.hidden.includes(id)
                                ? 'hidden'
                                : tracePlan && tracePlan.deferred.includes(id)
                                  ? 'deferred'
                                  : 'unknown';
                        const pill = statusPill(status);
                        return (
                          <button
                            key={`next-card-${id}`}
                            type="button"
                            className="w-full text-left rounded-md px-2 py-1.5"
                            style={{
                              border: `1px solid ${pill.border}`,
                              backgroundColor: pill.bg,
                              color: 'var(--text-secondary)',
                              cursor: node ? 'pointer' : 'not-allowed',
                              opacity: node ? 1 : 0.6,
                            }}
                            disabled={!node}
                            onClick={() => {
                              if (!node) return;
                              setSelectedId(node.id);
                              setPathHistory(prev => (prev[prev.length - 1] === node.id ? prev : [...prev, node.id]));
                            }}
                          >
                            <div className="text-[11px] font-medium">{shortUserLabel(id)}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                              id: <span className="font-mono">{id}</span> ·{' '}
                              status: {status}
                              <span
                                className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded"
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
                </details>
                <div>
                  <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Dependencies
                  </div>
                  <div className="text-[11px] space-y-2" style={{ color: 'var(--text-secondary)' }}>
                    <div>
                      <strong>Depends on:</strong>{' '}
                      {selectedDependencies.dependsOn.length > 0
                        ? selectedDependencies.dependsOn.map(shortUserLabel).join(', ')
                        : '—'}
                    </div>
                    <div>
                      <strong>Enables:</strong>{' '}
                      {selectedDependencies.enables.length > 0
                        ? selectedDependencies.enables.slice(0, 8).map(shortUserLabel).join(', ')
                        : '—'}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Why
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {selectedWhy.length === 0 ? (
                      <li>No reasons yet.</li>
                    ) : (
                      selectedWhy.slice(0, 6).map((r, i) => (
                        <li key={`${r.code}-${i}`}>
                          <span className="font-mono">{r.code}</span>
                          {r.detail ? ` — ${r.detail}` : ''}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <details
                  className="rounded-md px-2 py-1.5"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  <summary className="cursor-pointer text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    Full question list ({allQuestionsForReview.length})
                  </summary>
                  <button
                    type="button"
                    className="mt-2 text-[11px] font-medium px-2 py-1 rounded-md"
                    style={{
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-canvas)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                    onClick={async () => {
                      const lines = allQuestionsForReview.map((q, i) => `${i + 1}. ${q.id} | ${q.status} | ${q.label}`);
                      await navigator.clipboard.writeText(lines.join('\n'));
                    }}
                  >
                    Copy list for verification
                  </button>
                  <div className="mt-2 max-h-56 overflow-auto space-y-1">
                    {allQuestionsForReview.map(q => {
                      const pill = statusPill(q.status);
                      return (
                        <div
                          key={`all-q-${q.id}`}
                          className="text-[11px] rounded px-2 py-1"
                          style={{ border: `1px solid ${pill.border}`, backgroundColor: pill.bg, color: pill.fg }}
                        >
                          <span className="font-mono">{q.id}</span> — {q.label}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            )}
            {inspectorBody}
            {viewMode === 'logic' && (
              <>
                <div
                  className="mt-4 pt-3 text-[10px] font-semibold uppercase mb-2 border-t"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-tertiary)' }}
                >
                  Interactive trace
                </div>
                {traceError ? (
                  <p className="text-xs m-0 text-red-500">{traceError}</p>
                ) : (
                  <p className="text-[10px] m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                    Card left stripe = policy + canon; outer ring = trace outcome. Ring: amber required · blue visible · purple
                    deferred · gray hidden (JSON + resolver).
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
