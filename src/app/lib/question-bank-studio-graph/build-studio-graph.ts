import type { Edge, Node } from '@xyflow/react';
import {
  getQuestionBankPromptLabel,
  getQuestionBankSchemaMeta,
  QUESTION_BANK_V1_STUBS,
  QUESTION_FEEDS_BY_ID,
} from '@glc/intake-core';
import type { IntakeQuestionStub } from '@glc/intake-core';
import {
  getPolicyOverlayForQuestion,
  participatesInPolicyMode,
} from '../question-bank-studio-policy';
import { resolveStudioPolicyBaseVisual } from '../question-bank-studio-node-style';
import { applyDagreLayoutStudioGraph } from './dagre-layout';
import { buildLayoutQuestionIndex } from './layout-question-index';
import { studioPolicyBadgeList, truncateStudioGraphLabel } from './label-utils';
import { partitionStubsByCanonSection } from './section-partition';
import { longestStructurePathToTargets } from './structure-depth';
import { STUDIO_GRAPH_COPY_EN } from './studio-graph-copy.en';
import {
  STUDIO_GRAPH_LABEL_TRUNCATE,
  STUDIO_GRAPH_ROOT_ID,
  getStudioQuestionNodeDimensions,
} from './studio-graph-layout.config';
import {
  STUDIO_GRAPH_DOMAIN_ACCENT_FALLBACK_HEX,
  STUDIO_GRAPH_DOMAIN_ACCENT_HEX,
} from './studio-graph-visual.config';
import { primaryFeedDomain } from './primary-feed-domain';
import { STUDIO_PRE_BRIEF_IDENTITY_FIELD_IDS } from './pre-brief-identity-ids';
import { computeBranchTopology } from './topology';
import type { BuildStudioGraphInput, BuildStudioGraphResult, StudioAnyNodeData } from './types';

function accentForDomains(domains: string[]): string | undefined {
  const first = domains[0];
  return first
    ? (STUDIO_GRAPH_DOMAIN_ACCENT_HEX[first] ?? STUDIO_GRAPH_DOMAIN_ACCENT_FALLBACK_HEX)
    : undefined;
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
    id: STUDIO_GRAPH_ROOT_ID,
    type: 'studioRoot',
    position: { x: 0, y: 0 },
    data: { kind: 'root', label: STUDIO_GRAPH_COPY_EN.rootLabel },
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
          label: STUDIO_GRAPH_COPY_EN.domainClusterLabel(dk.replace(/_/g, ' '), nq),
          questionCount: nq,
        },
      });
      edges.push({
        id: `e-${STUDIO_GRAPH_ROOT_ID}-${domId}`,
        source: STUDIO_GRAPH_ROOT_ID,
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
        label: collapsed
          ? STUDIO_GRAPH_COPY_EN.sectionCollapsedLabel(sectionKey)
          : STUDIO_GRAPH_COPY_EN.sectionLabel(sectionKey),
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
        id: `e-${STUDIO_GRAPH_ROOT_ID}-${sectionId}`,
        source: STUDIO_GRAPH_ROOT_ID,
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
          shortLabel: truncateStudioGraphLabel(fullLabel),
          fullLabel,
          sectionKey,
          priority: meta?.priority ?? stub.priority,
          branchCondition: stub.branchCondition,
          participatesPolicy,
          policyBadges: studioPolicyBadgeList(overlay),
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
        const label = group[0]?.label ?? STUDIO_GRAPH_COPY_EN.defaultStepLabel(stepIndex);
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
            label: truncateStudioGraphLabel(label, STUDIO_GRAPH_LABEL_TRUNCATE.layoutStep),
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

  if (input.policyMode === 'pre_brief') {
    let i = 0;
    for (const iid of STUDIO_PRE_BRIEF_IDENTITY_FIELD_IDS) {
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
        id: `e-${STUDIO_GRAPH_ROOT_ID}-id-${i++}`,
        source: STUDIO_GRAPH_ROOT_ID,
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
    STUDIO_GRAPH_ROOT_ID,
    structureEdgesOnly.map(e => ({ source: e.source, target: e.target })),
    questionNodeIds,
  );
  const structureLeafCount = questionNodeIds.size;

  const layoutedNodes = applyDagreLayoutStudioGraph(nodes, edges, {
    orientation: input.orientation,
    questionBox: qDim,
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
