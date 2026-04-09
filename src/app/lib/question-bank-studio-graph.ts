import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import { computeBranchUpstreamIds } from '../components/intake/intake-trace-branch-links';
import layoutRulesArtifact from '../../../server/src/intake/artifacts/layout-rules-1.1.0.json';
import type { LayoutRulesV1 } from '../../../server/src/intake/core/layout-types';
import {
  getQuestionBankPromptLabel,
  getQuestionBankSchemaMeta,
  QUESTION_BANK_V1_STUBS,
  QUESTION_FEEDS_BY_ID,
} from '../../../server/src/intake/question-bank';
import type { IntakeQuestionStub } from '../../../server/src/intake/types';
import { QUESTION_FEED_ROLES } from '../../../server/src/intake/question-feed-roles';
import {
  getPolicyOverlayForQuestion,
  participatesInPolicyMode,
  type StudioPolicyMode,
} from './question-bank-studio-policy';
import { resolveStudioPolicyBaseVisual, type StudioPolicyBaseVisualKind } from './question-bank-studio-node-style';

const LAYOUT_RULES = layoutRulesArtifact as LayoutRulesV1;

export type StudioLayoutSurfaceKey = keyof LayoutRulesV1['surfaces'];

export type StudioGraphStats = {
  questionCount: number;
  sectionCount: number;
  branchEdgeCount: number;
  structureEdgeCount: number;
  branchMaxDepth: number;
  branchRootCount: number;
  branchLeafCount: number;
  /** Longest root-to-question path along structure edges (schema + optional layout steps). */
  structureMaxDepth: number;
  /** Question nodes in the current structure view (respects section collapse). */
  structureLeafCount: number;
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
  /** Policy + canon priority chrome (card left stripe). */
  policyBaseVisual: StudioPolicyBaseVisualKind;
  /** Dagre / canvas box (matches viewDensity). */
  layoutSize: { w: number; h: number };
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

/** Wizard step from `layout-rules` (presentation only; canon remains section-scoped). */
export type StudioLayoutStepNodeData = {
  kind: 'layoutStep';
  surfaceKey: StudioLayoutSurfaceKey;
  sectionKey: string;
  stepIndex: number;
  label: string;
  questionCount: number;
};

/** Primary agent/domain slice cluster (question-feed-roles `primary[0]`). */
export type StudioDomainClusterNodeData = {
  kind: 'domainCluster';
  domainKey: string;
  label: string;
  questionCount: number;
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
  | StudioLayoutStepNodeData
  | StudioDomainClusterNodeData
  | StudioRootNodeData
  | StudioIdentityNodeData;

const ROOT_ID = 'qbs-root';

const DIM = {
  root: { w: 200, h: 40 },
  section: { w: 220, h: 44 },
  layoutStep: { w: 210, h: 48 },
  domainCluster: { w: 220, h: 44 },
  identity: { w: 240, h: 52 },
};

export function getStudioQuestionNodeDimensions(
  viewDensity?: 'comfortable' | 'compact',
): { w: number; h: number } {
  switch (viewDensity ?? 'comfortable') {
    case 'compact':
      return { w: 240, h: 70 };
    case 'comfortable':
    default:
      return { w: 280, h: 82 };
  }
}

function primaryFeedDomain(questionId: string): string {
  const roles = QUESTION_FEED_ROLES[questionId];
  if (roles?.primary?.length) return roles.primary[0];
  return 'unassigned';
}

function buildLayoutQuestionIndex(surface: StudioLayoutSurfaceKey): Map<string, { stepIndex: number; label: string }> {
  const steps = LAYOUT_RULES.surfaces[surface].steps;
  const map = new Map<string, { stepIndex: number; label: string }>();
  steps.forEach((step, stepIndex) => {
    const label = step.label?.trim() ? step.label : `Step ${stepIndex + 1}`;
    for (const qid of step.questionIds) {
      if (!map.has(qid)) map.set(qid, { stepIndex, label });
    }
  });
  return map;
}

function longestStructurePathToTargets(
  rootId: string,
  edgeList: { source: string; target: string }[],
  targetIds: Set<string>,
): number {
  const depth = new Map<string, number>();
  depth.set(rootId, 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edgeList) {
      const pd = depth.get(e.source);
      if (pd === undefined) continue;
      const next = pd + 1;
      const cur = depth.get(e.target);
      if (cur === undefined || next > cur) {
        depth.set(e.target, next);
        changed = true;
      }
    }
  }
  let max = 0;
  for (const id of targetIds) max = Math.max(max, depth.get(id) ?? 0);
  return max;
}

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

/**
 * Multiset keys for branch edges (`from` → `to` question ids) — same canon as Studio payload `branchEdges`.
 */
export function canonBranchEdgeKeySet(stubs: readonly IntakeQuestionStub[]): Set<string> {
  const { edges } = computeBranchTopology(stubs);
  return new Set(edges.map(e => `${e.from}\t${e.to}`));
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
  /**
   * When set, inserts `layout-rules` wizard steps between section and question nodes for that surface.
   * Unmapped bank ids stay linked directly from the section.
   */
  layoutSurface?: StudioLayoutSurfaceKey | null;
  /**
   * Inserts primary feed-domain clusters from `question-feed-roles.ts` between root and sections.
   */
  clusterByPrimaryDomain?: boolean;
  /** Question card size + layout spacing (dagre node box). */
  viewDensity?: 'comfortable' | 'compact';
};

export type BuildStudioGraphResult = {
  nodes: Node<StudioAnyNodeData>[];
  edges: Edge[];
  stats: StudioGraphStats;
  /** Section keys in first-seen order (for collapse UI). */
  sectionKeys: string[];
};

/**
 * Canon section order and membership from `question-bank.v1.json` stub order (single source for Studio tree).
 */
export function partitionStubsByCanonSection(stubs: readonly IntakeQuestionStub[]): {
  sectionKeysInOrder: string[];
  sectionMembers: Map<string, IntakeQuestionStub[]>;
} {
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
  return { sectionKeysInOrder: sectionOrder, sectionMembers };
}

/** Bank question ids on the Studio canvas (unordered). */
export function collectStudioGraphQuestionIds(nodes: readonly Node<StudioAnyNodeData>[]): Set<string> {
  const out = new Set<string>();
  for (const n of nodes) {
    if (n.type === 'studioQuestion' && n.data.kind === 'question') {
      out.add(n.data.questionId);
    }
  }
  return out;
}

export function buildQuestionBankStudioGraph(input: BuildStudioGraphInput): BuildStudioGraphResult {
  const stubs = QUESTION_BANK_V1_STUBS;
  const topo = computeBranchTopology(stubs);
  const qDim = getStudioQuestionNodeDimensions(input.viewDensity);

  const { sectionKeysInOrder: sectionOrder, sectionMembers } = partitionStubsByCanonSection(stubs);

  const nodes: Node<StudioAnyNodeData>[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: ROOT_ID,
    type: 'studioRoot',
    position: { x: 0, y: 0 },
    data: { kind: 'root', label: 'Question bank (canon)' },
  });

  const clusterDomains = Boolean(input.clusterByPrimaryDomain);
  const domainQuestionCounts = new Map<string, number>();
  if (clusterDomains) {
    for (const stub of stubs) {
      const dk = primaryFeedDomain(stub.id);
      domainQuestionCounts.set(dk, (domainQuestionCounts.get(dk) ?? 0) + 1);
    }
    const domainOrder = [...domainQuestionCounts.keys()].sort((a, b) => a.localeCompare(b));
    for (const dk of domainOrder) {
      const domId = `qbs-domain-${dk}`;
      const nq = domainQuestionCounts.get(dk) ?? 0;
      nodes.push({
        id: domId,
        type: 'studioDomainCluster',
        position: { x: 0, y: 0 },
        data: {
          kind: 'domainCluster',
          domainKey: dk,
          label: `${dk.replace(/_/g, ' ')} (${nq})`,
          questionCount: nq,
        },
      });
      edges.push({
        id: `e-${ROOT_ID}-${domId}`,
        source: ROOT_ID,
        target: domId,
        style: { stroke: 'var(--border-default)', strokeWidth: 1 },
      });
    }
  }

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
    if (clusterDomains) {
      const domainsForSection = new Set<string>();
      for (const stub of members) {
        domainsForSection.add(primaryFeedDomain(stub.id));
      }
      for (const dk of domainsForSection) {
        const domId = `qbs-domain-${dk}`;
        edges.push({
          id: `e-${domId}-${sectionId}`,
          source: domId,
          target: sectionId,
          style: { stroke: 'var(--border-default)', strokeWidth: 1 },
        });
      }
    } else {
      edges.push({
        id: `e-${ROOT_ID}-${sectionId}`,
        source: ROOT_ID,
        target: sectionId,
        style: { stroke: 'var(--border-default)', strokeWidth: 1 },
      });
    }

    if (collapsed) continue;

    const pushQuestion = (stub: IntakeQuestionStub) => {
      const meta = getQuestionBankSchemaMeta(stub.id);
      const fullLabel = getQuestionBankPromptLabel(stub.id) ?? meta?.label ?? stub.id;
      const overlay = getPolicyOverlayForQuestion(
        stub.id,
        input.policyMode,
        meta?.priority ?? stub.priority,
      );
      const participatesPolicy = participatesInPolicyMode(stub.id, input.policyMode);
      const policyBaseVisual = resolveStudioPolicyBaseVisual(overlay);
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
          policyBaseVisual,
          layoutSize: { w: qDim.w, h: qDim.h },
          feedDomains: domainLabels,
          domainAccent: input.colorByDomain ? accentForDomains(domainLabels) : undefined,
        },
      });
      return qid;
    };

    const layoutSurface = input.layoutSurface ?? null;
    if (!layoutSurface) {
      for (const stub of members) {
        const qid = pushQuestion(stub);
        edges.push({
          id: `e-${sectionId}-${qid}`,
          source: sectionId,
          target: qid,
          style: { stroke: 'var(--border-default)', strokeWidth: 1 },
        });
      }
    } else {
      const layoutIdx = buildLayoutQuestionIndex(layoutSurface);
      const withStep: { stub: IntakeQuestionStub; stepIndex: number; label: string }[] = [];
      const orphans: IntakeQuestionStub[] = [];
      for (const stub of members) {
        const lm = layoutIdx.get(stub.id);
        if (lm) withStep.push({ stub, stepIndex: lm.stepIndex, label: lm.label });
        else orphans.push(stub);
      }
      const byStep = new Map<number, { stub: IntakeQuestionStub; label: string }[]>();
      for (const row of withStep) {
        if (!byStep.has(row.stepIndex)) byStep.set(row.stepIndex, []);
        byStep.get(row.stepIndex)!.push({ stub: row.stub, label: row.label });
      }
      const sortedSteps = [...byStep.keys()].sort((a, b) => a - b);
      for (const stepIndex of sortedSteps) {
        const group = byStep.get(stepIndex)!;
        const label = group[0]?.label ?? `Step ${stepIndex + 1}`;
        const lsId = `qbs-ls-${layoutSurface}-${sectionKey}-${stepIndex}`;
        nodes.push({
          id: lsId,
          type: 'studioLayoutStep',
          position: { x: 0, y: 0 },
          data: {
            kind: 'layoutStep',
            surfaceKey: layoutSurface,
            sectionKey,
            stepIndex,
            label: truncateLabel(label, 40),
            questionCount: group.length,
          },
        });
        edges.push({
          id: `e-${sectionId}-${lsId}`,
          source: sectionId,
          target: lsId,
          style: { stroke: 'var(--border-default)', strokeWidth: 1, strokeDasharray: '3 2' },
        });
        for (const { stub } of group) {
          const qid = pushQuestion(stub);
          edges.push({
            id: `e-${lsId}-${qid}`,
            source: lsId,
            target: qid,
            style: { stroke: 'var(--border-default)', strokeWidth: 1 },
          });
        }
      }
      for (const stub of orphans) {
        const qid = pushQuestion(stub);
        edges.push({
          id: `e-${sectionId}-${qid}`,
          source: sectionId,
          target: qid,
          style: { stroke: 'var(--border-default)', strokeWidth: 1 },
        });
      }
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

  const structureEdgesOnly = edges.filter(e => !String(e.id).startsWith('e-branch'));
  const structureEdgeCount = structureEdgesOnly.length;
  const questionNodeIds = new Set(
    nodes.filter(n => n.type === 'studioQuestion').map(n => n.id),
  );
  const structureMaxDepth = longestStructurePathToTargets(
    ROOT_ID,
    structureEdgesOnly.map(e => ({ source: e.source, target: e.target })),
    questionNodeIds,
  );
  const structureLeafCount = questionNodeIds.size;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 28, ranksep: 72, marginx: 20, marginy: 20 });

  for (const n of nodes) {
    const dim =
      n.type === 'studioRoot'
        ? DIM.root
        : n.type === 'studioSection'
          ? DIM.section
          : n.type === 'studioLayoutStep'
            ? DIM.layoutStep
            : n.type === 'studioDomainCluster'
              ? DIM.domainCluster
              : n.type === 'studioIdentity'
                ? DIM.identity
                : qDim;
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
          : n.type === 'studioLayoutStep'
            ? DIM.layoutStep
            : n.type === 'studioDomainCluster'
              ? DIM.domainCluster
              : n.type === 'studioIdentity'
                ? DIM.identity
                : qDim;
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
      structureMaxDepth,
      structureLeafCount,
    },
  };
}
