import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as featureFlags from '../config/feature-flags.js';
import { FactChecker } from '../services/fact-checker.js';
import type { DomainResult } from '../types/audit.js';
import { createControlObjectV1 } from '../schemas/control-object.js';

describe('FactChecker buildControlObject — causal DAG', () => {
  const fc = new FactChecker();

  beforeEach(() => {
    vi.spyOn(featureFlags, 'isCausalDagEnabled').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function baseIssue(overrides: Partial<DomainResult['issues'][0]> = {}) {
    return {
      id: 'i1',
      severity: 'high' as const,
      title: 'Sample performance claim',
      description: 'd',
      impact: 'i',
      confidence: 'high' as const,
      evidence_refs: [{ type: 't', finding: 'f' }],
      data_source: 'inferred' as const,
      ...overrides,
    };
  }

  function verifyForCausal(result: DomainResult) {
    return fc.verify(result, 'seo_digital', {});
  }

  it('builds causal_chain when premise_refs validate against prior CO', () => {
    const priorTech = createControlObjectV1('audit-c', 'tech_infrastructure', 'normal', 'tech_infrastructure');
    priorTech.trace.claim_sources = [
      {
        claim_id: 2,
        agent: 1,
        section: 'Phase 1',
        truth_source: 'internal_metrics',
        truth_sources: ['internal_metrics'],
      },
    ];

    const result: DomainResult = {
      score: 3,
      label: 'Moderate',
      summary: 'x'.repeat(120),
      strengths: ['a'],
      weaknesses: ['b'],
      issues: [
        baseIssue({
          title: 'SEO issue',
          premise_refs: [{ phase_id: 'tech_infrastructure', claim_id: 2 }],
        }),
      ],
      quick_wins: [],
      recommendations: [{ id: 'r1', title: 't', description: 'd', priority: 'low', estimated_cost: '0', estimated_time: '1w', impact: 'i' }],
      unknown_items: [],
    };

    const verification = verifyForCausal(result);
    const co = fc.buildControlObject(
      verification,
      'seo_digital',
      'audit-c',
      3,
      'normal',
      {},
      {},
      [],
      { tech_infrastructure: priorTech },
      new Set(),
    );

    expect(co.trace.causal_chain).toHaveLength(1);
    expect(co.trace.causal_chain[0]).toEqual({
      claim_id: 1,
      depends_on: [{ phase_id: 'tech_infrastructure', claim_id: 2 }],
    });
    expect(co.versions.system_version).toBe('v2.3');
  });

  it('drops premise_refs that violate phase order', () => {
    const priorSeo = createControlObjectV1('audit-d', 'seo_digital', 'normal', 'seo_digital');
    priorSeo.trace.claim_sources = [{ claim_id: 1, agent: 3, section: 's', truth_source: 'internal_metrics', truth_sources: ['internal_metrics'] }];

    const result: DomainResult = {
      score: 3,
      label: 'Moderate',
      summary: 'x'.repeat(120),
      strengths: ['a'],
      weaknesses: ['b'],
      issues: [baseIssue({ premise_refs: [{ phase_id: 'seo_digital', claim_id: 1 }] })],
      quick_wins: [],
      recommendations: [{ id: 'r1', title: 't', description: 'd', priority: 'low', estimated_cost: '0', estimated_time: '1w', impact: 'i' }],
      unknown_items: [],
    };

    const verification = verifyForCausal(result);
    const co = fc.buildControlObject(
      verification,
      'tech_infrastructure',
      'audit-d',
      1,
      'normal',
      {},
      {},
      [],
      { seo_digital: priorSeo },
      new Set(),
    );

    expect(co.trace.causal_chain).toEqual([]);
  });

  it('flags upstream_claim_invalidated from invalidatedIssueClaimIds', () => {
    const result: DomainResult = {
      score: 3,
      label: 'Moderate',
      summary: 'x'.repeat(120),
      strengths: ['a'],
      weaknesses: ['b'],
      issues: [baseIssue({ title: 'Only issue' })],
      quick_wins: [],
      recommendations: [{ id: 'r1', title: 't', description: 'd', priority: 'low', estimated_cost: '0', estimated_time: '1w', impact: 'i' }],
      unknown_items: [],
    };

    const verification = verifyForCausal(result);
    const co = fc.buildControlObject(
      verification,
      'seo_digital',
      'audit-e',
      3,
      'normal',
      {},
      {},
      [],
      {},
      new Set([1]),
    );

    expect(co.errors.structural).toContain('upstream_claim_invalidated');
    expect(co.human_attention_required.reasons).toContain('upstream_claim_invalidated');
  });
});
