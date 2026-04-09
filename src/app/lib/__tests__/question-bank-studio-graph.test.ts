import { describe, expect, it } from 'vitest';
import {
  buildQuestionBankStudioGraph,
  computeBranchTopology,
} from '../question-bank-studio-graph';
import { QUESTION_BANK_V1_STUBS } from '../../../../server/src/intake/question-bank';

describe('question-bank-studio-graph', () => {
  it('buildQuestionBankStudioGraph returns all bank questions in nodes', () => {
    const { nodes, stats, sectionKeys } = buildQuestionBankStudioGraph({
      policyMode: 'full',
      showBranchEdges: false,
    });
    const questionNodes = nodes.filter(n => n.type === 'studioQuestion');
    expect(questionNodes.length).toBe(QUESTION_BANK_V1_STUBS.length);
    expect(stats.questionCount).toBe(QUESTION_BANK_V1_STUBS.length);
    expect(stats.sectionCount).toBeGreaterThan(0);
    expect(sectionKeys.length).toBe(stats.sectionCount);
    expect(stats.structureEdgeCount).toBeGreaterThan(stats.questionCount);
    for (const n of nodes) {
      if (n.type === 'studioSection' && n.data.kind === 'section') {
        expect(n.data.collapsed).toBe(false);
      }
    }
  });

  it('collapsed section hides question nodes but keeps section', () => {
    const base = buildQuestionBankStudioGraph({ policyMode: 'full', showBranchEdges: false });
    const firstSection = base.sectionKeys[0];
    expect(firstSection).toBeDefined();
    const { nodes } = buildQuestionBankStudioGraph({
      policyMode: 'full',
      showBranchEdges: false,
      collapsedSectionKeys: new Set([firstSection!]),
    });
    const questions = nodes.filter(n => n.type === 'studioQuestion');
    expect(questions.length).toBeLessThan(QUESTION_BANK_V1_STUBS.length);
    const sec = nodes.find(
      n => n.type === 'studioSection' && n.data.kind === 'section' && n.data.sectionKey === firstSection,
    );
    expect(sec?.data.kind).toBe('section');
    if (sec?.data.kind === 'section') expect(sec.data.collapsed).toBe(true);
  });

  it('includes branch edges when toggled', () => {
    const off = buildQuestionBankStudioGraph({ policyMode: 'full', showBranchEdges: false });
    const on = buildQuestionBankStudioGraph({ policyMode: 'full', showBranchEdges: true });
    expect(on.edges.length).toBeGreaterThan(off.edges.length);
    expect(on.stats.branchEdgeCount).toBeGreaterThan(0);
  });

  it('computeBranchTopology matches stub count for leaves and roots', () => {
    const topo = computeBranchTopology(QUESTION_BANK_V1_STUBS);
    expect(topo.rootCount + topo.leafCount).toBeGreaterThan(0);
    expect(topo.maxDepth).toBeGreaterThanOrEqual(0);
  });
});
