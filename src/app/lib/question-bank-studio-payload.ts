/**
 * Serializable Question Bank Studio payloads (JSON-safe) for phase1 structure and phase2 policy/branch.
 * React Flow positions/styles are omitted — consumers map to their own renderer or API.
 */
import { QUESTION_BANK_VERSION, QUESTION_BANK_V1_STUBS } from '../../../server/src/intake/question-bank';
import {
  buildQuestionBankStudioGraph,
  computeBranchTopology,
  type BuildStudioGraphInput,
  type StudioAnyNodeData,
  type StudioGraphStats,
} from './question-bank-studio-graph';
import type { StudioPolicyMode } from './question-bank-studio-policy';
import type { StudioLayoutSurfaceKey } from './question-bank-studio-graph';

export const STUDIO_BANK_PAYLOAD_SCHEMA_PHASE1 = 'glc.question-bank-studio.payload.phase1.v1' as const;
export const STUDIO_BANK_PAYLOAD_SCHEMA_PHASE2 = 'glc.question-bank-studio.payload.phase2.v1' as const;

export type StudioPayloadStructureEdgeV1 = {
  id: string;
  kind:
    | 'root_to_section'
    | 'root_to_domain'
    | 'domain_to_section'
    | 'section_to_question'
    | 'root_to_identity'
    | 'section_to_layout_step'
    | 'layout_step_to_question';
  sourceId: string;
  targetId: string;
};

export type StudioPayloadNodeRootV1 = {
  kind: 'root';
  id: string;
  label: string;
};

export type StudioPayloadNodeSectionV1 = {
  kind: 'section';
  id: string;
  sectionKey: string;
  questionCount: number;
  collapsed: boolean;
};

export type StudioPayloadNodeQuestionV1 = {
  kind: 'question';
  id: string;
  questionId: string;
  sectionKey: string;
  label: string;
  priority: string;
};

export type StudioPayloadNodeIdentityV1 = {
  kind: 'identity';
  id: string;
  fieldId: string;
};

export type StudioPayloadNodeLayoutStepV1 = {
  kind: 'layoutStep';
  id: string;
  surfaceKey: StudioLayoutSurfaceKey;
  sectionKey: string;
  stepIndex: number;
  label: string;
  questionCount: number;
};

export type StudioPayloadNodeDomainClusterV1 = {
  kind: 'domainCluster';
  id: string;
  domainKey: string;
  label: string;
  questionCount: number;
};

export type StudioPayloadNodeV1 =
  | StudioPayloadNodeRootV1
  | StudioPayloadNodeSectionV1
  | StudioPayloadNodeQuestionV1
  | StudioPayloadNodeIdentityV1
  | StudioPayloadNodeLayoutStepV1
  | StudioPayloadNodeDomainClusterV1;

export type StudioPayloadBranchTopologyV1 = {
  edges: { from: string; to: string; branchCondition?: string }[];
  maxDepth: number;
  rootCount: number;
  leafCount: number;
};

/** Phase 1: canon hierarchy only (no branch overlay edges in structureEdges). */
export type QuestionBankStudioPayloadPhase1V1 = {
  schemaId: typeof STUDIO_BANK_PAYLOAD_SCHEMA_PHASE1;
  bankVersion: string;
  policyMode: StudioPolicyMode;
  /** When set, structure includes layout wizard steps for that surface. */
  layoutSurface: StudioLayoutSurfaceKey | null;
  clusterByPrimaryDomain: boolean;
  sectionKeysInOrder: string[];
  stats: StudioGraphStats;
  branchTopology: StudioPayloadBranchTopologyV1;
  nodes: StudioPayloadNodeV1[];
  structureEdges: StudioPayloadStructureEdgeV1[];
};

export type QuestionBankStudioPayloadPhase2V1 = Omit<QuestionBankStudioPayloadPhase1V1, 'schemaId'> & {
  schemaId: typeof STUDIO_BANK_PAYLOAD_SCHEMA_PHASE2;
  showBranchEdges: boolean;
  colorByDomain: boolean;
  branchEdges: {
    id: string;
    fromQuestionId: string;
    toQuestionId: string;
    branchCondition: string;
  }[];
  /** Policy overlay per bank id (explanations: IntakePlan.reasonsById at runtime). */
  questionPolicyById: Record<
    string,
    {
      participatesPolicy: boolean;
      policyBadges: string[];
      branchCondition?: string;
      feedDomains: string[];
    }
  >;
};

function structureEdgeKind(
  sourceId: string,
  targetId: string,
  rootId: string,
): StudioPayloadStructureEdgeV1['kind'] {
  if (sourceId === rootId && targetId.startsWith('qbs-id-')) return 'root_to_identity';
  if (sourceId === rootId && targetId.startsWith('qbs-domain-')) return 'root_to_domain';
  if (sourceId === rootId) return 'root_to_section';
  if (sourceId.startsWith('qbs-domain-') && targetId.startsWith('qbs-section-')) return 'domain_to_section';
  if (sourceId.startsWith('qbs-section-') && targetId.startsWith('qbs-ls-')) return 'section_to_layout_step';
  if (sourceId.startsWith('qbs-ls-') && targetId.startsWith('qbs-q-')) return 'layout_step_to_question';
  return 'section_to_question';
}

