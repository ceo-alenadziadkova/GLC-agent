import { useEffect, useMemo, useRef, useState } from 'react';

import type { IntakePlan } from '../../../../server/src/intake/core/types';
import { QUESTION_BANK_V1_STUBS } from '../../../../server/src/intake/question-bank';
import { computeBranchUpstreamIds } from './intake-trace-branch-links';

interface NodePos {
  id: string;
  x: number;
  y: number;
  layer: number;
}

interface Edge {
  from: string;
  to: string;
}

interface GraphModel {
  edges: Edge[];
  layers: string[][];
  upstreamById: Map<string, string[]>;
  downstreamById: Map<string, string[]>;
}

function statusFor(id: string, plan: IntakePlan): 'required' | 'visible' | 'deferred' | 'hidden' | 'other' {
  if (plan.required.includes(id)) return 'required';
  if (plan.visible.includes(id)) return 'visible';
  if (plan.deferred.includes(id)) return 'deferred';
  if (plan.hidden.includes(id)) return 'hidden';
  return 'other';
}

function statusColors(status: ReturnType<typeof statusFor>): { fill: string; stroke: string; text: string } {
  switch (status) {
    case 'required':
      return { fill: '#7c4a03', stroke: '#f59e0b', text: '#fef3c7' };
    case 'visible':
      return { fill: '#0b3f5c', stroke: '#38bdf8', text: '#e0f2fe' };
    case 'deferred':
      return { fill: '#3b1f59', stroke: '#a78bfa', text: '#f3e8ff' };
    case 'hidden':
      return { fill: '#2f2f34', stroke: '#71717a', text: '#f4f4f5' };
    default:
      return { fill: '#1f2937', stroke: '#94a3b8', text: '#e2e8f0' };
  }
}

function buildGraph(ids: string[]): GraphModel {
  const idSet = new Set(ids);
  const upstreamById = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  const downstreamById = new Map<string, string[]>();

  for (const id of ids) {
    const upstream = computeBranchUpstreamIds(id, QUESTION_BANK_V1_STUBS).filter(u => idSet.has(u));
    upstreamById.set(id, upstream);
    indegree.set(id, upstream.length);
    if (!downstreamById.has(id)) downstreamById.set(id, []);
  }

  for (const [to, ups] of upstreamById.entries()) {
    for (const from of ups) {
      const arr = downstreamById.get(from) ?? [];
      arr.push(to);
      downstreamById.set(from, arr);
    }
  }

  const edges: Edge[] = [];
  for (const [to, ups] of upstreamById.entries()) {
    for (const from of ups) edges.push({ from, to });
  }

  const roots = ids.filter(id => (indegree.get(id) ?? 0) === 0).sort((a, b) => a.localeCompare(b));
  const queue = [...roots];
  const layerById = new Map<string, number>();
  for (const id of queue) layerById.set(id, 0);

  const q = [...queue];
  while (q.length > 0) {
    const current = q.shift()!;
    const currentLayer = layerById.get(current) ?? 0;
    const children = (downstreamById.get(current) ?? []).sort((a, b) => a.localeCompare(b));
    for (const child of children) {
      const nextLayer = Math.max(layerById.get(child) ?? 0, currentLayer + 1);
      layerById.set(child, nextLayer);
      indegree.set(child, (indegree.get(child) ?? 0) - 1);
      if ((indegree.get(child) ?? 0) === 0) q.push(child);
    }
  }

  // cycles or disconnected remnants: place after max layer
  const maxKnownLayer = Math.max(0, ...layerById.values());
  for (const id of ids) {
    if (!layerById.has(id)) layerById.set(id, maxKnownLayer + 1);
  }

  const groups = new Map<number, string[]>();
  for (const id of ids) {
    const layer = layerById.get(id) ?? 0;
    const arr = groups.get(layer) ?? [];
    arr.push(id);
    groups.set(layer, arr);
  }

  const layers = [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, values]) => values.sort((a, b) => a.localeCompare(b)));

  return { edges, layers, upstreamById, downstreamById };
}

