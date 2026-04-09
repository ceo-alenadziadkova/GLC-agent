import { describe, expect, it } from 'vitest';
import { buildQuestionBankStudioGraph } from '../question-bank-studio-graph';
import { buildStudioMapSvg } from '../question-bank-studio-map-export';

describe('question-bank-studio-map-export', () => {
  it('buildStudioMapSvg returns SVG with title and bank root label', () => {
    const g = buildQuestionBankStudioGraph({ policyMode: 'full', showBranchEdges: false });
    const svg = buildStudioMapSvg(g.nodes, g.edges, { title: 'QBS export', theme: 'light' });
    expect(svg.startsWith('<svg xmlns=')).toBe(true);
    expect(svg).toContain('QBS export');
    expect(svg).toContain('Question bank');
  });

  it('omits branch edges when includeBranchEdges is false', () => {
    const g = buildQuestionBankStudioGraph({ policyMode: 'full', showBranchEdges: true });
    const withBranch = buildStudioMapSvg(g.nodes, g.edges, { includeBranchEdges: true });
    const noBranch = buildStudioMapSvg(g.nodes, g.edges, { includeBranchEdges: false });
    const branchLineCount = (s: string) => (s.match(/<line/g) ?? []).length;
    expect(branchLineCount(noBranch)).toBeLessThan(branchLineCount(withBranch));
  });
});
