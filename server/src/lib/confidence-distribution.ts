import type { AuditIssue, ConfidenceDistribution } from '../types/audit.js';

/** Builds issue-level confidence counts for DomainResult.confidence_distribution. */
export function confidenceDistributionFromIssues(issues: AuditIssue[]): ConfidenceDistribution {
  const dist: ConfidenceDistribution = { high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    dist[issue.confidence] += 1;
  }
  return dist;
}
