import { describe, expect, it } from 'vitest';

import { computeNodeHiddenById } from './visibility';

const qNode = (
  id: string,
  questionId: string,
  sectionKey: string,
  participatesPolicy: boolean,
) =>
  ({
    id,
    type: 'studioQuestion',
    data: { kind: 'question', questionId, sectionKey, participatesPolicy },
  }) as any;

const sectionNode = (id: string, sectionKey: string) =>
  ({
    id,
    type: 'studioSection',
    data: { kind: 'section', sectionKey },
  }) as any;

const identityNode = (id: string, questionId: string, participatesPolicy: boolean) =>
  ({
    id,
    type: 'studioIdentity',
    data: { kind: 'identity', questionId, participatesPolicy },
  }) as any;

const layoutStepNode = (id: string, stepIndex: number, label: string) =>
  ({
    id,
    type: 'studioLayoutStep',
    data: { kind: 'layoutStep', stepIndex, label },
  }) as any;

const domainClusterNode = (id: string) =>
  ({
    id,
    type: 'studioDomainCluster',
    data: { kind: 'domainCluster', domainKey: 'x', label: 'x' },
  }) as any;

const edge = (source: string, target: string) =>
  ({ source, target }) as any;

describe('question-bank-studio visibility selector', () => {
  it('hides questions by planFootprintOnly and preserves section when any child is visible', () => {
    const q1 = qNode('qbs-q-1', 'Q1', 's1', true);
    const q2 = qNode('qbs-q-2', 'Q2', 's1', true);
    const s1 = sectionNode('qbs-section-s1', 's1');

    const hidden = computeNodeHiddenById({
      nodes: [q1, q2, s1],
      edges: [],
      viewMode: 'logic',
      activeUserStep: null,
      userStepLanes: [],
      planFootprintOnly: true,
      planIdSet: new Set(['Q1']),
      policySliceOnly: false,
      branchFocusQuestionIds: null,
    });

    expect(hidden.get('qbs-q-1')).toBe(false);
    expect(hidden.get('qbs-q-2')).toBe(true);
    expect(hidden.get('qbs-section-s1')).toBe(false);
  });

  it('hides identity nodes by branchFocusQuestionIds', () => {
    const q1 = qNode('qbs-q-1', 'Q1', 's1', true);
    const q2 = qNode('qbs-q-2', 'Q2', 's1', true);
    const i1 = identityNode('id-1', 'Q1', true);
    const i2 = identityNode('id-2', 'Q2', true);

    const hidden = computeNodeHiddenById({
      nodes: [q1, q2, i1, i2],
      edges: [],
      viewMode: 'logic',
      activeUserStep: null,
      userStepLanes: [],
      planFootprintOnly: false,
      planIdSet: null,
      policySliceOnly: false,
      branchFocusQuestionIds: new Set(['Q1']),
    });

    expect(hidden.get('qbs-q-1')).toBe(false);
    expect(hidden.get('qbs-q-2')).toBe(true);
    expect(hidden.get('id-1')).toBe(false);
    expect(hidden.get('id-2')).toBe(true);
  });

  it('hides layout step when all child questions are hidden', () => {
    const step = layoutStepNode('step-0', 0, 'Step 1');
    const q1 = qNode('qbs-q-1', 'Q1', 's1', false);
    const q2 = qNode('qbs-q-2', 'Q2', 's1', false);
    const edges = [edge('step-0', 'qbs-q-1'), edge('step-0', 'qbs-q-2')];

    const hidden = computeNodeHiddenById({
      nodes: [step, q1, q2],
      edges,
      viewMode: 'logic',
      activeUserStep: null,
      userStepLanes: [],
      planFootprintOnly: false,
      planIdSet: null,
      policySliceOnly: true,
      branchFocusQuestionIds: null,
    });

    expect(hidden.get('qbs-q-1')).toBe(true);
    expect(hidden.get('qbs-q-2')).toBe(true);
    expect(hidden.get('step-0')).toBe(true);
  });

  it('user-mode keeps only the active step lane neighborhood visible', () => {
    const step0 = layoutStepNode('step-0', 0, 'Step 1');
    const step1 = layoutStepNode('step-1', 1, 'Step 2');
    const q1 = qNode('qbs-q-1', 'Q1', 's1', true);
    const q2 = qNode('qbs-q-2', 'Q2', 's1', true);

    const edges = [edge('step-0', 'qbs-q-1'), edge('step-1', 'qbs-q-2')];

    const hidden = computeNodeHiddenById({
      nodes: [step0, step1, q1, q2],
      edges,
      viewMode: 'user',
      activeUserStep: 0,
      userStepLanes: [
        { laneId: 'lane-0', stepIndex: 0, label: 'Step 1', questionIds: ['Q1'] },
        { laneId: 'lane-1', stepIndex: 1, label: 'Step 2', questionIds: ['Q2'] },
      ],
      planFootprintOnly: false,
      planIdSet: null,
      policySliceOnly: false,
      branchFocusQuestionIds: null,
    });

    expect(hidden.get('qbs-q-1')).toBe(false);
    expect(hidden.get('qbs-q-2')).toBe(true);
    expect(hidden.get('step-0')).toBe(false);
    expect(hidden.get('step-1')).toBe(true);
  });

  it('hides domain cluster when all referenced sections are hidden', () => {
    const cluster = domainClusterNode('cluster-0');
    const s1 = sectionNode('qbs-section-1', 's1');
    const s2 = sectionNode('qbs-section-2', 's2');
    const q1 = qNode('qbs-q-1', 'Q1', 's1', false);
    const q2 = qNode('qbs-q-2', 'Q2', 's2', false);

    const edges = [
      edge('cluster-0', 'qbs-section-1'),
      edge('cluster-0', 'qbs-section-2'),
      // Also connect each section to its questions indirectly via sectionKey matching
    ];

    const hidden = computeNodeHiddenById({
      nodes: [cluster, s1, s2, q1, q2],
      edges,
      viewMode: 'logic',
      activeUserStep: null,
      userStepLanes: [],
      planFootprintOnly: false,
      planIdSet: null,
      policySliceOnly: true,
      branchFocusQuestionIds: null,
    });

    expect(hidden.get('qbs-section-1')).toBe(true);
    expect(hidden.get('qbs-section-2')).toBe(true);
    expect(hidden.get('cluster-0')).toBe(true);
  });
});

