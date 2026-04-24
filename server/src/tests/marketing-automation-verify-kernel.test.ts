import { describe, expect, it } from 'vitest';
import { FactChecker } from '../services/fact-checker.js';
import type { AuditIssue, DomainResult, Recommendation } from '../types/audit.js';

function mkIssue(description: string): AuditIssue {
  return {
    id: 'i1',
    severity: 'medium',
    title: 't',
    description,
    impact: 'm',
    confidence: 'medium',
    evidence_refs: [{ type: 'test', finding: 'fixture' }],
    data_source: 'inferred',
  };
}

function mkRecommendation(description: string): Recommendation {
  return {
    id: 'r1',
    title: 't',
    description,
    priority: 'high',
    estimated_cost: '0',
    estimated_time: '1w',
    impact: 'high',
  };
}

function baseDomainResult(overrides: Partial<DomainResult>): DomainResult {
  return {
    score: 4,
    label: 'Good',
    summary: 'x'.repeat(50),
    strengths: [],
    weaknesses: [],
    issues: [],
    quick_wins: [],
    recommendations: [],
    unknown_items: [],
    ...overrides,
  };
}

describe('FactChecker.verify — marketing_utp via verifyKernel wiring', () => {
  const fc = new FactChecker();

  it('routes marketing numeric overclaims through verify()', () => {
    const result = baseDomainResult({
      issues: [mkIssue('TAM is 5B €')],
    });

    const out = fc.verify(result, 'marketing_utp', {});

    expect(out.corrections.length).toBeGreaterThanOrEqual(1);
    expect(out.corrections[0].action).toBe('flag');
    expect(out.corrections[0].field).toBe('score');
  });

  it('does not apply marketing checks when score is below flag threshold', () => {
    const result = baseDomainResult({
      score: 3,
      issues: [mkIssue('TAM is 5B €')],
    });

    const out = fc.verify(result, 'marketing_utp', {});

    expect(out.corrections.filter(c => c.field === 'score')).toHaveLength(0);
  });
});

describe('FactChecker.verify — automation_processes via verifyKernel wiring', () => {
  const fc = new FactChecker();

  it('routes automation time-saving claims through verify()', () => {
    const result = baseDomainResult({
      recommendations: [mkRecommendation('Cut 10 hours per week')],
    });

    const out = fc.verify(result, 'automation_processes', {});

    expect(out.corrections.some(c => c.field === 'score' && c.action === 'flag')).toBe(true);
  });

  it('does not apply automation checks when score is below flag threshold', () => {
    const result = baseDomainResult({
      score: 3,
      recommendations: [mkRecommendation('Cut 10 hours per week')],
    });

    const out = fc.verify(result, 'automation_processes', {});

    expect(out.corrections.filter(c => c.field === 'score')).toHaveLength(0);
  });
});
