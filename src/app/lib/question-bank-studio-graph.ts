import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import { computeBranchUpstreamIds } from '../components/intake/intake-trace-branch-links';
import {
  getQuestionBankPromptLabel,
  getQuestionBankSchemaMeta,
  QUESTION_BANK_V1_STUBS,
  QUESTION_FEEDS_BY_ID,
} from '../../../server/src/intake/question-bank';
import type { IntakeQuestionStub } from '../../../server/src/intake/types';
import {
  getPolicyOverlayForQuestion,
  participatesInPolicyMode,
  type StudioPolicyMode,
} from './question-bank-studio-policy';

export type StudioGraphStats = {
  questionCount: number;
  sectionCount: number;
  branchEdgeCount: number;
  structureEdgeCount: number;
  branchMaxDepth: number;
  branchRootCount: number;
  branchLeafCount: number;
};

export type StudioQuestionNodeData = {
  kind: 'question';
  questionId: string;
  shortLabel: string;
  fullLabel: string;
  sectionKey: string;
  priority: string;
  branchCondition?: string;
  participatesPolicy: boolean;
  policyBadges: string[];
  /** UI: lower opacity when true and participatesPolicy is false */
  applyPolicyDim: boolean;
  /** Domains that consume this id (QUESTION_BANK §5). */
  feedDomains: string[];
  /** Left border accent when color-by-domain is on (hex). */
  domainAccent?: string;
};

export type StudioSectionNodeData = {
  kind: 'section';
  sectionKey: string;
  label: string;
  questionCount: number;
  /** Questions hidden on canvas (collapsed branch). */
  collapsed: boolean;
};

export type StudioRootNodeData = {
  kind: 'root';
  label: string;
};

export type StudioIdentityNodeData = {
  kind: 'identity';
  questionId: string;
  shortLabel: string;
  participatesPolicy: boolean;
};

export type StudioAnyNodeData =
  | StudioQuestionNodeData
  | StudioSectionNodeData
  | StudioRootNodeData
  | StudioIdentityNodeData;

const ROOT_ID = 'qbs-root';

const DIM = {
  root: { w: 200, h: 40 },
  section: { w: 220, h: 44 },
  question: { w: 260, h: 76 },
  identity: { w: 240, h: 52 },
};

function policyBadgeList(overlay: ReturnType<typeof getPolicyOverlayForQuestion>): string[] {
  const b: string[] = [];
  if (overlay.syntheticRequired) b.push('synthetic required');
  if (overlay.requiredAlways) b.push('policy required');
  if (overlay.requiredIfVisible) b.push('required if visible');
  if (overlay.policyRequirednessNone) b.push('policy: none');
  return b;
}

function longestBranchPathDepth(
  ids: string[],
  edgeList: { from: string; to: string }[],
): number {
  const depth = new Map<string, number>();
  for (const id of ids) depth.set(id, 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edgeList) {
      const pd = depth.get(e.from) ?? 0;
      const next = pd + 1;
      const cur = depth.get(e.to) ?? 0;
      if (next > cur) {
        depth.set(e.to, next);
        changed = true;
      }
    }
  }
  let max = 0;
  for (const id of ids) max = Math.max(max, depth.get(id) ?? 0);
  return max;
}

export function computeBranchTopology(stubs: readonly IntakeQuestionStub[]): {
  edges: { from: string; to: string; condition?: string }[];
  maxDepth: number;
  rootCount: number;
  leafCount: number;
} {
  const ids = stubs.map(s => s.id);
  const idSet = new Set(ids);
  const downstream = new Map<string, string[]>();
  for (const id of ids) downstream.set(id, []);

  const edges: { from: string; to: string; condition?: string }[] = [];
  for (const stub of stubs) {
    const ups = computeBranchUpstreamIds(stub.id, stubs).filter(u => idSet.has(u));
    for (const from of ups) {
      edges.push({ from, to: stub.id, condition: stub.branchCondition });
      downstream.get(from)!.push(stub.id);
    }
  }

  const indegree = new Map<string, number>();
  for (const id of ids) indegree.set(id, computeBranchUpstreamIds(id, stubs).filter(u => idSet.has(u)).length);
  const roots = ids.filter(id => (indegree.get(id) ?? 0) === 0);
  const maxDepth = longestBranchPathDepth(
    ids,
    edges.map(({ from, to }) => ({ from, to })),
  );
  const leaves = ids.filter(id => (downstream.get(id) ?? []).length === 0);

  return {
    edges,
    maxDepth,
    rootCount: roots.length,
    leafCount: leaves.length,
  };
}