function serializeNode(n: { id: string; data: StudioAnyNodeData }): StudioPayloadNodeV1 {
  const d = n.data;
  if (d.kind === 'root') return { kind: 'root', id: n.id, label: d.label };
  if (d.kind === 'section')
    return {
      kind: 'section',
      id: n.id,
      sectionKey: d.sectionKey,
      questionCount: d.questionCount,
      collapsed: d.collapsed,
    };
  if (d.kind === 'layoutStep')
    return {
      kind: 'layoutStep',
      id: n.id,
      surfaceKey: d.surfaceKey,
      sectionKey: d.sectionKey,
      stepIndex: d.stepIndex,
      label: d.label,
      questionCount: d.questionCount,
    };
  if (d.kind === 'domainCluster')
    return {
      kind: 'domainCluster',
      id: n.id,
      domainKey: d.domainKey,
      label: d.label,
      questionCount: d.questionCount,
    };
  if (d.kind === 'identity') return { kind: 'identity', id: n.id, fieldId: d.questionId };
  return {
    kind: 'question',
    id: n.id,
    questionId: d.questionId,
    sectionKey: d.sectionKey,
    label: d.fullLabel,
    priority: d.priority,
  };
}

type Phase1BuildInput = Pick<
  BuildStudioGraphInput,
  'policyMode' | 'collapsedSectionKeys' | 'layoutSurface' | 'clusterByPrimaryDomain'
>;

/**
 * Minimal tree: root → sections → questions (+ pre_brief identity). Branch topology listed separately.
 */
export function buildQuestionBankStudioPayloadPhase1(input: Phase1BuildInput): QuestionBankStudioPayloadPhase1V1 {
  const g = buildQuestionBankStudioGraph({
    policyMode: input.policyMode,
    collapsedSectionKeys: input.collapsedSectionKeys,
    showBranchEdges: false,
    colorByDomain: false,
    layoutSurface: input.layoutSurface ?? null,
    clusterByPrimaryDomain: Boolean(input.clusterByPrimaryDomain),
  });

  const rootId = 'qbs-root';
  const structureEdges: StudioPayloadStructureEdgeV1[] = g.edges
    .filter(e => !String(e.id).startsWith('e-branch'))
    .map(e => ({
      id: String(e.id),
      kind: structureEdgeKind(e.source, e.target, rootId),
      sourceId: e.source,
      targetId: e.target,
    }));

  const topo = computeBranchTopology(QUESTION_BANK_V1_STUBS);
  const branchTopology: StudioPayloadBranchTopologyV1 = {
    edges: topo.edges,
    maxDepth: topo.maxDepth,
    rootCount: topo.rootCount,
    leafCount: topo.leafCount,
  };

  return {
    schemaId: STUDIO_BANK_PAYLOAD_SCHEMA_PHASE1,
    bankVersion: QUESTION_BANK_VERSION,
    policyMode: input.policyMode,
    layoutSurface: input.layoutSurface ?? null,
    clusterByPrimaryDomain: Boolean(input.clusterByPrimaryDomain),
    sectionKeysInOrder: [...g.sectionKeys],
    stats: g.stats,
    branchTopology,
    nodes: g.nodes.map(n => serializeNode(n)),
    structureEdges,
  };
}

/**
 * Phase 2: phase1-equivalent nodes/structure + branch canvas edges (when built with showBranchEdges) and policy snapshot per question.
 */
export function buildQuestionBankStudioPayloadPhase2(
  input: BuildStudioGraphInput,
): QuestionBankStudioPayloadPhase2V1 {
  const g = buildQuestionBankStudioGraph(input);
  const rootId = 'qbs-root';
  const structureEdges: StudioPayloadStructureEdgeV1[] = g.edges
    .filter(e => !String(e.id).startsWith('e-branch'))
    .map(e => ({
      id: String(e.id),
      kind: structureEdgeKind(e.source, e.target, rootId),
      sourceId: e.source,
      targetId: e.target,
    }));

  const topo = computeBranchTopology(QUESTION_BANK_V1_STUBS);
  const branchTopology: StudioPayloadBranchTopologyV1 = {
    edges: topo.edges,
    maxDepth: topo.maxDepth,
    rootCount: topo.rootCount,
    leafCount: topo.leafCount,
  };

  const branchEdges = g.edges
    .filter(e => String(e.id).startsWith('e-branch'))
    .map(e => ({
      id: String(e.id),
      fromQuestionId: e.source.replace(/^qbs-q-/, ''),
      toQuestionId: e.target.replace(/^qbs-q-/, ''),
      branchCondition: String(e.label ?? ''),
    }));

  const questionPolicyById: QuestionBankStudioPayloadPhase2V1['questionPolicyById'] = {};
  for (const n of g.nodes) {
    if (n.type === 'studioQuestion' && n.data.kind === 'question') {
      const d = n.data;
      questionPolicyById[d.questionId] = {
        participatesPolicy: d.participatesPolicy,
        policyBadges: [...d.policyBadges],
        branchCondition: d.branchCondition,
        feedDomains: [...d.feedDomains],
      };
    }
  }

  return {
    schemaId: STUDIO_BANK_PAYLOAD_SCHEMA_PHASE2,
    bankVersion: QUESTION_BANK_VERSION,
    policyMode: input.policyMode,
    layoutSurface: input.layoutSurface ?? null,
    clusterByPrimaryDomain: Boolean(input.clusterByPrimaryDomain),
    sectionKeysInOrder: [...g.sectionKeys],
    stats: g.stats,
    branchTopology,
    nodes: g.nodes.map(n => serializeNode(n)),
    structureEdges,
    showBranchEdges: input.showBranchEdges,
    colorByDomain: Boolean(input.colorByDomain),
    branchEdges,
    questionPolicyById,
  };
}
