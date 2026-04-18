import { describe, it, expect } from 'vitest';
import { confidenceDistributionFromIssues } from '../lib/confidence-distribution.js';
import type { AuditIssue } from '../types/audit.js';

function issue(confidence: AuditIssue['confidence']): AuditIssue {
  return {
    id: `i-${confidence}`,
    severity: 'low',
    title: 't',
    description: 'd',
    impact: 'i',
    confidence,
    evidence_refs: [{ type: 'page_crawl', url: 'https://example.com', finding: 'f' }],
    data_source: 'inferred',
  };
}

describe('confidenceDistributionFromIssues', () => {
  it('aggregates high, medium, low from issues', () => {
    expect(
      confidenceDistributionFromIssues([
        issue('high'),
        issue('high'),
        issue('medium'),
        issue('low'),
      ]),
    ).toEqual({ high: 2, medium: 1, low: 1 });
  });

  it('returns zeros for empty issues', () => {
    expect(confidenceDistributionFromIssues([])).toEqual({ high: 0, medium: 0, low: 0 });
  });
});
