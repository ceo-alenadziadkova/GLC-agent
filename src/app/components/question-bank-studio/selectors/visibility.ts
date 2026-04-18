import type { Edge, Node } from '@xyflow/react';

import type {
  StudioAnyNodeData,
  StudioLayoutStepNodeData,
} from '../../../lib/question-bank-studio-graph';

export type UserStepLane = {
  laneId: string;
  stepIndex: number;
  label: string;
  questionIds: string[];
};

function isStudioLayoutStepNode(
  n: Node<StudioAnyNodeData>,
): n is Node<StudioLayoutStepNodeData> {
  return n.type === 'studioLayoutStep' && n.data.kind === 'layoutStep';
}

export function computeUserStepLanes(
  nodes: readonly Node<StudioAnyNodeData>[],
  edges: readonly Edge[],
): UserStepLane[] {
  const stepNodes = nodes
    .filter(isStudioLayoutStepNode)
    .sort((a, b) => a.data.stepIndex - b.data.stepIndex);

  return stepNodes.map(stepNode => {
    const questionEdges = edges.filter(
      e =>
        e.source === stepNode.id && String(e.target).startsWith('qbs-q-'),
    );

    const questionIds = questionEdges
      .map(e => {
        const qNode = nodes.find(n => n.id === e.target);
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
}

export type NodeHiddenByIdInput = {
  nodes: readonly Node<StudioAnyNodeData>[];
  edges: readonly Edge[];
  viewMode: 'user' | 'logic';
  activeUserStep: number | null;
  userStepLanes: readonly UserStepLane[];
  planFootprintOnly: boolean;
  planIdSet: Set<string> | null;
  policySliceOnly: boolean;
  branchFocusQuestionIds: Set<string> | null;
};

export function computeNodeHiddenById(
  input: NodeHiddenByIdInput,
): Map<string, boolean> {
  const {
    nodes,
    edges,
    viewMode,
    activeUserStep,
    userStepLanes,
    planFootprintOnly,
    planIdSet,
    policySliceOnly,
    branchFocusQuestionIds,
  } = input;

  const flags = new Map<string, boolean>();
  for (const n of nodes) flags.set(n.id, false);

  const hideQuestion = (questionId: string, participatesPolicy: boolean): boolean => {
    if (planFootprintOnly && planIdSet && !planIdSet.has(questionId)) return true;
    if (policySliceOnly && !participatesPolicy) return true;
    if (branchFocusQuestionIds && !branchFocusQuestionIds.has(questionId)) return true;
    return false;
  };

  // Base: mark question/identity nodes based on filters; keep structural nodes visible.
  for (const n of nodes) {
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
      if (branchFocusQuestionIds && !branchFocusQuestionIds.has(n.data.questionId)) h = true;
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

  // Section: hide when all questions inside are hidden.
  for (const n of nodes) {
    if (n.type !== 'studioSection' || n.data.kind !== 'section') continue;
    const sectionKey = n.data.sectionKey;
    const qs = nodes.filter(
      x => x.type === 'studioQuestion' && x.data.kind === 'question' && x.data.sectionKey === sectionKey,
    );
    if (qs.length === 0) continue;
    const anyVisible = qs.some(q => !flags.get(q.id));
    flags.set(n.id, !anyVisible);
  }

  // Layout step: hide if there are no children or all children are hidden.
  for (const n of nodes) {
    if (n.type !== 'studioLayoutStep') continue;
    const childQEdges = edges.filter(
      e => e.source === n.id && String(e.target).startsWith('qbs-q-'),
    );
    if (childQEdges.length === 0) {
      flags.set(n.id, true);
      continue;
    }
    const allChildrenHidden = childQEdges.every(e => flags.get(e.target as string));
    flags.set(n.id, allChildrenHidden);
  }

  // Domain cluster: hide if there are no sections or all sections are hidden.
  for (const n of nodes) {
    if (n.type !== 'studioDomainCluster') continue;
    const sectionEdges = edges.filter(
      e => e.source === n.id && String(e.target).startsWith('qbs-section-'),
    );
    if (sectionEdges.length === 0) {
      flags.set(n.id, true);
      continue;
    }
    const allSectionsHidden = sectionEdges.every(e => flags.get(e.target as string));
    flags.set(n.id, allSectionsHidden);
  }

  // User-mode: additionally hide everything except current step lane neighborhood.
  if (viewMode === 'user' && activeUserStep !== null) {
    const lane = userStepLanes.find(s => s.stepIndex === activeUserStep);
    const allowedQuestions = new Set(lane?.questionIds ?? []);

    for (const n of nodes) {
      if (n.type === 'studioQuestion' && n.data.kind === 'question') {
        if (!allowedQuestions.has(n.data.questionId)) flags.set(n.id, true);
      }
    }

    for (const n of nodes) {
      if (n.type === 'studioLayoutStep' && n.data.kind === 'layoutStep') {
        if (n.data.stepIndex !== activeUserStep) flags.set(n.id, true);
      }
    }
  }

  return flags;
}

export function computeCenterOnNodeId(
  nodes: readonly Node<StudioAnyNodeData>[],
  debouncedSearch: string,
): string | null {
  const q = debouncedSearch.toLowerCase();
  if (q.length === 0) return null;

  for (const n of nodes) {
    if (n.type === 'studioQuestion' && n.data.kind === 'question') {
      const d = n.data;
      if (d.questionId.toLowerCase().includes(q) || d.fullLabel.toLowerCase().includes(q)) return n.id;
    }
    if (n.type === 'studioSection' && n.data.kind === 'section') {
      const d = n.data;
      if (d.sectionKey.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)) return n.id;
    }
    if (n.type === 'studioDomainCluster' && n.data.kind === 'domainCluster') {
      const d = n.data;
      if (d.domainKey.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)) return n.id;
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
}