function truncateLabel(s: string, max = 48): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const DOMAIN_ACCENT: Record<string, string> = {
  tech_infrastructure: '#2563eb',
  security_compliance: '#dc2626',
  seo_digital: '#16a34a',
  ux_conversion: '#9333ea',
  marketing_utp: '#ea580c',
  automation_processes: '#0891b2',
  recon: '#64748b',
  strategy: '#ca8a04',
};

function accentForDomains(domains: string[]): string | undefined {
  const first = domains[0];
  return first ? (DOMAIN_ACCENT[first] ?? '#64748b') : undefined;
}

export type BuildStudioGraphInput = {
  policyMode: StudioPolicyMode;
  showBranchEdges: boolean;
  /** Section letters/keys with collapsed question subtrees (section node stays visible). */
  collapsedSectionKeys?: ReadonlySet<string>;
  /** Tint question nodes by primary feed domain. */
  colorByDomain?: boolean;
};

export type BuildStudioGraphResult = {
  nodes: Node<StudioAnyNodeData>[];
  edges: Edge[];
  stats: StudioGraphStats;
  /** Section keys in first-seen order (for collapse UI). */
  sectionKeys: string[];
};

export function buildQuestionBankStudioGraph(input: BuildStudioGraphInput): BuildStudioGraphResult {
  const stubs = QUESTION_BANK_V1_STUBS;
  const topo = computeBranchTopology(stubs);

  const sectionOrder: string[] = [];
  const sectionMembers = new Map<string, IntakeQuestionStub[]>();
  for (const stub of stubs) {
    const meta = getQuestionBankSchemaMeta(stub.id);
    const sectionKey = meta?.section ?? '—';
    if (!sectionMembers.has(sectionKey)) {
      sectionMembers.set(sectionKey, []);
      sectionOrder.push(sectionKey);
    }
    sectionMembers.get(sectionKey)!.push(stub);
  }

  const nodes: Node<StudioAnyNodeData>[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: ROOT_ID,
    type: 'studioRoot',
    position: { x: 0, y: 0 },
    data: { kind: 'root', label: 'Question bank (canon)' },
  });

  const collapsedKeys = input.collapsedSectionKeys ?? new Set<string>();

  for (const sectionKey of sectionOrder) {
    const sectionId = `qbs-section-${sectionKey}`;
    const members = sectionMembers.get(sectionKey) ?? [];
    const collapsed = collapsedKeys.has(sectionKey);
    nodes.push({
      id: sectionId,
      type: 'studioSection',
      position: { x: 0, y: 0 },
      data: {
        kind: 'section',
        sectionKey,
        label: collapsed ? `Section ${sectionKey} (collapsed)` : `Section ${sectionKey}`,
        questionCount: members.length,
        collapsed,
      },
    });
    edges.push({
      id: `e-${ROOT_ID}-${sectionId}`,
      source: ROOT_ID,
      target: sectionId,
      style: { stroke: 'var(--border-default)', strokeWidth: 1 },
    });

    if (collapsed) continue;

    for (const stub of members) {
      const meta = getQuestionBankSchemaMeta(stub.id);
      const fullLabel = getQuestionBankPromptLabel(stub.id) ?? meta?.label ?? stub.id;
      const overlay = getPolicyOverlayForQuestion(
        stub.id,
        input.policyMode,
        meta?.priority ?? stub.priority,
      );
      const participatesPolicy = participatesInPolicyMode(stub.id, input.policyMode);
      const feeds = QUESTION_FEEDS_BY_ID[stub.id] ?? [];
      const domainLabels = feeds.map(String);
      const qid = `qbs-q-${stub.id}`;
      nodes.push({
        id: qid,
        type: 'studioQuestion',
        position: { x: 0, y: 0 },
        data: {
          kind: 'question',
          questionId: stub.id,
          shortLabel: truncateLabel(fullLabel),
          fullLabel,
          sectionKey,
          priority: meta?.priority ?? stub.priority,
          branchCondition: stub.branchCondition,
          participatesPolicy,
          policyBadges: policyBadgeList(overlay),
          applyPolicyDim: true,
          feedDomains: domainLabels,
          domainAccent: input.colorByDomain ? accentForDomains(domainLabels) : undefined,
        },
      });
      edges.push({
        id: `e-${sectionId}-${qid}`,
        source: sectionId,
        target: qid,
        style: { stroke: 'var(--border-default)', strokeWidth: 1 },
      });
    }
  }

  const nodeIdSet = new Set(nodes.map(n => n.id));
  if (input.showBranchEdges) {
    let bi = 0;
    for (const be of topo.edges) {
      const s = `qbs-q-${be.from}`;
      const t = `qbs-q-${be.to}`;
      if (!nodeIdSet.has(s) || !nodeIdSet.has(t)) continue;
      edges.push({
        id: `e-branch-${bi++}`,
        source: s,
        target: t,
        label: be.condition ?? '',
        style: { stroke: 'var(--glc-blue)', strokeWidth: 1, strokeDasharray: '4 3' },
        labelStyle: { fill: 'var(--text-tertiary)', fontSize: 10 },
      });
    }
  }

  /** Pre-brief identity fields (not bank ids) — show as attachment to root. */
  if (input.policyMode === 'pre_brief') {
    const identityIds = [
      'intake_company_website',
      'intake_company_name',
      'intake_industry',
      'intake_industry_specify',
    ];
    const idSet = new Set(identityIds);
    let i = 0;
    for (const iid of identityIds) {
      if (!idSet.has(iid)) continue;
      const nid = `qbs-id-${iid}`;
      nodes.push({
        id: nid,
        type: 'studioIdentity',
        position: { x: 0, y: 0 },
        data: {
          kind: 'identity',
          questionId: iid,
          shortLabel: iid,
          participatesPolicy: participatesInPolicyMode(iid, input.policyMode),
        },
      });
      edges.push({
        id: `e-${ROOT_ID}-id-${i++}`,
        source: ROOT_ID,
        target: nid,
        style: { stroke: 'var(--glc-orange)', strokeWidth: 1, strokeDasharray: '2 2' },
      });
    }
  }

  const identityEdgeCount =
    input.policyMode === 'pre_brief'
      ? ['intake_company_website', 'intake_company_name', 'intake_industry', 'intake_industry_specify'].length
      : 0;
  const structureEdgeCount = sectionOrder.length + stubs.length + identityEdgeCount;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 28, ranksep: 72, marginx: 20, marginy: 20 });

  for (const n of nodes) {
    const dim =
      n.type === 'studioRoot'
        ? DIM.root
        : n.type === 'studioSection'
          ? DIM.section
          : n.type === 'studioIdentity'
            ? DIM.identity
            : DIM.question;
    dagreGraph.setNode(n.id, { width: dim.w, height: dim.h });
  }
  for (const e of edges) {
    dagreGraph.setEdge(e.source, e.target);
  }
  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map(n => {
    const nodeWithPosition = dagreGraph.node(n.id);
    const dim =
      n.type === 'studioRoot'
        ? DIM.root
        : n.type === 'studioSection'
          ? DIM.section
          : n.type === 'studioIdentity'
            ? DIM.identity
            : DIM.question;
    const x = nodeWithPosition.x - dim.w / 2;
    const y = nodeWithPosition.y - dim.h / 2;
    return { ...n, position: { x, y } };
  });

  const branchEdgeCount = input.showBranchEdges
    ? edges.filter(e => e.id?.startsWith('e-branch-')).length
    : 0;

  return {
    nodes: layoutedNodes,
    edges,
    sectionKeys: sectionOrder,
    stats: {
      questionCount: stubs.length,
      sectionCount: sectionOrder.length,
      branchEdgeCount,
      structureEdgeCount,
      branchMaxDepth: topo.maxDepth,
      branchRootCount: topo.rootCount,
      branchLeafCount: topo.leafCount,
    },
  };
}