function shortLabel(label: string): string {
  if (label.length <= 42) return label;
  return `${label.slice(0, 39)}...`;
}

function collectAncestors(
  startId: string,
  upstreamById: Map<string, string[]>,
): Set<string> {
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const p of upstreamById.get(current) ?? []) stack.push(p);
  }
  return seen;
}

function collectDescendants(
  startId: string,
  downstreamById: Map<string, string[]>,
): Set<string> {
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const c of downstreamById.get(current) ?? []) stack.push(c);
  }
  return seen;
}

function collectDescendantsDepth(
  startId: string,
  downstreamById: Map<string, string[]>,
  depth: number,
): Set<string> {
  const seen = new Set<string>([startId]);
  const queue: Array<{ id: string; d: number }> = [{ id: startId, d: 0 }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.d >= depth) continue;
    for (const c of downstreamById.get(current.id) ?? []) {
      if (seen.has(c)) continue;
      seen.add(c);
      queue.push({ id: c, d: current.d + 1 });
    }
  }
  return seen;
}

function sectionKey(id: string): string {
  const c = id[0]?.toUpperCase();
  return /[A-Z]/.test(c ?? '') ? c! : '#';
}

export function IntakeTraceEdgeGraph({
  plan,
  resolveLabel,
  resolveCanonLabel,
  resolveDraftLabel,
  focusId,
  onFocusIdChange,
}: {
  plan: IntakePlan;
  resolveLabel: (id: string) => string;
  resolveCanonLabel: (id: string) => string;
  resolveDraftLabel: (id: string) => string | null;
  focusId: string;
  onFocusIdChange: (id: string) => void;
}) {
  const UI_PREFS_STORAGE_KEY = 'intake_trace_edge_graph_ui_prefs_v1';
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ dragging: boolean; x: number; y: number; left: number; top: number }>({
    dragging: false,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
  });
  const [pathOnlyMode, setPathOnlyMode] = useState(false);
  const [collapsedRoots, setCollapsedRoots] = useState<Set<string>>(() => new Set());
  const [downstreamDepth, setDownstreamDepth] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [showBeforeAfter, setShowBeforeAfter] = useState(true);
  const [pinnedFocusId, setPinnedFocusId] = useState<string | null>(null);
  const [baReviewMode, setBaReviewMode] = useState(false);
  const [highOnly, setHighOnly] = useState(false);
  const [scoringMode, setScoringMode] = useState<'strict' | 'normal' | 'lenient'>('normal');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(UI_PREFS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        pathOnlyMode: boolean;
        downstreamDepth: number;
        searchQuery: string;
        showBeforeAfter: boolean;
        baReviewMode: boolean;
        highOnly: boolean;
        scoringMode: 'strict' | 'normal' | 'lenient';
      }>;
      if (typeof parsed.pathOnlyMode === 'boolean') setPathOnlyMode(parsed.pathOnlyMode);
      if (typeof parsed.downstreamDepth === 'number') {
        setDownstreamDepth(Math.max(0, Math.min(4, Math.round(parsed.downstreamDepth))));
      }
      if (typeof parsed.searchQuery === 'string') setSearchQuery(parsed.searchQuery);
      if (typeof parsed.showBeforeAfter === 'boolean') setShowBeforeAfter(parsed.showBeforeAfter);
      if (typeof parsed.baReviewMode === 'boolean') setBaReviewMode(parsed.baReviewMode);
      if (typeof parsed.highOnly === 'boolean') setHighOnly(parsed.highOnly);
      if (
        parsed.scoringMode === 'strict' ||
        parsed.scoringMode === 'normal' ||
        parsed.scoringMode === 'lenient'
      ) {
        setScoringMode(parsed.scoringMode);
      }
    } catch {
      // no-op when storage is unavailable
    }
  }, []);

  useEffect(() => {
    try {
      const payload = {
        pathOnlyMode,
        downstreamDepth,
        searchQuery,
        showBeforeAfter,
        baReviewMode,
        highOnly,
        scoringMode,
      };
      window.localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // no-op when storage is unavailable
    }
  }, [pathOnlyMode, downstreamDepth, searchQuery, showBeforeAfter, baReviewMode, highOnly, scoringMode]);

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

  const { edges, layers, upstreamById, downstreamById } = useMemo(() => buildGraph(ids), [ids]);

  const pathSet = useMemo(
    () => (focusId ? collectAncestors(focusId, upstreamById) : new Set<string>(ids)),
    [focusId, upstreamById, ids],
  );

  const collapsedHidden = useMemo(() => {
    const hidden = new Set<string>();
    for (const rootId of collapsedRoots) {
      const desc = collectDescendants(rootId, downstreamById);
      for (const id of desc) {
        if (id !== rootId) hidden.add(id);
      }
    }
    return hidden;
  }, [collapsedRoots, downstreamById]);

  const visibleNodeSet = useMemo(() => {
    const base = new Set(ids);
    if (pathOnlyMode) {
      for (const id of [...base]) {
        if (!pathSet.has(id)) base.delete(id);
      }
    }
    for (const id of collapsedHidden) base.delete(id);
    const activeFocus = pinnedFocusId ?? focusId;
    if (selectedIds.size > 0) {
      const allowed = new Set<string>();
      for (const sid of selectedIds) {
        for (const id of collectAncestors(sid, upstreamById)) allowed.add(id);
        for (const id of collectDescendantsDepth(sid, downstreamById, downstreamDepth)) allowed.add(id);
      }
      for (const id of [...base]) {
        if (!allowed.has(id)) base.delete(id);
      }
    } else if (activeFocus) {
      const allowed = new Set<string>([
        ...collectAncestors(activeFocus, upstreamById),
        ...collectDescendantsDepth(activeFocus, downstreamById, downstreamDepth),
      ]);
      for (const id of [...base]) {
        if (!allowed.has(id)) base.delete(id);
      }
    }
    for (const id of [...base]) {
      if (collapsedSections.has(sectionKey(id))) base.delete(id);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      for (const id of [...base]) {
        const label = resolveLabel(id).toLowerCase();
        if (!id.toLowerCase().includes(q) && !label.includes(q)) {
          base.delete(id);
        }
      }
    }
    return base;
  }, [
    ids,
    pathOnlyMode,
    pathSet,
    collapsedHidden,
    focusId,
    upstreamById,
    downstreamById,
    downstreamDepth,
    collapsedSections,
    searchQuery,
    resolveLabel,
    selectedIds,
    pinnedFocusId,
  ]);

  const visibleEdges = useMemo(
    () => edges.filter(e => visibleNodeSet.has(e.from) && visibleNodeSet.has(e.to)),
    [edges, visibleNodeSet],
  );

  const visibleLayers = useMemo(() => {
    const next = layers
      .map(layerIds => layerIds.filter(id => visibleNodeSet.has(id)))
      .filter(layerIds => layerIds.length > 0);
    return next.length > 0 ? next : [ids.slice(0, 1)];
  }, [layers, visibleNodeSet, ids]);

  const sections = useMemo(() => {
    const groups = new Map<string, number>();
    for (const id of ids) {
      const k = sectionKey(id);
      groups.set(k, (groups.get(k) ?? 0) + 1);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ids]);

  const selectedReasons = useMemo(() => {
    const out: Array<{
      id: string;
      status: ReturnType<typeof statusFor>;
      reasons: Array<{ layer: string; state: string; code: string; detail?: string }>;
    }> = [];
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
    const items: Array<{ id: string; severity: 'high' | 'medium'; reasons: string[]; score: number }> = [];
    const penaltyMultiplier = scoringMode === 'strict' ? 1.25 : scoringMode === 'lenient' ? 0.8 : 1;
    const longThreshold = scoringMode === 'strict' ? 80 : scoringMode === 'lenient' ? 105 : 90;
    const shortThreshold = scoringMode === 'strict' ? 14 : scoringMode === 'lenient' ? 10 : 12;
    for (const id of ids) {
      const canon = resolveCanonLabel(id).trim();
      const draft = resolveDraftLabel(id)?.trim() ?? '';
      const effective = (draft || canon).trim();
      const reasons: string[] = [];
      let penalty = 0;
      if (effective.length > longThreshold) reasons.push(`Very long wording (>${longThreshold} chars)`);
      if (effective.length > longThreshold) penalty += 25;
      if (effective.length < shortThreshold) reasons.push(`Too short wording (<${shortThreshold} chars)`);
      if (effective.length < shortThreshold) penalty += 20;
      if (/[/|]/.test(effective)) reasons.push('Contains separators (/ or |), hard to read');
      if (/[/|]/.test(effective)) penalty += 10;
      if (/\b(other|misc|n\/a|na)\b/i.test(effective)) reasons.push('Potentially vague wording');
      if (/\b(other|misc|n\/a|na)\b/i.test(effective)) penalty += 20;
      if (!/[?]$/.test(effective)) reasons.push('No question mark at the end');
      if (!/[?]$/.test(effective)) penalty += 8;
      if (draft && draft === canon) penalty += 2;
      const tunedPenalty = Math.round(penalty * penaltyMultiplier);
      const score = Math.max(0, Math.min(100, 100 - tunedPenalty));
      if (reasons.length > 0) {
        items.push({
          id,
          severity: reasons.length >= 3 ? 'high' : 'medium',
          reasons,
          score,
        });
      }
    }
    return items.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
      if (a.score !== b.score) return a.score - b.score;
      return a.id.localeCompare(b.id);
    });
  }, [ids, resolveCanonLabel, resolveDraftLabel, scoringMode]);

  const visibleBaItems = useMemo(
    () => (highOnly ? baReviewItems.filter(item => item.severity === 'high') : baReviewItems),
    [baReviewItems, highOnly],
  );

  const averageWordingScore = useMemo(() => {
    if (baReviewItems.length === 0) return 100;
    const total = baReviewItems.reduce((sum, item) => sum + item.score, 0);
    return Math.round((total / baReviewItems.length) * 10) / 10;
  }, [baReviewItems]);

  const nodeWidth = 220;
  const nodeHeight = 62;
  const hGap = 70;
  const vGap = 22;
  const marginX = 24;
  const marginY = 28;

  const layout = useMemo(() => {
    const positions = new Map<string, NodePos>();
    const maxRows = Math.max(1, ...visibleLayers.map(layer => layer.length));
    const width =
      marginX * 2 + Math.max(1, visibleLayers.length) * nodeWidth + Math.max(0, visibleLayers.length - 1) * hGap;
    const height = marginY * 2 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * vGap;

    visibleLayers.forEach((layerIds, layerIndex) => {
      const x = marginX + layerIndex * (nodeWidth + hGap);
      const totalLayerHeight = layerIds.length * nodeHeight + Math.max(0, layerIds.length - 1) * vGap;
      const startY = marginY + Math.max(0, (height - marginY * 2 - totalLayerHeight) / 2);
      layerIds.forEach((id, rowIndex) => {
        const y = startY + rowIndex * (nodeHeight + vGap);
        positions.set(id, { id, x, y, layer: layerIndex });
      });
    });
    return { positions, width, height };
  }, [visibleLayers]);

  const edgeStroke = '#64748b';
  const focusEdgeStroke = '#38bdf8';

  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intake-branch-graph-${focusId || 'all'}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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

  const onCanvasMouseDown: React.MouseEventHandler<HTMLDivElement> = e => {
    const box = containerRef.current;
    if (!box) return;
    if (e.button !== 0) return;
    // do not start drag when clicking interactive controls inside SVG groups
    const target = e.target as HTMLElement;
    if (target.closest('g[role="button"]')) return;
    dragStateRef.current = {
      dragging: true,
      x: e.clientX,
      y: e.clientY,
      left: box.scrollLeft,
      top: box.scrollTop,
    };
  };

  const onCanvasMouseMove: React.MouseEventHandler<HTMLDivElement> = e => {
    const box = containerRef.current;
    const drag = dragStateRef.current;
    if (!box || !drag.dragging) return;
    box.scrollLeft = drag.left - (e.clientX - drag.x);
    box.scrollTop = drag.top - (e.clientY - drag.y);
  };

  const onCanvasMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    dragStateRef.current.dragging = false;
  };

  const resetPreferences = () => {
    setPathOnlyMode(false);
    setDownstreamDepth(2);
    setSearchQuery('');
    setShowBeforeAfter(true);
    setBaReviewMode(false);
    setHighOnly(false);
    setScoringMode('normal');
    try {
      window.localStorage.removeItem(UI_PREFS_STORAGE_KEY);
    } catch {
      // no-op when storage is unavailable
    }
  };

  const exportBaReviewMarkdown = () => {
    const lines: string[] = [];
    lines.push('# Intake wording BA review');
    lines.push('');
    lines.push(`- Generated at: ${new Date().toISOString()}`);
    lines.push(`- Items: ${visibleBaItems.length}`);
    lines.push(`- Average quality score: ${averageWordingScore}/100`);
    lines.push(`- Filter: ${highOnly ? 'high severity only' : 'all severities'}`);
    lines.push(`- Scoring mode: ${scoringMode}`);
    lines.push('');
    lines.push('## Findings');
    lines.push('');
    if (visibleBaItems.length === 0) {
      lines.push('No findings for the current filter.');
    } else {
      for (const item of visibleBaItems) {
        lines.push(`### ${item.id}`);
        lines.push(`- Link: [Focus ${item.id}](#${item.id})`);
        lines.push(`- Severity: ${item.severity}`);
        lines.push(`- Quality score: ${item.score}/100`);
        lines.push(`- Label: ${resolveLabel(item.id)}`);
        lines.push('- Reasons:');
        for (const r of item.reasons) lines.push(`  - ${r}`);
        lines.push('');
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'intake-wording-ba-review.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (s: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  useEffect(() => {
    if (!focusId) return;
    const box = containerRef.current;
    const pos = layout.positions.get(focusId);
    if (!box || !pos) return;
    const targetLeft = Math.max(0, pos.x - 40);
    const targetTop = Math.max(0, pos.y - 70);
    box.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
  }, [focusId, layout.positions]);

  if (ids.length === 0) {
    return <p className="text-sm text-[var(--glc-muted)]">No nodes available for the graph.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-[var(--glc-muted)]">
        Graph view of question branching. Click a node to focus it and inspect dependencies.
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`glc-btn-secondary text-xs px-2 py-1 ${pathOnlyMode ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
          onClick={() => setPathOnlyMode(v => !v)}
        >
          {pathOnlyMode ? 'Show full graph' : 'Show root -> focused path only'}
        </button>
        <button
          type="button"
          className={`glc-btn-secondary text-xs px-2 py-1 ${collapsedRoots.has(focusId) ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
          onClick={toggleCollapseFocused}
          disabled={!focusId}
        >
          {collapsedRoots.has(focusId) ? 'Expand focused subtree' : 'Collapse focused subtree'}
        </button>
        <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={expandAll}>
          Expand all subtrees
        </button>
        <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={exportSvg}>
          Export .svg
        </button>
        <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={clearSelection}>
          Clear multi-select
        </button>
        <button
          type="button"
          className={`glc-btn-secondary text-xs px-2 py-1 ${pinnedFocusId ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
          onClick={pinOrUnpin}
          disabled={!focusId}
        >
          {pinnedFocusId === focusId ? 'Unpin path' : 'Pin focused path'}
        </button>
        <button
          type="button"
          className={`glc-btn-secondary text-xs px-2 py-1 ${showBeforeAfter ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
          onClick={() => setShowBeforeAfter(v => !v)}
        >
          {showBeforeAfter ? 'Hide before/after' : 'Show before/after'}
        </button>
        <button
          type="button"
          className={`glc-btn-secondary text-xs px-2 py-1 ${baReviewMode ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
          onClick={() => setBaReviewMode(v => !v)}
        >
          {baReviewMode ? 'Hide BA review' : 'Show BA review'}
        </button>
        <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={resetPreferences}>
          Reset preferences
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--glc-muted)]">Search node</span>
          <input
            type="search"
            className="glc-input font-mono text-xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="id or text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--glc-muted)]">Downstream depth from focus</span>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={downstreamDepth}
            onChange={e => setDownstreamDepth(Number(e.target.value))}
          />
          <span className="text-[var(--glc-muted)]">{downstreamDepth}</span>
        </label>
        <div className="text-xs rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-2">
          <div className="font-medium mb-1">Legend</div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <span>required</span><span className="text-amber-300">amber</span>
            <span>visible</span><span className="text-sky-300">blue</span>
            <span>deferred</span><span className="text-violet-300">violet</span>
            <span>hidden</span><span className="text-zinc-300">gray</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {sections.map(([s, count]) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleSection(s)}
            className={`glc-btn-secondary text-[11px] px-2 py-1 ${collapsedSections.has(s) ? 'opacity-60' : ''}`}
          >
            Section {s} ({count}) {collapsedSections.has(s) ? 'collapsed' : 'shown'}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <div
        ref={containerRef}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        className="w-full overflow-auto rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface)] cursor-grab active:cursor-grabbing"
      >
        <svg ref={svgRef} width={layout.width} height={layout.height} role="img" aria-label="Intake branching edge graph">
          <defs>
            <marker id="trace-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={edgeStroke} />
            </marker>
            <marker id="trace-arrow-focus" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={focusEdgeStroke} />
            </marker>
          </defs>

          {visibleEdges.map((edge, index) => {
            const from = layout.positions.get(edge.from);
            const to = layout.positions.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + nodeWidth;
            const y1 = from.y + nodeHeight / 2;
            const x2 = to.x;
            const y2 = to.y + nodeHeight / 2;
            const cx1 = x1 + hGap * 0.55;
            const cx2 = x2 - hGap * 0.55;
            const activeFocus = pinnedFocusId ?? focusId;
            const focused =
              edge.from === activeFocus ||
              edge.to === activeFocus ||
              selectedIds.has(edge.from) ||
              selectedIds.has(edge.to);
            return (
              <path
                key={`${edge.from}-${edge.to}-${index}`}
                d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={focused ? focusEdgeStroke : edgeStroke}
                strokeWidth={focused ? 2.4 : 1.4}
                opacity={focused ? 0.95 : 0.55}
                markerEnd={focused ? 'url(#trace-arrow-focus)' : 'url(#trace-arrow)'}
              />
            );
          })}

          {[...visibleNodeSet].map(id => {
            const pos = layout.positions.get(id);
            if (!pos) return null;
            const status = statusFor(id, plan);
            const colors = statusColors(status);
            const activeFocus = pinnedFocusId ?? focusId;
            const focused = id === activeFocus;
            const selected = selectedIds.has(id);
            const label = resolveLabel(id);
            const draftLabel = resolveDraftLabel(id);
            const canonLabel = resolveCanonLabel(id);
            return (
              <g
                key={id}
                style={{ cursor: 'pointer' }}
                onClick={e => {
                  onFocusIdChange(id);
                  if (e.shiftKey || e.metaKey || e.ctrlKey) {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  }
                }}
                role="button"
                aria-label={`Focus question ${id}`}
              >
                <rect
                  x={pos.x}
                  y={pos.y}
                  rx={10}
                  ry={10}
                  width={nodeWidth}
                  height={nodeHeight}
                  fill={colors.fill}
                  stroke={selected ? '#34d399' : focused ? '#22d3ee' : colors.stroke}
                  strokeWidth={selected ? 3 : focused ? 2.6 : 1.4}
                />
                <text x={pos.x + 10} y={pos.y + 20} fill={colors.text} fontSize={11} fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">
                  {id}
                </text>
                {showBeforeAfter && draftLabel ? (
                  <>
                    <text x={pos.x + 10} y={pos.y + 34} fill={colors.text} fontSize={9.6} fontFamily="Inter, system-ui, sans-serif" opacity={0.75}>
                      before: {shortLabel(canonLabel)}
                    </text>
                    <text x={pos.x + 10} y={pos.y + 47} fill={colors.text} fontSize={9.6} fontFamily="Inter, system-ui, sans-serif">
                      after: {shortLabel(draftLabel)}
                    </text>
                    <text x={pos.x + 10} y={pos.y + 58} fill={colors.text} opacity={0.85} fontSize={9.2} fontFamily="Inter, system-ui, sans-serif">
                      {status}
                    </text>
                  </>
                ) : (
                  <>
                    <text x={pos.x + 10} y={pos.y + 39} fill={colors.text} fontSize={10.5} fontFamily="Inter, system-ui, sans-serif">
                      {shortLabel(label)}
                    </text>
                    <text x={pos.x + 10} y={pos.y + 54} fill={colors.text} opacity={0.85} fontSize={9.5} fontFamily="Inter, system-ui, sans-serif">
                      {status}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <aside className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
        <div className="text-xs font-semibold mb-2">Почему скрыт/показан (выбранный путь)</div>
        <div className="text-[11px] text-[var(--glc-muted)] mb-2">
          Клик по узлу = фокус. Shift/Cmd/Ctrl + клик = мультивыбор подграфа.
        </div>
        {selectedReasons.length === 0 ? (
          <div className="text-xs text-[var(--glc-muted)]">Выберите узел, чтобы увидеть объяснение.</div>
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-auto">
            {selectedReasons.map(item => (
              <div key={item.id} className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface)] p-2">
                <div className="text-xs font-mono">{item.id}</div>
                <div className="text-xs text-[var(--glc-muted)] mb-1">{resolveLabel(item.id)}</div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--glc-muted)] mb-1">status: {item.status}</div>
                {item.reasons.length === 0 ? (
                  <div className="text-xs text-[var(--glc-muted)]">No reason rows</div>
                ) : (
                  <ul className="space-y-1 text-xs font-mono">
                    {item.reasons.map((r, idx) => (
                      <li key={`${item.id}-${r.code}-${idx}`}>
                        {r.layer}/{r.state}/{r.code}
                        {r.detail ? <span className="text-[var(--glc-muted)]"> — {r.detail}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {baReviewMode && (
          <div className="mt-4 pt-3 border-t border-[var(--glc-border)]">
            <div className="text-xs font-semibold mb-2">BA review: wording candidates</div>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="text-[11px] text-[var(--glc-muted)]">Average quality: {averageWordingScore}/100</span>
              <div className="flex flex-wrap gap-1">
                {(['strict', 'normal', 'lenient'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    className={`glc-btn-secondary text-[11px] px-2 py-1 ${scoringMode === mode ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
                    onClick={() => setScoringMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`glc-btn-secondary text-[11px] px-2 py-1 ${highOnly ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
                onClick={() => setHighOnly(v => !v)}
              >
                {highOnly ? 'Show all severities' : 'Show high severity only'}
              </button>
              <button
                type="button"
                className="glc-btn-secondary text-[11px] px-2 py-1"
                onClick={exportBaReviewMarkdown}
              >
                Export review .md
              </button>
            </div>
            {visibleBaItems.length === 0 ? (
              <div className="text-xs text-[var(--glc-muted)]">No obvious wording issues by heuristics.</div>
            ) : (
              <ul className="space-y-2 max-h-[280px] overflow-auto">
                {visibleBaItems.map(item => (
                  <li key={item.id} className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface)] p-2">
                    <button
                      type="button"
                      className="text-left w-full"
                      onClick={() => {
                        onFocusIdChange(item.id);
                        setSelectedIds(new Set([item.id]));
                      }}
                    >
                      <div className="text-xs font-mono">{item.id}</div>
                      <div className="text-[11px] text-[var(--glc-muted)]">{resolveLabel(item.id)}</div>
                      <div className={`text-[10px] uppercase tracking-wide ${item.severity === 'high' ? 'text-rose-300' : 'text-amber-300'}`}>
                        {item.severity}
                      </div>
                      <div className="text-[10px] text-[var(--glc-muted)]">quality: {item.score}/100</div>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--glc-muted)]">
                        {item.reasons.map(r => (
                          <li key={`${item.id}-${r}`}>- {r}</li>
                        ))}
                      </ul>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}
