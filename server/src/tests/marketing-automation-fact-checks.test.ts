import { describe, expect, it } from 'vitest';
import { checkMarketing } from '../services/fact-checker/verify/domain-checks/marketing-check.js';
import { checkAutomation } from '../services/fact-checker/verify/domain-checks/automation-check.js';
import type { AuditIssue, DomainResult, Recommendation } from '../types/audit.js';
import type { FactCorrection } from '../services/fact-checker/types.js';

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

function mkRecommendation(description: string, impact: Recommendation['impact'] = 'high'): Recommendation {
  return {
    id: 'r1',
    title: 't',
    description,
    priority: 'high',
    estimated_cost: '0',
    estimated_time: '1w',
    impact,
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

describe('checkMarketing', () => {
  it('does not flag when score is below marketing.flagMinScore', () => {
    const corrections: FactCorrection[] = [];
    const result = baseDomainResult({
      score: 3,
      issues: [mkIssue('TAM is 5B € with no source')],
    });
    checkMarketing(result, {}, corrections);
    expect(corrections).toHaveLength(0);
  });

  it('flags market size numeric claims without source cues', () => {
    const corrections: FactCorrection[] = [];
    const result = baseDomainResult({
      issues: [mkIssue('TAM is 5B €')],
    });
    checkMarketing(result, {}, corrections);
    expect(corrections.length).toBeGreaterThanOrEqual(1);
    expect(corrections[0].action).toBe('flag');
    expect(corrections[0].field).toBe('score');
  });

  it('skips flagging when a source cue is present', () => {
    const corrections: FactCorrection[] = [];
    const result = baseDomainResult({
      issues: [mkIssue('TAM is 5B € according to our CRM export')],
    });
    checkMarketing(result, {}, corrections);
    expect(corrections).toHaveLength(0);
  });
});

describe('checkAutomation', () => {
  it('does not flag when score is below automation.flagMinScore', () => {
    const corrections: FactCorrection[] = [];
    const result = baseDomainResult({
      score: 3,
      recommendations: [mkRecommendation('Cut 10 hours per week')],
    });
    checkAutomation(result, {}, corrections);
    expect(corrections).toHaveLength(0);
  });

  it('flags time-saving numeric claims without source cues', () => {
    const corrections: FactCorrection[] = [];
    const result = baseDomainResult({
      recommendations: [mkRecommendation('Cut 10 hours per week')],
    });
    checkAutomation(result, {}, corrections);
    expect(corrections.some(c => c.issue.toLowerCase().includes('time'))).toBe(true);
  });

  it('flags aggressive ROI timeline claims within quick-win window', () => {
    const corrections: FactCorrection[] = [];
    const result = baseDomainResult({
      issues: [mkIssue('ROI in 2 months')],
    });
    checkAutomation(result, {}, corrections);
    expect(corrections.length).toBeGreaterThanOrEqual(1);
    expect(corrections.some(c => c.raw_evidence.toLowerCase().includes('roi'))).toBe(true);
  });

  it('skips ROI timeline flag when source cue is present', () => {
    const corrections: FactCorrection[] = [];
    const result = baseDomainResult({
      issues: [mkIssue('ROI in 2 months based on pilot data')],
    });
    checkAutomation(result, {}, corrections);
    expect(corrections.filter(c => c.raw_evidence.toLowerCase().includes('roi'))).toHaveLength(0);
  });
});
