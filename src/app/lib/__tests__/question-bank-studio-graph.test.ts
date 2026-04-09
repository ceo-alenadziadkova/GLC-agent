import { describe, expect, it } from 'vitest';
import { buildQuestionBankStudioGraph } from '../question-bank-studio-graph';

describe('question-bank-studio-graph', () => {
  it('includes domain cluster nodes when clusterByPrimaryDomain is on', () => {
    const g = buildQuestionBankStudioGraph({
      policyMode: 'full',
      showBranchEdges: false,
      clusterByPrimaryDomain: true,
    });
    const domains = g.nodes.filter(n => n.type === 'studioDomainCluster');
    expect(domains.length).toBeGreaterThan(0);
    expect(g.edges.some(e => e.source === 'qbs-root' && e.target.startsWith('qbs-domain-'))).toBe(true);
    expect(
      g.edges.some(e => e.source.startsWith('qbs-domain-') && e.target.startsWith('qbs-section-')),
    ).toBe(true);
  });

  it('omits domain clusters by default', () => {
    const g = buildQuestionBankStudioGraph({
      policyMode: 'full',
      showBranchEdges: false,
    });
    expect(g.nodes.some(n => n.type === 'studioDomainCluster')).toBe(false);
    expect(g.edges.some(e => e.target.startsWith('qbs-domain-'))).toBe(false);
  });
});
